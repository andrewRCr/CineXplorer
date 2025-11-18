# ADR-013: Adopt Stacked Branch Workflow for Task List Organization

## Status

Accepted (2025-11-10)

## Context

### Current Git Workflow Model

The project has used a single-long-lived-branch model for planned work since inception (2025-10 to present):

- Each feature or technical work item gets one branch (e.g., `technical/service-layer-modernization`)
- Branch lives for weeks or months while work progresses
- All discovered incidental work commits to the same branch (no separate branches created)
- Task lists accumulate in `.arc/active/` directory (not tied to branch lifecycle)

This model worked adequately for early development but has demonstrated scalability issues.

### Problems with Current Model

**1. Branch Name Semantic Mismatch**

The `technical/service-layer-modernization` branch currently contains commits for:

- Service layer work (planned, original intent)
- Filter integration testing (incidental)
- Pagination buffer tracking (incidental)
- Navigation filter state preservation (incidental)
- Buffer deduplication (incidental)
- Test organization standardization (incidental)
- Discover endpoint consolidation (incidental)
- Theme system modernization (incidental)

The branch name no longer describes the actual work—approximately 80-90% of commits are unrelated to service layer
modernization. This creates confusion when reviewing git history or when considering rollback scenarios.

**2. Task List Accumulation**

The `.arc/active/` directory currently contains 8 task lists (1 planned + 7 incidental), all associated with a single
branch. This violates the principle that "active" should mean "currently working on" and makes it unclear what work is
actually in progress.

**3. Dependency Chain Depth**

Work has nested 8 levels deep:

```
technical/service-layer-modernization (planned)
└── filter-integration-testing (incidental, discovered during service layer)
    └── pagination-buffer-tracking (incidental, discovered during filters)
        └── navigation-filter-state (incidental, discovered during pagination)
            └── buffer-deduplication (incidental, discovered during navigation)
                └── test-organization (incidental, discovered during buffer-dedup)
                    └── discover-endpoint (incidental, discovered during test-org)
                        └── theme-system (incidental, discovered during discover)
```

This depth is manageable with careful task list "pointers" (header references), but demonstrates the model doesn't scale.

**4. Merge Scope Bloat**

When `technical/service-layer-modernization` eventually merges to main, the PR will be massive and semantically
incoherent. Reviewing 8 different logical work units in a single PR is impractical and loses the benefits of focused
code review.

**5. No Granular Rollback**

If we discover issues with any individual piece of work (e.g., theme system changes), we cannot cleanly revert that work
without affecting all subsequent work on the branch.

### Industry Practice: Stacked Development

The pattern we've been using (nested discovered work) naturally maps to **stacked development** (also called
stacked diffs/stacked PRs), a well-established workflow used at Meta, Google, and increasingly across the industry.

**Tools supporting this pattern:**

- Graphite (graphite.dev)
- gh-stack (GitHub CLI extension)
- git-town
- Aviator, ReviewStack

**Key insight:** Creating branches off branches is industry-standard and idiomatic in modern development. The early
decision to "avoid branches off branches for simplicity" was overly cautious.

### Alternatives Considered

**Option A: Continue Single-Long-Lived-Branch Model**

- Keep current workflow
- Accept semantic mismatch and accumulation
- Pros: No learning curve, no process change
- Cons: Problems will worsen as project scales, git history remains confusing

**Option B: Adopt Stacked Branch Workflow (CHOSEN)**

- Create separate branch for each task list (if >30min, multiple subtasks)
- Branch off current branch where work was discovered
- Merge depth-first when complete (child → parent → main)
- Archive task list immediately when branch deleted
- Pros: Semantic clarity, natural cleanup, industry-standard, granular review/rollback
- Cons: More branch management overhead, more PRs, rebase complexity

**Option C: Flat Parallel Branches (All Off Main)**

- Each task list branches directly from main (no stacking)
- Merge all to main independently
- Pros: Simple mental model, no parent/child dependencies
- Cons: Doesn't match actual dependency relationships, creates integration conflicts, loses causal history

### Decision Drivers

1. **Scale**: Current model has reached practical limits (8-level nesting proves unsustainable)
2. **Clarity**: Branch names should accurately reflect work contained within
3. **Cleanup**: Natural discipline needed to prevent task list accumulation
4. **Industry alignment**: Stacked development is well-established and supported by tooling
5. **Code quality**: More frequent, narrowly-scoped reviews improve code health
6. **Future-proofing**: Project may eventually onboard collaborators or be open-sourced

## Decision

We will adopt a **stacked branch workflow** where each task list (meeting incidental work criteria) gets its own
git branch, branches are stacked (child branches off parent branches), and branches are merged depth-first with
the task list archived immediately upon branch deletion.

### Specific Changes

**1. Branch Creation Rule**

Create a new git branch when work meets task list criteria:

- ✅ Requires dedicated task list (>30min effort, multiple subtasks)
- ✅ Semantically distinct from current branch's work
- ✅ Desire independent merge/review capability

**Branch Naming:**

```bash
# Planned work (has PRD)
feature/<name>     # User-facing capabilities
technical/<name>   # Infrastructure improvements

# Incidental work (no PRD, discovered during development)
incidental/<name>  # Matches task list name (minus tasks- prefix)
```

**2. Branch Lifecycle**

```
On Child Branch (Before PR):
1. Discover work that needs task list
2. Create branch: git checkout -b incidental/<name>
3. Create task list: .arc/active/incidental/tasks-<name>.md
4. Work on branch, commit with task references
5. Complete work (all tasks done, quality gates pass)
6. Run maintain-task-notes.md Mode 2 (clean task list and notes files)
7. Create completion-{name}.md (executive summary, serves as PR description draft)
8. Commit documentation changes to child branch

Code Review & Merge:
9. Run local code review (coderabbit review local)
10. Create PR against parent branch (use completion doc as PR description template)
11. Address PR review findings (update completion doc if outcomes changed)
12. Merge PR (child → parent)

On Parent Branch (After Merge):
13. Delete merged branch: git branch -d incidental/<name>
14. Archive files: git mv .arc/active/incidental/... to .arc/reference/archive/incidental/{name}/
15. Commit archive changes on parent branch
16. Return to parent branch and continue work
```

**3. Archive Timing**

Task lists are archived **immediately when their corresponding branch is deleted**, which occurs after merge completion.
This creates conceptual coherence:

- Branch exists ↔ Task list in `.arc/active/`
- Branch deleted → Task list archived

**4. Code Review Policy**

Code review is **required at every merge point**, not just merge to main:

- **Method 1 (Lightweight):** Local review only (`coderabbit review local`)
    - Suitable for small scope (<300 lines), low risk, incidental work

- **Method 2 (Thorough):** Two-pass review (local + PR review)
    - Pass 1: Local review before PR creation
    - Pass 2: PR-based review (CodeRabbit reviews PR)
    - Suitable for large scope, user-facing changes, planned work

**5. Merge Strategy**

Merge depth-first (deepest child first):

```
main
└── technical/service-layer
    └── incidental/filter-testing
        └── incidental/pagination-fixes

Merge order:
1. pagination-fixes → filter-testing (merge PR, delete branch, archive task list)
2. filter-testing → service-layer (merge PR, delete branch, archive task list)
3. service-layer → main (merge PR, delete branch, archive task list)
```

**6. Active Directory Rule**

A task list exists in `.arc/active/` **if and only if** its corresponding git branch exists.
This rule prevents accumulation and makes "active" meaningful.

**7. Migration Strategy**

For existing work on `technical/service-layer-modernization`:

- **Option 1 (CHOSEN):** Complete all existing work on current branch, merge to main, archive all task lists,
start fresh with new model
- Target completion: <3 weeks (by 2025-12-01)
- Any NEW incidental work discovered during this period: Create proper branch (practice new model)

### Documentation Updates Required

**1. Rename strategy document:**

- `strategy-work-categorization.md` → `strategy-work-organization.md`
- Reflects expanded scope (now covers git workflow, not just semantic categorization)

**2. Update strategy-work-organization.md:**

- Revise "Git Workflow: No Branches for Incidental" section
- Add "Stacked Branch Workflow" section with examples
- Add merge strategy (depth-first) explanation
- Add archive timing (when branch deleted)
- Add historical note documenting v1.0 vs v2.0 models

**3. Update workflow documents:**

- `manage-incidental-work.md` - Add branch creation section, update workflow examples
- `archive-completed.md` - Update archive timing (after branch deletion, not before PR), unify completion docs
- `maintain-task-notes.md` - Add timing guidance (before PR), remove completion summary from task files
- `agent-pre-merge-review.md` - Add stacked branch review examples
- `3-process-task-loop.md` - Note branch/task list lifecycle coupling
- `atomic-commit.md` - Minor updates (if any)
- `session-handoff.md` - Add "Protected Sections" guidance for transition notes

**4. Update CURRENT-SESSION.md:**

- Add transition period note explaining temporary non-conformance
- Mark with "DO NOT REMOVE UNTIL BRANCH MERGE" warning
- List all 8 active task lists and their completion status
- Document migration strategy and expected completion

**5. Update CodeRabbit configuration:**

- Change from "review PRs to main only" to "review PRs to any branch"
- Update `.coderabbit.yaml` with `base_branches: ['*']`

**6. Create completion record:**

- This ADR documents the decision
- Reference ADR-013 in all updated documentation

## Consequences

### Positive

**Semantic Clarity**

- Branch names always match the work they contain
- `git log incidental/theme-system` shows only theme work
- Easier to understand git history months later

**Natural Cleanup Discipline**

- Branch lifecycle enforces "complete → merge → delete → archive" rhythm
- Prevents task list accumulation in `.arc/active/`
- "Active" directory remains small and meaningful

**Granular Code Review**

- Each logical work unit reviewed independently
- Smaller, focused PRs are easier to review thoroughly
- Can defer review findings to specific work units

**Independent Rollback**

- Can revert individual pieces of work cleanly
- Reduces risk of large, multi-concern merges

**Industry Alignment**

- Stacked development is well-established pattern
- Standard tools and practices available (gh-stack, Graphite, etc.)
- Easier to onboard collaborators familiar with this model

**Better Git History**

- Causality preserved (child branch shows what triggered it)
- Can filter commits by branch: `git log --oneline incidental/pagination-fixes`
- Clear separation of concerns in commit history

**Future-Proofing**

- Workflow scales better as project grows
- Compatible with team collaboration if project expands
- Aligns with open-source project norms

### Negative

**Increased Branch Management Overhead**

- More branches to track (though most are short-lived)
- Must remember parent/child relationships
- Need to track where in stack you are

**More Merge Operations**

- More potential for merge conflicts
- Must merge in correct order (depth-first)
- More opportunities for things to go wrong

**Rebase Complexity**

- If parent branch updates while working on child, must rebase or merge
- Can be confusing for developers new to stacked workflows
- Requires understanding of rebase mechanics

**More Pull Requests**

- More PRs to create and manage
- More PR review cycles to complete
- Could feel like "more process" vs velocity

**Learning Curve**

- New mental model to internalize
- Need to learn when to branch vs stay on current branch
- Practice needed to feel natural

**Transition Period**

- Current branch (`technical/service-layer-modernization`) doesn't follow new model
- Temporary documentation inconsistency during migration
- Need to maintain "transition period" notes in CURRENT-SESSION.md

### Risks

**Branch Dependency Tracking**

- Risk: Forget which branch is parent when creating child
- Mitigation: Use clear naming conventions, document in task list headers
- Mitigation: Use `git log --graph --oneline --all` to visualize

**Merge Order Mistakes**

- Risk: Merge out of order (parent before child)
- Mitigation: Archive immediately when branch deleted (forces discipline)
- Mitigation: Document merge order in task list completion notes

**Accumulation Despite Rules**

- Risk: Branches accumulate if not deleted after merge
- Mitigation: Rule "task list in active/ ↔ branch exists" provides audit check
- Mitigation: Can run `git branch` vs `ls .arc/active/*/tasks-*.md` to validate

**Inconsistent Application**

- Risk: Sometimes branch, sometimes don't, creating hybrid mess
- Mitigation: Clear criteria (>30min, multiple subtasks, semantically distinct)
- Mitigation: Document in strategy-work-organization.md as authoritative source

**Tooling Complexity**

- Risk: Might adopt tools (gh-stack, Graphite) that add complexity
- Mitigation: Start with plain git, only add tools if needed
- Mitigation: Avoid SaaS dependencies (Graphite) for solo project

### Follow-Up Work

1. **Complete ADR-013** (this document) ✅
2. **Rename strategy document** (work-categorization → work-organization) ✅
3. **Update 6 workflow documents** (as listed above) ✅ (partially - completion docs unified 2025-11-17)
4. **Update CURRENT-SESSION.md** (add transition note with protection) ✅
5. **Update CodeRabbit config** (review any branch, not just main) ✅
6. **Complete current branch** (service-layer-modernization, <3 weeks)
7. **Remove transition note** (when service-layer branch merges to main)
8. **First clean implementation** (next planned work uses stacked model from start)

**Follow-up (2025-11-17): Completion Metadata Unification**

- Unified completion metadata strategy - ALL work gets `completion-{name}.md` (not just planned)
- Updated `archive-completed.md` to show child/parent branch phases
- Updated `maintain-task-notes.md` to remove completion summary from task files
- Updated this ADR's branch lifecycle to include maintain-task-notes and completion doc steps
- Rationale: Stacked branch workflow means all work gets branches/PRs → should have consistent documentation

---

**Date**: 2025-11-10
**Supersedes**: None (new workflow, not replacing existing ADR)
**Referenced By**: strategy-work-organization.md (v2.0), manage-incidental-work.md, archive-completed.md
