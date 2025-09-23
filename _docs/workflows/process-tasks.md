# Task List Management

Guidelines for managing task lists in markdown files to track progress on completing a PRD

## Task Implementation

- **One sub-task at a time:** Do **NOT** start the next sub‑task until you ask the user for permission and they say "yes" or "y"
- **Test-first approach:** For new models, APIs, and complex logic, write tests before implementation
- **Immediate documentation:** Update the task list file immediately after completing each subtask
- **Completion protocol:**

  1. When you finish a **single sub‑task**:
     - **First**: Immediately mark it as completed by changing `[ ]` to `[x]` in the task list file
     - **Second**: Update the "Relevant Files" section if new files were created or modified
     - **Third**: Pause and ask for user review/approval of the subtask completion
     - **Fourth**: Only proceed to next subtask with explicit user permission

  2. If **all** subtasks underneath a parent task are now `[x]`, follow this sequence:

  - **First**: Ensure new code has appropriate test coverage (models, APIs, complex logic)
  - **Second**: Run the full test suite (`python manage.py test --settings=config.settings_test`, `npm test`, etc.)
  - **Third**: Run all linting checks (`flake8`, `npm run lint`, `npm run type-check`)

  3. Pause and report status to the user, asking if you should commit + move to the next task, or commit only. For commits:

  - **Only if all tests/linting pass**: Stage changes (`git add .`)
  - **Clean up**: Remove any temporary files and temporary code before committing
  - **Commit**: Use a descriptive commit message that:

    - Uses conventional commit format (`feat:`, `fix:`, `refactor:`, etc.)
    - Summarizes what was accomplished in the parent task
    - Lists key changes and additions
    - **Accurately references the specific task number being completed** (e.g., "Complete task 1.0" not "all tasks")
    - References the PRD context
    - **Formats the message as a single-line command using `-m` flags**, e.g.:

      ```
      git commit -m "feat: add payment validation logic" -m "- Validates card type and expiry" -m "- Adds unit tests for edge cases" -m "Related to T123 in PRD"
      ```

  3. Once all the subtasks are marked completed and changes have been committed, mark the **parent task** as completed **in the same commit or immediately after**.
  4. **Verify commit messages match task documentation** - commits should reference specific completed tasks, not broad generalizations.
  5. When a major milestone is reached (e.g., backend complete, frontend complete), update PROJECT-STATUS to reflect progress.

- **Stop after each individual sub‑task and wait for the user's go‑ahead**
- **Never complete multiple subtasks in one implementation cycle** - each subtask represents a discrete deliverable that requires individual review
- **Each subtask should be documented and approved before moving forward**

## Task List Maintenance

1. **Update the task list as you work:**

   - Mark tasks and subtasks as completed (`[x]`) per the protocol above.
   - Add new tasks as they emerge.

2. **Maintain the "Relevant Files" section:**
   - List every file created or modified.
   - Give each file a one‑line description of its purpose.

## AI Instructions

When working with task lists, the AI must:

1. Regularly update the task list file after finishing any significant work.
2. Follow the completion protocol:
   - Mark each finished **sub‑task** `[x]`.
   - Mark the **parent task** `[x]` once **all** its subtasks are `[x]`.
   - **Verify parent task completion happens in documentation commits**.
3. Add newly discovered tasks.
4. Keep "Relevant Files" accurate and up to date.
5. Before starting work, check which **single sub‑task** is next.
6. **Complete only ONE subtask at a time** - never bundle multiple subtasks together.
7. After implementing a **single sub‑task**:
   - Update the task list file immediately (mark subtask as [x])
   - Update "Relevant Files" section if applicable
   - Pause and request user review/approval of the specific subtask completion
   - Wait for explicit permission before starting the next subtask
8. **Before committing, verify task documentation matches commit message claims**.
9. Do not stage changes / commit without pausing for user review / approval.
10. **Never assume subtasks can be grouped** - each represents an individual deliverable requiring separate approval.
