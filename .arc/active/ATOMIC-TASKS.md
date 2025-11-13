# Atomic Tasks

**Purpose:** Small, one-off tasks that are ready to execute (GTD "Next Actions").

**How to use:**

1. Add tasks with checkboxes under "Active" section
2. When complete, mark `[x]` and move to "Completed (This Week)"
3. During weekly review, delete all completed items
4. Commit atomic work with: `Context: {category} (atomic / no associated task list)`
   - Categories: maintenance, refactor, documentation, planning

---

## Active
<!-- Add tasks here with checkboxes -->

- [ ] Research accessibility guidelines for input field focus rings
    - WCAG 2.1/2.2 requirements for focus indicators on form controls
    - Best practices: keyboard-only vs always-visible focus rings
    - Chakra UI v3 default focus behavior and accessibility considerations
    - Validate our current approach: border color change (all focus) + outline ring (keyboard-only via :focus-visible)
    - Document findings and confirm our implementation meets standards
    - **Context:** Currently using `!important` CSS to disable Chakra defaults - ensure this doesn't break accessibility
    - **IMPORTANT:** If research findings require pattern changes, must update:
        - `frontend/src/pages/user/Register.tsx` (3 inputs use current pattern)
        - `frontend/src/pages/user/Login.tsx` (2 inputs + checkbox)
        - `frontend/src/pages/dev/theme-debug/sections/FormControlsSection.tsx` (Input, Textarea, NumberInput, Select)
        - `.arc/reference/strategies/project/style/strategy-semantic-tokens.md` (Form Inputs + Select sections)
        - Any other form controls discovered via grep

- [ ] Investigate GitLab Pajamas neutral outline border contrast
    - Current: border-strong-01 = #bfbfc3 (2.1:1 on white, below WCAG 3:1)
    - All 3 border-strong levels same in light mode (alternating pattern)
    - Consider theme-specific foreground border override for button-outline
    - Maintain consistency (don't use tertiary color)

## Completed (This Week)

<!-- Move completed tasks here (marked [x]); delete all during weekly review  -->
