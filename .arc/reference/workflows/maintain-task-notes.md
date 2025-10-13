# Workflow: Maintain Task & Notes Hygiene

Use this workflow when an active task list has accumulated historical notes or when the companion notes document needs pruning. The goal is to keep the task file focused on in-flight work while preserving any long-term context in the notes file.

## Inputs

- Path to the task list (e.g., `.arc/active/incidental/tasks-*.md`)
- Path to the related notes file (e.g., `.arc/active/incidental/notes-*.md`)
- Current project rules: [DEVELOPMENT-RULES](../constitution/DEVELOPMENT-RULES.md)

## Checklist

1. **Confirm pairing**
   - Verify both files refer to each other and cover the same scope
   - Note overall status (In Progress, Completed) and remaining unchecked tasks

2. **Inventory open work**
   - List remaining unchecked tasks; identify what context they require
   - Flag any sections in the task doc labelled “Notes”, “Implementation Notes”, or “Decision Log”

3. **Evaluate task-file notes**
   - For each subsection in the task file beyond the task list:
     - If it supports an unchecked task (instructions, acceptance criteria, test reminders) → keep and label as “Active Reference”
     - If it documents completed work or historical analysis → move to the notes file (add heading/date)
     - If it duplicates canonical documentation (DEVELOPMENT-RULES, strategies) → replace with a short link
   - After migration, the task file should only include:
     - Active references for upcoming subtasks
     - Links pointing to the notes file for background

4. **Curate the notes file**
   - Organize migrated content under dated headings (e.g., “2025-10-10 – CSRF Investigation”)
   - Trim redundant detail: keep decisions, rationale, and references; remove command transcripts unless uniquely valuable
   - Cross-link back to relevant tasks for traceability

5. **Update cross references**
   - At the top of both files, confirm the “Related Task/Notes” pointers and status statements are accurate
   - If the task list status changed (e.g., new phase complete), update the status line accordingly

6. **Quality checks**
   - Run `npx markdownlint-cli2 --fix <task-file> <notes-file>`
   - Review diff to ensure no accidental task-checkbox edits
   - Summarize changes in CURRENT-SESSION.md if required

## Output

- Task file containing only actionable steering information for remaining work
- Notes file holding historical context, decisions, and research
- Brief summary recorded in CURRENT-SESSION.md (optional but recommended)
