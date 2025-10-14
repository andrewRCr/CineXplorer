# Workflow: Maintain Task & Notes Hygiene

Use this workflow when an active task list has accumulated historical notes or when the companion notes document needs pruning. **Execute this workflow before archiving completed incidental work** to ensure both files are reference-ready.

**Goal:** Keep the task file lean and scannable while preserving rich historical context in the notes file.

## When to Use This Workflow

**Required:**
- Before archiving completed incidental work (final task documentation step)
- When task list has accumulated verbose inline explanations (>100 lines of context blocks)

**Optional:**
- Mid-work cleanup when notes file becomes difficult to navigate
- After major pivots/investigations that generated exploratory content

## Inputs

- Path to the task list (e.g., `.arc/active/incidental/tasks-*.md`)
- Path to the related notes file (e.g., `.arc/active/incidental/notes-*.md`)
- Current project rules: [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md)

## Checklist

### 1. Confirm Pairing

- Verify both files refer to each other and cover the same scope
- Note overall status (In Progress, Completed) and remaining unchecked tasks
- Update status metadata at top of both files (Created/Completed dates)

### 2. Inventory Open Work

- List remaining unchecked tasks; identify what context they require
- Flag any sections in the task doc labelled "Notes", "Implementation Notes", or "Decision Log"
- **Key distinction**: Concise inline notes (1-2 lines per subtask) are fine to keep; verbose explanatory blocks need migration

### 3. Clean Up Task File

**What to Keep:**
- ✅ Task structure (parent tasks, subtasks, checkboxes)
- ✅ Concise inline outcome notes (e.g., "✅ Passed", "Bug fix: corrected X → Y")
- ✅ "Relevant Files" section (helpful reference)
- ✅ "Completion Summary" section (for completed work)

**What to Migrate to Notes File:**
- ❌ Multi-paragraph "Context" blocks explaining background
- ❌ Detailed sub-subtask breakdowns (3.6.1.1, 3.6.1.2, etc.)
- ❌ Verbose decision rationale (keep 1-line summary with "see notes" pointer)
- ❌ Bug fix explanations beyond one line
- ❌ "Active References" section (no longer active after completion)
- ❌ "References" section (move to notes file)

**Examples:**

```markdown
<!-- KEEP (concise inline note) -->
- [x] 4.3.3 Consider alert thresholds - DEFERRED to observability sprint

<!-- MIGRATE (verbose explanation block) -->
- [x] 4.3.3 Consider adding alert threshold (multiple reuse attempts = attack) - **DEFERRED to observability sprint**
    - **Decision:** Defer automatic alert thresholds to future observability sprint
    - **Rationale:** Current WARNING logs provide full audit trail; alert thresholds should be designed holistically...
    - [5 more lines of detail]

<!-- AFTER CLEANUP -->
- [x] 4.3.3 Consider alert thresholds - DEFERRED to observability sprint (see notes file for rationale)
```

### 4. Migrate Content to Notes File

- Create "Historical Implementation Details" section near bottom of notes file
- Add migrated content under descriptive headings with dates (e.g., "Task 3.6 – Throttling Lazy Evaluation Refactoring (2025-10-13)")
- Preserve full detail (this is the "messy reference" - don't over-edit)
- Add brief context at top of each historical section

### 5. Prepare Notes File for Archival

**This step makes the difference between a notes file that gets used vs ignored.**

**Add Table of Contents:**
- Create TOC section at top (after metadata, before first major section)
- Group by category: "Major Investigations & Decisions", "Implementation Details", "Historical Context", "Reference"
- Use markdown anchor links for navigation
- Keep TOC concise (one-line description per section)

**Update Section Headers:**
- Remove task references from headers (e.g., "Task 5.5: Django Ninja CSRF..." → "CSRF Integration Issue Resolution")
- Make headers descriptive and standalone (future-you won't remember task numbers)
- Add brief context line under each major heading

**Remove Temporal Markers:**
- Delete "To be filled", "Pending approval", "Status: PENDING"
- Update decision records to show final outcomes
- Change "Next Steps" to "Implementation" or "Resolution"

**Consolidate Exploratory Sections:**
- Preserve the investigation journey but make it scannable
- Add summary at top of long exploratory sections
- Use "TLDR" or "Quick Summary" for verbose investigations
- Example: 300-line CSRF investigation → 50-line summary + detailed journey

**Verify Consistency:**
- Ensure all section headers follow similar patterns
- Check that anchor links in TOC work
- Update metadata (Created → Completed date, Status: Active → Complete)

**Estimated Time:** 15-30 minutes for archival prep

### 6. Update Cross References

- At the top of both files, confirm the "Related Task/Notes" pointers are accurate
- Update status metadata:
    - Task file: `**Status**: Completed`, `**Actual Effort**: ...`
    - Notes file: `**Status**: Complete`, `**Completed**: YYYY-MM-DD`
- Add completion date to both files

### 7. Quality Checks

- Run `npx markdownlint-cli2 --fix <task-file> <notes-file>`
- Review diff to ensure no accidental task-checkbox edits
- Verify TOC anchor links work (spot check 2-3 links)
- Confirm task file is now lean and scannable (can grasp structure in <2 minutes)
- Confirm notes file has clear navigation (can find specific topic in <1 minute)

## Output

**Task File:**
- Lean, scannable structure showing what was accomplished
- Concise inline notes documenting outcomes
- Completion summary with metrics and accomplishments
- Clear next steps
- **Target:** Can understand scope and outcomes in 2-3 minutes

**Notes File:**
- Table of contents for quick navigation
- Clean section headers (no temporal markers)
- Rich historical detail preserved
- Organized by topic, not chronological chaos
- **Target:** Can find specific technical decision or implementation detail in 1 minute

**Archive Ready:**
- Both files suitable for long-term reference
- No temporal confusion ("pending", "to be filled")
- Clear, professional documentation

## Lessons Learned

**From Authentication Security Updates (2025-10-14):**

1. **Inline Notes Guideline**: If it's >3 lines explaining a subtask, it should migrate to notes file with a reference pointer.

2. **Task List Question**: "Can I understand what was accomplished by scanning task checkboxes + inline notes in <3 minutes?" If no, it needs cleanup.

3. **Notes File Question**: "Can I find a specific technical decision without scrolling through 1500 lines?" If no, it needs TOC + headers.

4. **Migration Pattern**: Don't delete anything - migrate verbose content to "Historical Implementation Details" section in notes file. Storage is cheap, context loss is expensive.

5. **Archival Prep ROI**: 20 minutes of cleanup dramatically increases likelihood of actually using these docs 6 months later.

## Common Pitfalls

❌ **Leaving temporal markers**: "Pending approval", "To be filled" confuses future readers
❌ **Skipping TOC**: 1500-line notes file without navigation is effectively unusable
❌ **Over-editing notes**: Don't remove the exploration journey - that's valuable context
❌ **Deleting instead of migrating**: Lost context can't be recovered
❌ **Inconsistent headers**: "Task 5.5.6.3" vs "Frontend CSRF Guide" - pick one style
❌ **Skipping archival prep**: "I'll clean it up later" = never gets cleaned up

✅ **Task file shows the what and why** (scannable structure)
✅ **Notes file shows the how and journey** (detailed reference)
✅ **Both files are navigable** (TOC, clear headers, no temporal confusion)
✅ **Future-you says "thank you"** (actually uses these docs when needed)
