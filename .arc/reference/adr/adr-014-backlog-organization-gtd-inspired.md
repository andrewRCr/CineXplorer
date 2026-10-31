# ADR-014: Use GTD-Inspired Backlog Organization with Inbox and Atomic Tasks

## Status

Accepted; Superseded in part by ADR-021 (inbox and weekly review)

## Context

### Current State Problems

The existing backlog structure lacks clear organization and creates several pain points:

**1. Discovery friction**

- Unclear whether ideas have been captured before
- Ambiguity between "defined work units" (ready for implementation) and "general buckets" (exploration)
- Mix of files at different maturity levels without visual distinction
- Example: `notes-user-movie-lists.md` (ready for PRD) looks identical to
  `notes-backend-modernization.md` (exploration bucket)

**2. Structural ambiguity**

- Bucket files (like `notes-feature-backlog.md`, `notes-backend-modernization.md`) mix multiple concerns
- No standardized naming or organization for immature vs mature work
- Frontend/backend splits used inconsistently (artifact of specific modernization context)
- No clear capture mechanism for quick ideas

**3. Work flow confusion**

- Atomic tasks (small one-offs) mixed with complex work units
- No staging area for uncertain captures
- Difficulty answering "what work remains?" without reading multiple files
- No systematic review process

### Design Constraints

**Solo developer workflow:**

- Must support solo GTD-based weekly review practice (10+ years experience)
- Capture frequency: a few times per week (not overwhelming volume)
- Need balance between structure and overhead

**GTD principles to leverage:**

- Inbox for zero-friction capture
- Next Actions for committed atomic tasks
- Projects for multi-step work (task lists)
- Regular processing (weekly review)

**Existing ARC patterns to preserve:**

- Three-way work split: feature / technical / incidental
- Task lists with numbered subtasks and phases
- Archive discipline (completed work moves to archive/)
- Stacked branch workflow (ADR-013)

### Alternatives Considered

**Alternative 1: Single TASK-INBOX.md serving dual purpose**

- Pros: Single file, simple
- Cons: Mixes atomic tasks (completable) with captures (need processing), different cognitive modes

**Alternative 2: Atomic tasks in both backlog and active**

- Pros: Clear staging (queued vs committed)
- Cons: In practice, atomic tasks go straight from backlog to completion (no migration)

**Alternative 3: Section-based vs file-based organization**

- Section-based: Ideas live as sections in bucket files until ready for PRD
- File-based: Every idea gets its own file immediately
- Trade-off: Section-based reduces file clutter, file-based improves discoverability

**Alternative 4: Directory structure approaches**

- Frontend/backend split at top level
- Maturity-based split (immature/ vs defined/)
- Status-based split (inbox/, next/, later/)

### Solution Requirements

Must support:

1. Zero-friction capture (don't lose ideas)
2. Clear work unit definition (what's ready to implement?)
3. Discovery ("have we thought about X?")
4. Weekly review processing
5. Minimal overhead for solo developer
6. Self-documenting structure

## Decision

We will implement a **two-tier GTD-inspired backlog organization** with clear separation between
capture/processing (Tier 1) and defined work units (Tier 2).

### Structure

```
backlog/
  TASK-INBOX.md              # Tier 1: Unsorted captures (flat bullets, lean)
  feature/
    BACKLOG-FEATURE.md       # Tier 1: Feature ideas (sections, plain bullets)
    plan-*.md                # Tier 2: Work units under planning/analysis
    prd-*.md                 # Tier 2: Work units ready for tasks
  technical/
    BACKLOG-TECHNICAL.md     # Tier 1: Technical ideas (sections, plain bullets)
    plan-*.md                # Tier 2: Work units under planning/analysis
    prd-*.md                 # Tier 2: Work units ready for tasks

active/
  ATOMIC-TASKS.md            # GTD "Next Actions" - committed atomic tasks
  CURRENT-SESSION.md         # Session state (existing)
  feature/
  technical/
  incidental/
```

### File Purposes and Formats

**TASK-INBOX.md** (backlog root):

- Zero-friction capture for anything uncertain or time-constrained
- Flat bullet list (no checkboxes, no sections)
- Processed during weekly review → moved to appropriate bucket or completed
- Kept lean (items don't accumulate)

**ATOMIC-TASKS.md** (active root):

- GTD "Next Actions" - committed, atomic tasks ready to execute
- Checkbox format with two sections:
    - "Active" - tasks queued for execution
    - "Completed (This Week)" - marked [x], deleted during weekly review
- No task numbers (not part of formal task lists)
- Completed items provide weekly accomplishment visibility

**BACKLOG-FEATURE.md / BACKLOG-TECHNICAL.md** (bucket files):

- Section-based organization by domain (e.g., "User Authentication", "API Integration")
- Plain bullets (no checkboxes)
- Contains ONLY non-atomic work unit ideas
- When scope defined → graduate to plan-{name}.md or prd-{name}.md file
- Delete graduated items (no strikethrough clutter)

**plan-*.md and prd-*.md** (individual files):

- Scoped work units with defined boundaries
- plan-*.md: Planning/analysis phase, requirements gathering, research (backlog only)
- prd-*.md: Ready for task generation and implementation
- Each gets unique canonical name when scope defined
- plan-*.md deleted once PRD created (planning complete)

### Processing Flow

```
1. Capture
   └─> backlog/TASK-INBOX.md (flat bullet)

2. Weekly Review (process inbox)
   ├─ Atomic & ready now? → active/ATOMIC-TASKS.md
   ├─ Quick action (<5min)? → Do immediately, delete from inbox
   ├─ Feature idea? → BACKLOG-FEATURE.md (section)
   ├─ Technical idea? → BACKLOG-TECHNICAL.md (section)
   └─ Uncertain? → Leave in inbox, decide next week

3. Bucket file review (promote when scope clear)
   ├─ Ready for planning? → Create plan-{name}.md, delete from bucket
   └─ Ready for PRD? → Create prd-{name}.md, delete plan-{name}.md (if exists)

4. Atomic task completion
   ├─ Do work, mark [x] in ATOMIC-TASKS.md
   ├─ Move to "Completed (This Week)" section
   └─ Weekly review: Delete all completed items
```

### Commit Context Footers

**Two patterns for work without numbered task lists:**

**Task list work (existing):**

```
Context: tasks-{name}.md Task X.Y.Z
Context: tasks-{name}.md (Tasks 3.4-3.6)
Context: tasks-{name}.md (planning)
```

**Atomic work (new unified pattern):**

```
Context: maintenance (atomic / no associated task list)
Context: refactor (atomic / no associated task list)
Context: documentation (atomic / no associated task list)
Context: planning (atomic / no associated task list)
```

**Boundary categories:**

- `maintenance` - Fixes, chores, routine upkeep
- `refactor` - Code restructuring, pattern extraction
- `documentation` - Docs updates, ARC framework changes
- `planning` - PRD drafts, strategy docs, exploration

**Rationale:** Atomic tasks aren't archived (items deleted after completion), so referencing `ATOMIC-TASKS.md` provides
no long-term traceability. The commit message IS the record. The unified `(atomic / no associated task list)` pattern
accurately describes all non-task-list work.

### Design Decisions

**1. Frontend/backend split: NOT used**

- Only feature/ and technical/ directories
- Frontend/backend noted in PRD content, not directory structure
- Artifact of modernization exploration, not general pattern

**2. Incidental in backlog: REMOVED**

- Stacked branch workflow (ADR-013) means incidental work stays active until merged
- No need to pause/backlog incidental work anymore
- Remove `backlog/incidental/` directory

**3. Maturity markers: TBD**

- Optional context tags like `[Exploring]`, `[Ready]`, `[Someday/Maybe]` in bucket files
- Evaluate during migration, add if valuable in practice
- Not enforced initially

**4. Discovery mechanism: File structure + bucket files**

- Check TASK-INBOX.md (unsorted)
- Check BACKLOG-FEATURE.md or BACKLOG-TECHNICAL.md (sections)
- Check for plan-*.md or prd-*.md files (scoped work units)
- No separate index (avoid staleness, keep overhead low)

### Weekly Review Workflow

**Scope (sufficient for initial implementation):**

1. Process TASK-INBOX.md (move items to buckets/atomic/action)
2. Review ATOMIC-TASKS.md (delete completed, reprioritize active)
3. Review bucket files (promote to notes/PRD files when scope clear)

Detailed workflow to be documented in `weekly-review.md`.

## Consequences

### Positive

**Discovery and organization:**

- Clear answer to "have we thought about this?" (3 places to check: inbox, buckets, files)
- Visual distinction between immature ideas (in buckets) and defined work units (individual files)
- Self-documenting maturity levels (file existence signals scope definition)

**Workflow clarity:**

- Zero-friction capture (TASK-INBOX.md, no decision required)
- Atomic tasks separated from complex work (different tracking mechanisms)
- Weekly review provides natural processing rhythm
- Bucket files stay focused on non-atomic ideas only

**GTD alignment:**

- Leverages 10+ years of established GTD practice
- Inbox discipline keeps captures lean
- Next Actions (ATOMIC-TASKS.md) ready for execution anytime
- Projects (task lists) remain unchanged

**Reduced overhead:**

- No migration for atomic tasks (straight from capture to completion in many cases)
- Bucket files use simple sections (low friction for adding ideas)
- Individual files only created when scope warrants it
- Weekly review batches processing (not continuous burden)

### Negative

**Additional files to maintain:**

- TASK-INBOX.md requires weekly discipline to stay lean
- ATOMIC-TASKS.md needs completion tracking and cleanup
- Bucket files (BACKLOG-FEATURE.md, BACKLOG-TECHNICAL.md) need organization

**Processing overhead:**

- Weekly review becomes critical (inbox can't accumulate)
- Decision required: atomic vs work unit (usually obvious, but not always)
- Moving items between files during review

**Learning curve:**

- New structure for existing backlog migration
- Need to understand tier distinction (capture vs defined)
- Commit context footer patterns expanded

### Risks

**Inbox accumulation:**

- If weekly review discipline slips, TASK-INBOX.md becomes overwhelming
- Mitigation: Keep visible, use as indicator of review health

**Bucket file bloat:**

- Sections could accumulate if promotion to files doesn't happen
- Mitigation: Weekly review includes bucket file assessment

**Atomic task misclassification:**

- Some work might be too complex for atomic treatment but gets added anyway
- Mitigation: If atomic task grows, convert to incidental task list mid-work

**Commit hook complexity:**

- New `(atomic / no associated task list)` pattern requires hook updates
- Mitigation: Clear documentation, examples in atomic-commit.md

### Follow-up Work

**1. Create ADR and new files:**

- [x] Draft ADR-014 (this document)
- [x] Create `backlog/TASK-INBOX.md` with header/instructions
- [x] Create `active/ATOMIC-TASKS.md` with header/sections
- [x] Create `backlog/feature/BACKLOG-FEATURE.md` template with section examples
- [x] Create `backlog/technical/BACKLOG-TECHNICAL.md` template with section examples
- [x] Create `reference/workflows/supplemental/weekly-review.md` workflow

**2. Update commit infrastructure:**

- [x] Update `.githooks/commit-msg` to accept `(atomic / no associated task list)` pattern
- [x] Update `.githooks/pre-commit` if validation logic needs changes

**3. Update documentation:**

- [x] `strategy-work-organization.md` - Add Section 9: Backlog Organization
- [x] `3_process-task-loop.md` - Add atomic task completion protocol
- [x] `atomic-commit.md` - Document new commit context footer patterns with examples

**4. Migrate existing backlog:**

- [x] Audit current `backlog/feature/` and `backlog/technical/` contents
- [x] Create initial BACKLOG-FEATURE.md with current feature ideas as sections
- [x] Create initial BACKLOG-TECHNICAL.md with current technical ideas as sections
- [x] Identify work units ready for plan-*.md or prd-*.md promotion
- [x] Delete deprecated bucket files (notes-feature-backlog.md, notes-potential-future-modernization.md)
- [x] Remove `backlog/incidental/` directory (no longer used per ADR-013)

**5. Test and refine:**

- [ ] Run first weekly review with new structure
- [ ] Capture pain points and friction
- [ ] Evaluate whether maturity markers `[Exploring]`, `[Ready]` add value in practice
- [ ] Adjust templates/workflows based on real usage

**6. Consider future enhancements (post-migration):**

- Maturity markers in bucket files (if beneficial)
- Additional boundary categories if current set insufficient
- Section templates for common domains in bucket files

## References

- ADR-013: Stacked Branch Workflow (incidental work handling)
- strategy-work-organization.md: Work categorization and git workflow
- strategy-task-list-formatting.md: Task list structure standards
- Getting Things Done (GTD) methodology: Inbox, Next Actions, Projects model
