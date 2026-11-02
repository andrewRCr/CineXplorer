# Workflow: Review Findings and PR Response

How to handle review findings: from a review of a pull request (hosted, through `@codex review` or
`@coderabbitai review`, or a local fresh-context pass), and the triage legs any local review pass shares ([1_create-prd.md](../1_create-prd.md),
[2_generate-tasks.md](../2_generate-tasks.md), [archive-completed.md](archive-completed.md) § 1 and § 5).

Code review before the PR is [archive-completed.md § 5](archive-completed.md); this workflow starts once findings
exist. Apply [review-model](../../methods/review-model.md) for passes, fix checks and convergence.

## Triage

Process the complete finding set, never one comment at a time.

### 1. Verify every finding against source

Treat every finding as plausible until checked, whoever raised it and whatever label the tool gave it. Read the code
or document it names and decide whether the claim holds, with the evidence. An invalid or misunderstood finding still
gets an explicit `reject` with its reason.

For each valid finding, search the reviewed change for other instances of the same defect: the same missing check,
wrong assumption or misused interface elsewhere. A reviewer reports the instance it saw; the rest would otherwise
surface one per pass. Name every instance in the recommendation, so the fix covers the defect rather than one site.
An instance outside the reviewed change is not this round's fix: name it and route it as discovered work. Then look
across the set for findings that share one cause ([review-model § Shared causes](../../methods/review-model.md)).

### 2. Grade and dispose

Grade each verified finding by materiality, independently of the tool's label:

- `critical`: a correctness, safety, authority or contract failure that on its own prevents completion
- `major`: a substantive correctness, coherence, compatibility or verification gap that must settle before merge
  unless a deferral is approved
- `minor`: a low-materiality defect or improvement

Then propose a disposition:

- `fix`: correct it in this round's fix batch
- `defer`: leave the code unchanged and name where the work goes (a task in a planned task list, or an incidental
  task list), with the reason
- `reject`: leave it unchanged because the finding is wrong, conflicts with project rules, or is outside this change

A fix that would change the PRD's design goes through
[1_create-prd.md § Amending a PRD](../1_create-prd.md#amending-a-prd), proposed inside the set.

### 3. Present the complete set, then edit

Present every finding, valid or not, as one [disposition-report](../../methods/disposition-report.md): a header, the
decision table, then a short section per finding (the issue, the recommendation, how it was verified, and for a
hosted finding the draft reply). Show it as text, not a file path: replies post under the Owner's account, so the
Owner approves their words along with the dispositions. Edit nothing until the Owner approves the complete set; a
changed finding or disposition needs a fresh approval, and no fix is applied early.

End with one approval question naming what approval releases, for example
`Approve: 3 fixes → commit → push → reply to and resolve 5 threads?`.

## Fix Batch

- Land every approved `fix` as one batch: one commit, or the fewest commits that keep separate concerns separate.
  The commit body lists each finding and its fate; follow [atomic-commit.md](atomic-commit.md)
- Run the checks the changed files call for, then push
- After the approved push, enter [monitor-pull-request.md](monitor-pull-request.md) for CI on the new exact head in
  this same turn. Return to this response flow when it settles. This CI-only wait does not request a new hosted
  review or treat the earlier receipt as a review of the repaired head
- Offer a fix check: a fresh local subagent, scoped to the approved repairs, checks whether they hold
  ([review-model § Passes and fix checks](../../methods/review-model.md)). Fix checks always run locally, since a
  hosted review can't be scoped to the repairs. Recommend one when the fixes were material; the Owner decides. A
  further complete pass, local or hosted, is a separate decision, also the Owner's
- If review changed what was delivered, update the completion doc

## Replies and Resolution

The repository requires every review thread resolved before merge, and replies post under the Owner's account. Write
them as the Owner, in first person or neutrally, per
[pull-request-format § Other text posted under the account](../../methods/pull-request-format.md): no process terms
(pass, fix check, disposition, task IDs), and a deferral or rejection gives its reason in the project's own terms.

Post the approved drafts after the fix batch is pushed, and after any fix check the Owner chose has settled, so a
reply never claims a fix the check overturns:

- **Fixed:** reply with what changed and the commit, then resolve
- **Deferred:** reply with the reason and where the work went, then resolve
- **Rejected:** reply with the reason, then resolve

Reply to an inline comment and resolve its thread from the CLI:

```bash
# Reply to a review comment
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{comment-id}/replies -f body='...'

# List threads with their IDs, then resolve one
gh api graphql -f query='query { repository(owner: "{owner}", name: "{repo}") { pullRequest(number: {pr}) {
  reviewThreads(first: 100) { nodes { id isResolved comments(first: 1) { nodes { databaseId path } } } } } } }'
gh api graphql -f query='mutation { resolveReviewThread(input: { threadId: "{thread-id}" }) { thread { isResolved } } }'
```

Findings posted in a review body rather than as threads (CodeRabbit's nitpicks, for example) need no resolution; a
reply in the PR conversation covers any that were deferred or rejected. Write a reply body as continuous lines;
GitHub wraps them.

## Anti-Patterns

- Fixing findings one at a time as they are read, or before the set is approved
- Applying a fix without a reply because the tool called it minor
- Taking the tool's severity or label as the verdict instead of checking source
- Leaving a deferred or rejected thread open
- Fixing one instance of a defect and leaving its siblings for the next pass
