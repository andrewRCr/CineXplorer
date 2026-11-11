# Workflow: Monitor a Pull Request

**Purpose:** Keep the current Claude or Codex turn observing CI and an authorized hosted review until a result or a
bounded stop. Use after publication, an approved review request or a fix push. Monitoring is read-only; it grants no
permission to request a review, change code, rerun jobs, post replies, resolve threads or merge.

## Bind the Wait

Record these in the active errand's private review file, or for a work unit in a file in its workspace
`adversarial-review/` folder; they stay out of `REVIEW-LOG.md`, which is published when the work unit is archived:

- Repository, PR number/URL and full head SHA, read from GitHub after the approved push
- Caller (publication, hosted request or fix push), chosen review route, and what is awaited: CI and each hosted
  review actually requested; a CI-only wait needs no reviewer
- For each review: provider, request comment ID/URL, creation time and the head at that request
- Start time and absolute deadline, set before the first observation; last successful observation and current outcome

Before starting, read any saved wait for this target/request and retain its original deadline. Name the record's
absolute path in progress and resume summaries so recovery can find it. When resuming, missing request/deadline
evidence is `unavailable` until recovered; it is not a reason to restart a wait or post another request.

Use the same target throughout the wait, including after compaction. A local branch name is not the target. A new
push needs a new CI observation round; a receipt for the previous head is not a review of the new one. Any further
hosted request remains the Owner's decision under [agent-pre-merge-review.md](agent-pre-merge-review.md).

## Bounded Loop

1. **Observe immediately.** Re-read the PR state and head. If merged or closed, report that terminal state and stop.
   If the head differs from the recorded target, stop as `head-changed`; preserve both SHAs for the Owner.
2. **Use one fifteen-minute budget.** Count elapsed wall time, including API reads, retries and sleeps. CI and an
   already-requested review share the loop and deadline. Record a later, separately approved review request as a new
   wait when needed; it does not need another CI run or push.
3. **Back off:** wait 15 seconds after the first pending observation, then 30 seconds, then at most 60 seconds between
   observations. Clip command timeouts and sleeps to the remaining budget. Bound each network command to at most
   30 seconds through the shell tool's timeout or the host's timeout command. A tool's yield interval is not a
   process deadline. On this WSL host, `timeout -k 5s 25s gh ...` bounds the command plus kill grace to 30 seconds;
   shorten both near the deadline. Never leave an unbounded `--watch` or a live watcher after reporting a stop.
4. **Keep reads small.** Fetch a compact status snapshot; fetch full review content when a review event changes or
   completion needs checking. Retain fetched evidence and paginate when collecting the complete finding set.
   Re-read an edited summary by its update time; a comment's unchanged creation time does not mean its body is stale.
5. **Communicate during the wait.** Report meaningful changes and give a short progress update at least once a minute.
   Send an update before a read or sleep would take the last update past a minute. Use yielding tool calls or sleeps
   of at most 60 seconds so new Owner input can steer the work.
6. **Handle read failures explicitly.** Retry transient network/provider errors with the same backoff and deadline.
   Authentication, permission or malformed-evidence problems stop as `unavailable`. Respect a rate-limit retry time
   only when it fits the budget; otherwise report the limit and stop. Never interpret a failed read as an empty list.
7. **Settle from evidence below.** Inspect required CI failures and collect the complete review finding set when the
   provider finishes. Findings need an Owner-approved disposition; monitoring does not apply their fixes.
8. **At the deadline:** save the target, request receipts, last successful read and exactly what is pending; report
   `timeout` and stop. Compaction or a new bounded tool call does not reset this deadline. A longer wait needs explicit
   Owner approval; continuing it reuses the original request and never posts another review trigger.

Continue within the active turn while the selected work is pending and budget remains. A final response ends this
foreground monitoring; do not promise background observation or automatic wakeups after it.

## Observe CI

Use the recorded repository and PR explicitly, with a bounded command timeout:

```bash
gh pr view "$monitor_pr" --repo "$monitor_repo" \
  --json url,state,headRefOid,statusCheckRollup \
  --jq '{url,state,head:.headRefOid,checks:[.statusCheckRollup[]|{name,status,conclusion}]}'
gh pr checks "$monitor_pr" --repo "$monitor_repo" --required --json name,bucket,link
```

The example variables come from the recorded target; do not select a different PR from the shell's current branch.
`gh pr checks` uses exit code 8 for pending checks. Other nonzero results need interpretation of the response, not a
blanket failure or success. No checks yet may mean dispatch is pending. This repository requires a successful
`ci-ok`; an empty required-check list, a skipped gate or an unavailable required-check read never establishes readiness.
Optional checks do not replace that gate. Read failed jobs behind `ci-ok` for diagnosis instead of repeatedly dumping
all logs; [Quality Gate Failure Protocol](../../constitution/DEVELOPMENT-RULES.md#quality-gate-failure-protocol) governs
what happens next.

Recheck `headRefOid` after collecting CI and review evidence and before accepting the combined result. If it changed,
report `head-changed` even when the new head has green checks. Before an approved merge, refresh the evidence and use
`gh pr merge --merge --match-head-commit <accepted-full-sha>`; a mismatch stops the merge instead of following new work.

## Observe Hosted Review

Only the chosen provider's bot/app can supply its completion evidence. Read submitted reviews, PR conversation
comments and inline comments; a provider need not create a GitHub approval review. In particular, a green CI badge,
a reaction, silence, an empty thread list or CodeRabbit's automatic-review skip is not a completed requested review.

Require affirmative completion attributable to the original request and exact target head, followed by a complete
finding collection:

- **Codex:** a completion receipt with its `Reviewed commit` marker matching the target SHA, or an unambiguous
  completed summary identifying that head and completion after the request. A short SHA must match the recorded full
  SHA without ambiguity. An old receipt for an earlier request on the same head is insufficient. A clean summary
  cannot override inline or review-body findings collected for the request.
- **CodeRabbit:** a completed response to the manual request plus a submitted review or completed summary/status
  covering the target head. A bare green provider check or a commented review that is still in progress is
  insufficient. If the provider does not expose a usable head/request association, report `unavailable` and recommend
  a local fresh-context review; the Owner chooses it.

Collect bodies and inline findings after a terminal review observation. These REST reads paginate; use the request
time to interpret which messages belong to the current request, and retain earlier unresolved findings as well:

```bash
gh api --paginate "repos/$monitor_repo/issues/$monitor_pr/comments?per_page=100" \
  --jq '.[]|{id,author:.user.login,created_at,updated_at,body,html_url}'
gh api --paginate "repos/$monitor_repo/pulls/$monitor_pr/reviews?per_page=100" \
  --jq '.[]|{id,author:.user.login,state,commit_id,submitted_at,body,html_url}'
gh api --paginate "repos/$monitor_repo/pulls/$monitor_pr/comments?per_page=100" \
  --jq '.[]|{id,author:.user.login,pull_request_review_id,commit_id,original_commit_id,body,path,html_url}'
```

For pending review observations, emit event metadata instead of repeatedly loading bodies into context:

```bash
gh api --paginate "repos/$monitor_repo/issues/$monitor_pr/comments?per_page=100" \
  --jq '.[]|{id,author:.user.login,created_at,updated_at,html_url}'
gh api --paginate "repos/$monitor_repo/pulls/$monitor_pr/reviews?per_page=100" \
  --jq '.[]|{id,author:.user.login,state,commit_id,submitted_at}'
```

Fetch changed conversation bodies by ID or perform the complete collection when a review finishes. A limited tail,
if used, is only a polling hint: fetch complete paginated evidence before declaring a review clean. Reuse that
collection while its event IDs/update times and target remain unchanged.

Check **all** thread resolution states, including outdated threads. This query paginates thread IDs; the REST read
above supplies complete inline bodies rather than only the first comment in a thread:

```bash
gh api graphql --paginate \
  -f owner="$monitor_owner" -f repo="$monitor_name" -F number="$monitor_pr" \
  -f query='query($owner:String!,$repo:String!,$number:Int!,$endCursor:String) {
    repository(owner:$owner,name:$repo) {
      pullRequest(number:$number) {
        headRefOid
        reviewThreads(first:100,after:$endCursor) {
          nodes { id isResolved isOutdated path comments(first:1) { nodes { databaseId url } } }
          pageInfo { hasNextPage endCursor }
        }
      }
    }
  }'
```

`monitor_owner` and `monitor_name` are the owner and repository parts of `monitor_repo`. Missing/truncated content or
failed pagination makes the review incomplete. Findings in review bodies or conversation comments count even when
GitHub exposes no inline thread for them. Once the requested provider finishes, verify and present the whole set
through [agent-pre-merge-review.md](agent-pre-merge-review.md); do not apply findings one at a time during polling.

## Report and Return

| Outcome | Next action |
| ------- | ----------- |
| CI-only wait complete | Return to the caller: recommend a review route only if undecided; preserve an approved local/skip route or fix-response flow. |
| Requested review complete with findings | Present the complete verified disposition set and reply drafts for approval. |
| Awaited CI/review complete; no open findings or threads | Report the exact head and evidence links; ask for explicit merge approval. |
| Review complete; unresolved threads remain | Report them and return to the findings-response flow; do not resolve automatically. |
| Required CI failed | Diagnose the failed job and follow the quality-gate failure protocol. |
| Head changed | Report the recorded and current SHAs; do not reuse the old readiness result or request another review. |
| Evidence unavailable or provider failed | Explain the failure and recommend the smallest recovery or review route for approval. |
| Deadline exhausted | Report pending items and saved target/deadline; ask whether to extend this same wait. |
| PR merged or closed | Report its state and return to the caller's cleanup or stop. |

After a fix push, a CI-only wait returns to the approved findings-response flow; it does not replace the Owner's
fix-check decision or claim that the original hosted review assessed the repaired head. Never automatically rerun
CI, request a successor review, reply, resolve threads or merge as a consequence of an observation.

CLI details: [required-check status](https://cli.github.com/manual/gh_pr_checks),
[paginated API reads](https://cli.github.com/manual/gh_api),
[submitted review records](https://docs.github.com/en/rest/pulls/reviews#list-reviews-for-a-pull-request).
