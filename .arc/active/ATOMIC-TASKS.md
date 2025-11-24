# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete, move to `completed-atomic-{quarter}.md` in `reference/archive/` (insert at top)
3. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

**Referencing completed work:** "see {task name} in `completed-atomic-2025-q4.md`"
    - Quick access: [Completed Atomic Tasks - 2025 Q4](../reference/archive/2025-q4/completed-atomic-2025-q4.md)

---

## Active
<!-- Add tasks here with checkboxes -->

<!-- Miscellaneous -->

- [ ] Investigate login session loss during testing
    - Context: session appeared lost during theme system visual testing (no explicit logout)
    - Test session persistence during normal navigation
    - Test session across browser refreshes
    - Test session timeout behavior
    - Document reproduction steps if found, or close as testing artifact

- [ ] Simplify sort options UI
    - Add "Release Date (Oldest)" to minimal sort dropdown
    - Increase minimal dropdown width to fit longest label
    - Remove advanced sort dropdown entirely (confusing/meaningless results for reverse sorts)
    - Center release year and rating inputs in advanced filters row to visually balance
    - Rationale: Reverse sorts (popularity.asc, vote_average.asc, title Z-A) produce meaningless data (untracked/unrated
    movies, Unicode sorting issues)
