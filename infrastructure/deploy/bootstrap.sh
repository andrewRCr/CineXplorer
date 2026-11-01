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
    cat > "$scratch/content"
    if [[ -f $path ]] && cmp -s "$scratch/content" "$path" &&
        [[ $(stat -c '%a:%U:%G' "$path") == "$mode:$owner:$group" ]]; then
        unchanged "$path"
        return
    fi
    install -o "$owner" -g "$group" -m "$mode" "$scratch/content" "$path"
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
write_file /home/deploy/.ssh/authorized_keys 600 deploy deploy < /root/.ssh/authorized_keys
printf 'deploy ALL=(ALL) NOPASSWD: ALL\n' > "$scratch/sudoers"
visudo -cf "$scratch/sudoers"
write_file /etc/sudoers.d/deploy 440 < "$scratch/sudoers"
visudo -c
ensure_dir /opt/cinexplorer 755 deploy deploy

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
if swapon --show --noheadings --raw --output NAME | grep -qx /swapfile; then
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
