#!/usr/bin/env bash
# Prepare a fresh Ubuntu 24.04 server. Run as root, or with sudo as deploy.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export LC_ALL=C

fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
changed() { printf 'CHANGED: %s\n' "$*"; }
unchanged() { printf 'UNCHANGED: %s\n' "$*"; }

[[ $EUID -eq 0 ]] || fail 'Run this script with sudo or as root.'
# shellcheck source=/dev/null
. /etc/os-release
[[ $ID == ubuntu && $VERSION_ID == 24.04 ]] || fail 'Expected Ubuntu 24.04 LTS.'
[[ -s /root/.ssh/authorized_keys ]] || fail 'Install your SSH public key for root before bootstrap.'

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

# Read desired contents from stdin; preserve timestamps when contents and metadata match.
write_file() {
    local path=$1 mode=$2 owner=${3:-root} group=${4:-root}
    last_file_changed=false
    cat > "$scratch/content"
    if [[ -f $path ]] && cmp -s "$scratch/content" "$path" &&
        [[ $(stat -c '%a:%U:%G' "$path") == "$mode:$owner:$group" ]]; then
        unchanged "$path"
        return
    fi
    install -o "$owner" -g "$group" -m "$mode" "$scratch/content" "$path"
    last_file_changed=true
    changed "$path"
}

ensure_dir() {
    local path=$1 mode=$2 owner=${3:-root} group=${4:-root}
    if [[ -d $path && $(stat -c '%a:%U:%G' "$path") == "$mode:$owner:$group" ]]; then
        unchanged "$path"
    else
        install -d -o "$owner" -g "$group" -m "$mode" "$path"
        changed "$path"
    fi
}

install_packages() {
    local package
    local missing=()
    for package in "$@"; do
        if [[ $(dpkg-query -W -f='${Status}' "$package" 2>/dev/null || true) != 'install ok installed' ]]; then
            missing+=("$package")
        fi
    done
    if ((${#missing[@]})); then
        apt-get update
        DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing[@]}"
        changed "installed ${missing[*]}"
    else
        unchanged "packages: $*"
    fi
}

ensure_service() {
    local unit=$1
    if systemctl is-enabled --quiet "$unit"; then
        unchanged "$unit enabled"
    else
        systemctl enable "$unit"
        changed "$unit enabled"
    fi
    if systemctl is-active --quiet "$unit"; then
        unchanged "$unit active"
    else
        systemctl start "$unit"
        changed "$unit started"
    fi
}

install_packages ca-certificates curl sudo openssh-server ufw unattended-upgrades git
ensure_dir /etc/apt/keyrings 755
if [[ -s /etc/apt/keyrings/docker.asc ]]; then
    unchanged 'Docker apt signing key'
else
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o "$scratch/docker.asc"
    install -m 644 "$scratch/docker.asc" /etc/apt/keyrings/docker.asc
    changed 'Docker apt signing key'
fi
write_file /etc/apt/sources.list.d/docker.list 644 <<APT
# Docker Engine packages for this Ubuntu release.
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $VERSION_CODENAME stable
APT
install_packages docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
ensure_service docker.service

if id deploy >/dev/null 2>&1; then
    [[ $(getent passwd deploy | cut -d: -f6) == /home/deploy ]] || fail 'Expected deploy home /home/deploy.'
    unchanged 'deploy user'
else
    useradd --create-home --shell /bin/bash deploy
    changed 'deploy user'
fi
if id -nG deploy | tr ' ' '\n' | grep -qx docker; then
    unchanged 'deploy docker membership'
else
    usermod -aG docker deploy
    changed 'deploy docker membership'
fi
ensure_dir /home/deploy/.ssh 700 deploy deploy
cat /root/.ssh/authorized_keys > "$scratch/authorized_keys"
if [[ -f /opt/cinexplorer/ci-deploy.pub ]]; then
    printf '\nrestrict,command="/usr/local/bin/cinexplorer-deploy --from-ci" %s\n' \
        "$(cat /opt/cinexplorer/ci-deploy.pub)" >> "$scratch/authorized_keys"
fi
write_file /home/deploy/.ssh/authorized_keys 600 deploy deploy < "$scratch/authorized_keys"
printf 'deploy ALL=(ALL) NOPASSWD: ALL\n' > "$scratch/sudoers"
visudo -cf "$scratch/sudoers"
write_file /etc/sudoers.d/deploy 440 < "$scratch/sudoers"
visudo -c
ensure_dir /opt/cinexplorer 755 deploy deploy
ensure_dir /opt/cinexplorer/deploy-logs 700 deploy deploy
ensure_dir /opt/cinexplorer/backups 700 deploy deploy
ensure_dir /opt/cinexplorer/operations 700 deploy deploy
write_file /usr/local/bin/cinexplorer-deploy 755 <<'DEPLOY_ENTRY'
#!/usr/bin/env bash
# Restricted CI entry point and trusted manual deployment interface.
set -euo pipefail
umask 077
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

if [[ $# -eq 1 && $1 == --from-ci ]]; then
    target=${SSH_ORIGINAL_COMMAND:-}
    source=ci
elif [[ $# -eq 1 ]]; then
    target=$1
    source=manual
else
    fail 'Usage: cinexplorer-deploy <full-commit-sha> or --from-ci'
fi
[[ $target =~ ^[0-9a-f]{40}$ ]] || fail 'Expected exactly 40 lowercase hexadecimal commit characters.'

scratch=$(mktemp -d /tmp/cinexplorer-deploy.XXXXXX)
worker=$scratch/worker.sh
cat > "$worker" <<'WORKER'
#!/usr/bin/env bash
set -euo pipefail
trap '' HUP PIPE
umask 077
target=$1
source=$2
status_file=$3
scratch=$4
operation_files=()
fail() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }
finish() {
    result=$?
    trap - EXIT
    set +e
    if ((result == 0)); then
        printf 'Deploy succeeded (exit 0).\n'
    else
        printf 'Deploy failed (exit %s).\n' "$result"
    fi
    rm -f -- "${operation_files[@]}"
    rm -rf "$scratch"
    if [[ -n $status_file ]]; then
        printf '%s\n' "$result" > "$status_file.tmp"
        mv "$status_file.tmp" "$status_file"
    fi
    exit "$result"
}
trap finish EXIT

check_ci_version() {
    git merge-base --is-ancestor "$target" origin/main ||
        fail 'CI target must be reachable from origin/main.'
    if [[ -s /opt/cinexplorer/deploy-history.log ]]; then
        read -r _ _ _ _ deployed _ < <(tail -n 1 /opt/cinexplorer/deploy-history.log)
        [[ $deployed =~ ^[0-9a-f]{40}$ ]] || fail 'Invalid deployed version in history.'
        if [[ $target != "$deployed" ]]; then
            if git merge-base --is-ancestor "$target" "$deployed"; then
                fail "Refusing an older CI target; deployed version is $deployed."
            else
                comparison=$?
                [[ $comparison -eq 1 ]] || fail 'Unable to compare deployed version.'
            fi
        fi
    fi
}

cd /opt/cinexplorer/repo
git fetch origin
git cat-file -e "$target^{commit}" || fail 'Target commit does not exist.'
if [[ $source == ci ]]; then check_ci_version; fi

if [[ $source == ci || ${CINEXPLORER_OPS_LOCK:-} != held ]]; then
    exec 9> /opt/cinexplorer/ops.lock
    flock -w 1800 9 || fail 'Timed out waiting for the operations lock.'
fi
# A manual deploy may have advanced history while this CI deploy waited.
if [[ $source == ci ]]; then check_ci_version; fi
if ! git show "$target:infrastructure/deploy/deploy.sh" > "$scratch/target.sh"; then
    fail 'Target has no deploy script; use the manual deploy steps in infrastructure/deploy/README.md.'
fi
# The checkout can later select a release without these source files. Install only
# through this entry point, while the operations lock excludes jobs and deploys.
operations=/opt/cinexplorer/operations
sources=0
for job in backup maintenance; do
    if git cat-file -e "$target:infrastructure/deploy/$job.sh" 2>/dev/null; then
        git show "$target:infrastructure/deploy/$job.sh" > "$scratch/$job.sh"
        sources=$((sources + 1))
    fi
done
if ((sources == 2)); then
    # Validate the complete source pair before preparing or replacing either file.
    bash -n "$scratch/backup.sh"
    bash -n "$scratch/maintenance.sh"
    for job in backup maintenance; do
        staged=$(mktemp "$operations/.$job.sh.XXXXXX")
        operation_files+=("$staged")
        install -m 700 "$scratch/$job.sh" "$staged"
    done
    # Each rename publishes a complete file. A failed second rename stops deployment;
    # a retry reconciles both files before any target code runs.
    mv -fT "${operation_files[0]}" "$operations/backup.sh"
    mv -fT "${operation_files[1]}" "$operations/maintenance.sh"
elif ((sources == 0)); then
    for job in backup maintenance; do
        [[ -f $operations/$job.sh && -x $operations/$job.sh ]] ||
            fail 'No complete installed operations pair; deploy a version supplying both job sources first.'
    done
else
    fail 'Target supplies only one operations job; both sources are required.'
fi
bash "$scratch/target.sh" "$target" "$source"
WORKER

if [[ $source == manual ]]; then
    exec bash "$worker" "$target" manual '' "$scratch"
fi

log=$(mktemp "/opt/cinexplorer/deploy-logs/$(date -u +%Y%m%dT%H%M%SZ)-${target:0:7}.XXXXXX")
status_file=$log.status
# Only the detached worker owns its scratch files and the whole-run lock.
trap '' HUP PIPE
setsid --fork --wait bash "$worker" "$target" ci "$status_file" "$scratch" \
    < /dev/null > "$log" 2>&1 &
runner=$!
exec 8< "$log"
pending=''
forward_markers() {
    local line=''
    while IFS= read -r line <&8; do
        line=$pending$line
        pending=''
        case "$line" in
            '==> 1 Check checkout and record previous version'|\
            '==> 2 Select target version'|\
            '==> 3 Pull images and migrate'|\
            '==> 4 Configure Site'|\
            '==> 5 Start services and check health'|\
            '==> 6 Record successful deployment') printf '%s\n' "$line" ;;
        esac
    done
    pending+=$line
}
while [[ ! -f $status_file ]]; do
    forward_markers
    if ! kill -0 "$runner" 2>/dev/null; then
        wait "$runner" || true
        [[ -f $status_file ]] || fail "Deploy worker did not report an outcome. Log: $log"
    fi
    sleep 0.1
done
forward_markers
read -r status < "$status_file"
[[ $status =~ ^[0-9]+$ && $status -le 255 ]] || fail "Invalid deploy outcome. Log: $log"
wait "$runner" || true
if ((status == 0)); then
    printf 'Deploy succeeded (exit 0). Log: %s\n' "$log"
else
    printf 'Deploy failed (exit %s). Log: %s\n' "$status" "$log"
fi
exit "$status"
DEPLOY_ENTRY

units_changed=false
write_file /etc/systemd/system/cinexplorer-backup.service 644 <<'NIGHTLY_BACKUP_SERVICE'
[Unit]
Description=CineXplorer nightly backup
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=deploy
Group=deploy
UMask=0077
EnvironmentFile=/opt/cinexplorer/ops.env
TimeoutStartSec=infinity
ExecStart=/usr/bin/flock -w 1800 /opt/cinexplorer/ops.lock /usr/bin/bash /opt/cinexplorer/operations/backup.sh
NIGHTLY_BACKUP_SERVICE
if $last_file_changed; then units_changed=true; fi
write_file /etc/systemd/system/cinexplorer-backup.timer 644 <<'NIGHTLY_BACKUP_TIMER'
[Unit]
Description=Schedule CineXplorer nightly backup

[Timer]
OnCalendar=*-*-* 10:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
NIGHTLY_BACKUP_TIMER
if $last_file_changed; then units_changed=true; fi
write_file /etc/systemd/system/cinexplorer-maintenance.service 644 <<'NIGHTLY_MAINTENANCE_SERVICE'
[Unit]
Description=CineXplorer nightly maintenance
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=deploy
Group=deploy
UMask=0077
EnvironmentFile=/opt/cinexplorer/ops.env
TimeoutStartSec=infinity
ExecStart=/usr/bin/flock -w 1800 /opt/cinexplorer/ops.lock /usr/bin/bash /opt/cinexplorer/operations/maintenance.sh
NIGHTLY_MAINTENANCE_SERVICE
if $last_file_changed; then units_changed=true; fi
write_file /etc/systemd/system/cinexplorer-maintenance.timer 644 <<'NIGHTLY_MAINTENANCE_TIMER'
[Unit]
Description=Schedule CineXplorer nightly maintenance

[Timer]
OnCalendar=*-*-* 10:30:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
NIGHTLY_MAINTENANCE_TIMER
if $last_file_changed; then units_changed=true; fi
if $units_changed; then
    systemctl daemon-reload
    changed 'nightly systemd units reloaded'
else
    unchanged 'nightly systemd units'
fi
ensure_service cinexplorer-backup.timer
ensure_service cinexplorer-maintenance.timer

if [[ $(timedatectl show --property=Timezone --value) == UTC ]]; then
    unchanged 'UTC timezone'
else
    timedatectl set-timezone UTC
    changed 'UTC timezone'
fi
write_file /etc/apt/apt.conf.d/20auto-upgrades 644 <<'APT'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT
write_file /etc/apt/apt.conf.d/99-cinexplorer-unattended 644 <<'APT'
# Limit automatic installation to Ubuntu security updates.
#clear Unattended-Upgrade::Allowed-Origins;
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "09:00";
APT
ensure_service apt-daily.timer
ensure_service apt-daily-upgrade.timer

if [[ -e /swapfile ]]; then
    [[ -f /swapfile && $(stat -c %s /swapfile) == 2147483648 ]] || fail '/swapfile exists but is not a 2 GiB file.'
    [[ $(blkid -s TYPE -o value /swapfile) == swap ]] || fail '/swapfile has no swap signature; refusing to overwrite it.'
    unchanged '2 GiB swap file'
else
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    changed '2 GiB swap file'
fi
if [[ $(stat -c '%a:%U:%G' /swapfile) == 600:root:root ]]; then
    unchanged 'swap file permissions'
else
    chown root:root /swapfile
    chmod 600 /swapfile
    changed 'swap file permissions'
fi
if grep -Eq '^/swapfile[[:space:]]' /etc/fstab; then
    grep -Eq '^/swapfile[[:space:]]+none[[:space:]]+swap[[:space:]]+sw[[:space:]]+0[[:space:]]+0[[:space:]]*$' /etc/fstab ||
        fail 'Unexpected /swapfile entry in /etc/fstab.'
    unchanged 'swap fstab entry'
else
    printf '/swapfile none swap sw 0 0\n' >> /etc/fstab
    changed 'swap fstab entry'
fi
if swapon --show=NAME --noheadings --raw | grep -qx /swapfile; then
    unchanged 'swap active'
else
    swapon /swapfile
    changed 'swap active'
fi

# Ubuntu includes these files first and uses the first value for each SSH keyword.
ssh_file=/etc/ssh/sshd_config.d/00-cinexplorer.conf
ensure_dir /etc/ssh/sshd_config.d 755
cat > "$scratch/ssh-desired" <<'SSH'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
PubkeyAuthentication yes
SSH
ssh_changed=false
if [[ ! -f $ssh_file ]] || ! cmp -s "$scratch/ssh-desired" "$ssh_file"; then
    ssh_changed=true
fi
if [[ -f $ssh_file ]]; then cp -p "$ssh_file" "$scratch/ssh-previous"; fi
write_file "$ssh_file" 644 < "$scratch/ssh-desired"
if ! sshd -t || ! sshd -T > "$scratch/ssh-effective" ||
    ! grep -qx 'passwordauthentication no' "$scratch/ssh-effective" ||
    ! grep -qx 'kbdinteractiveauthentication no' "$scratch/ssh-effective" ||
    ! grep -qx 'permitrootlogin no' "$scratch/ssh-effective" ||
    ! grep -qx 'pubkeyauthentication yes' "$scratch/ssh-effective"; then
    if [[ -f $scratch/ssh-previous ]]; then
        cp -p "$scratch/ssh-previous" "$ssh_file"
    else
        rm -f "$ssh_file"
    fi
    fail 'SSH validation failed; restored previous drop-in without reloading.'
fi
if $ssh_changed; then
    systemctl reload ssh
    changed 'SSH service reloaded; root password unchanged for provider console'
else
    unchanged 'SSH configuration; root password unchanged for provider console'
fi

# Refuse to silently preserve extra firewall rules on a previously customized host.
# No reset: existing SSH connections must remain usable while configuring access.
ufw show added > "$scratch/ufw-added"
if grep '^ufw ' "$scratch/ufw-added" | grep -Ev '^ufw allow (22/tcp|80/tcp|443/tcp|443/udp)$'; then
    fail 'Unexpected UFW rules; use a fresh server or reconcile them before retrying.'
fi
for policy in incoming outgoing; do
    if [[ $policy == incoming ]]; then value=DROP; action=deny; else value=ACCEPT; action=allow; fi
    key=DEFAULT_INPUT_POLICY
    if [[ $policy == outgoing ]]; then key=DEFAULT_OUTPUT_POLICY; fi
    if grep -qx "$key=\"$value\"" /etc/default/ufw; then
        unchanged "UFW default $policy $action"
    else
        ufw default "$action" "$policy"
        changed "UFW default $policy $action"
    fi
done
for port in 22/tcp 80/tcp 443/tcp 443/udp; do
    if grep -qx "ufw allow $port" "$scratch/ufw-added"; then
        unchanged "UFW allow $port"
    else
        ufw allow "$port"
        changed "UFW allow $port"
    fi
done
if ufw status | grep -qx 'Status: active'; then
    unchanged 'UFW enabled'
else
    ufw --force enable
    changed 'UFW enabled'
fi
printf 'Bootstrap complete. Keep this session open until a second SSH session works as deploy.\n'
