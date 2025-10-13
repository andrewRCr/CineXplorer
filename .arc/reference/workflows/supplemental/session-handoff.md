# AI Session Handoff

Protocols for context management, session handoffs, and workflow state recovery.

## Session Handoff Protocol

### ⚠️ CRITICAL: Working Directory Context Check

**BEFORE updating CURRENT-SESSION.md, always check if working directory context has changed:**

```bash
# Check current working directory
pwd
```

**If you are switching work contexts** (backend/ ↔ frontend/ ↔ root), you **MUST** update the "Session Startup Protocol" section in CURRENT-SESSION.md:

- ✅ **Update step 1** (pwd expected output)
- ✅ **Update step 3** (venv path: `../` vs. `./`)
- ✅ **Update step 4** (path context table with correct relative paths)
- ✅ **Update step 5** (acknowledgment statement with correct paths)

**Examples of when to update:**

- Switching from backend work to frontend work → Update to show `frontend/` context
- Moving from subdirectory to repo root → Update to remove `../` prefixes
- Starting new feature in different part of codebase → Update working directory

**This is NOT optional** - stale path information causes immediate command failures and session friction.

---

### Pre-Update Verification

**Before updating CURRENT-SESSION.md, verify actual state:**

1. **Git status:** `git status` (clean vs uncommitted changes)
2. **Recent commits:** `git log --oneline -10` (capture committed work)
3. **Task completion:** Read task list file for marked checkboxes
4. **File references:** Verify "uncommitted files" are actually uncommitted
5. **Stale references:** Clear old file lists from previous sessions

### Stable vs. Dynamic Sections in CURRENT-SESSION.md

**Stable (rarely change)**:

- Session Startup Protocol **structure** (the checklist itself)
- Docker container expectations (4 containers)
- Reference version checks (DEVELOPMENT-RULES, QUICK-REFERENCE)

**Dynamic (update when context changes - see CRITICAL warning above)**:

- **"Session Startup Protocol" working directory paths** - update EVERY TIME you switch between:
  - backend/ work
  - frontend/ work
  - repo root work
- Step 1: Expected pwd output
- Step 3: Venv path (with or without `../`)
- Step 4: Path context table (all relative paths)
- Step 5: Acknowledgment statement

**Temporal (update every handoff)**:

- "Session Information" section and below (work status, tasks, commits, etc.)

### Comprehensive Handoff Format

Update CURRENT-SESSION.md before ending session:

1. **First**: Check if working directory context changed (see CRITICAL warning above) and update Session Startup Protocol paths if needed
2. **Then**: Update "Session Information" section and below with work progress:

```markdown path=null start=null
## Session Information
**Branch:** [current branch name]
**Feature Documents:**
  - PRD: [path to Sub-PRD]
  - Tasks: [path to task list]
  - Notes: [path to notes file if applicable]
**Work Type:** [structured | incidental: brief description]
**Last Completed:** [specific task reference]
**Next Action:** [what should happen next]

## Session Context & Status
**Blockers:** [none | describe blockers or pending decisions]
**Key Decisions:** [decisions affecting ongoing tasks]
**Outstanding Questions:** [anything awaiting user clarification]
**Notes for Next Session:** [context that would be lost otherwise]
```

### Task List Completion Format

**When work is complete and task list archived:**

```markdown path=null start=null
## Session Information
**Last Completed:** [Task list name] (Tasks X-Y, archived)
**Next Action:** Begin [new-task-list.md] starting with Task 1

### [Task List Name] - COMPLETE & ARCHIVED ✅
**Status:** All tasks complete, archived to [path]
**Completion Date:** [date]
**What Was Accomplished:**
- [Major accomplishments]

**All Changes Committed:**
- [commit hash] - [commit message]

**Git Status:** Clean working tree, all changes committed (replace with list of uncommitted files + reasons if dirty)
```

**Key principle:** Document actual state as verified by git, not assumptions.

### Post-Update Cleanup

**After updating CURRENT-SESSION.md:**

1. **Run markdown linting:** `npx markdownlint-cli2 --fix ".arc/active/CURRENT-SESSION.md"`
2. **Verify readable** - File is gitignored but should stay clean

### Starting New Session from Handoff

1. User says: "Resume from CURRENT-SESSION.md"
2. AI executes "Session Startup Protocol" (environment checks)
3. AI reads document and confirms understanding
4. AI verifies git state matches documented state
5. AI asks: "Confirmed. Continue with [next action]?"
6. Only proceed after explicit user approval

## Context Recovery

### Detecting Stale Session State

**Warning signs CURRENT-SESSION.md is out of date:**
- Documents uncommitted files, but `git status` shows clean working tree
- References "Next Action: Task X" but task is marked `[x]` complete
- Describes work as "in progress" but commits show completion
- Contains mixed state with unclear current status
- Git commit hashes don't match recent `git log` output

**When stale state detected:**
1. **Stop immediately** - don't trust documented state
2. **Gather ground truth:** `git status`, `git log --oneline -10`, read task list
3. **Reconstruct accurate state** from git history and task files
4. **Update CURRENT-SESSION.md** using verification protocol
5. **Run mdlint:** `npx markdownlint-cli2 --fix ".arc/active/CURRENT-SESSION.md"`

### If Context Seems Lost

1. **Stop immediately** - don't continue current action
2. **Acknowledge:** "I may have lost context"
3. **Re-read:** DEVELOPMENT-RULES.md and current task list
4. **Ask user:** Confirm current state and expectations
5. **Resume only after** explicit user approval

### Recovery Warning Signs

- Forgetting incremental quality checks
- Bundling multiple sub-tasks together
- Initiating commits without approval
- Skipping task documentation updates

## User Instructions

### Session Handoffs

**Approaching context limits:**
1. Ask AI to update CURRENT-SESSION.md with current state
2. Review and save the updated file
3. Start new conversation with: "Resume from CURRENT-SESSION.md"

**Between work sessions:**
1. Clear CURRENT-SESSION.md or let AI fill fresh template
2. For high-level tracking, check PROJECT-STATUS.md
3. For objective state, rely on git status and branch

**Emergency compact handoff:**
If tokens critically low, request: "Create emergency handoff" (AI will respond with single-line summary):

```
Branch: [name] | PRD: [prd-file] | Tasks: [task-file] | Work: [type] | Last: [task] | Next: [task] | Blockers: [none/description]
```

---

**Remember:** This system maintains consistency across AI sessions while preserving human control. CURRENT-SESSION.md is a living document cleared per session.
