name: Atomic Commit Workflow
description: Break changes into logical, atomic commits with clear messages
author: CineXplorer Development
tags: [git, commit, workflow]

steps:

- name: Check Status
  command: git status
  description: Review all pending changes

- name: Review Changes
  command: git --no-pager diff --stat
  description: Get overview of changed files and line counts

- name: Check Task Documentation
  command: find \_docs/tasks -name "\*.md" -exec grep -l "\[x\]" {} \;
  description: |
  Before committing, IF changes are part of an established task list, verify task documentation is accurate:

  1. Check if all subtasks for a parent are [x] - if so, parent should also be [x]
  2. Review task progress matches what you're committing
  3. Ensure commit messages reference correct task numbers
  4. Update any task status that should change with this commit

- name: Plan Commits
  description: |
  Organize changes into logical groups:

  1. Core functionality (new features, major logic)
  2. Configuration/Infrastructure (settings, configs)
  3. Tests (test files, test configurations)
  4. Documentation (README, docs, task updates)
  5. Code formatting (linting fixes, style)
  6. Dependencies (package.json, requirements)
  7. Cleanup (removals, refactoring)

- name: Create Atomic Commits
  description: |
  For each logical group:

  1. git add [specific files for this group]
  2. git commit -m "[type](feature-scope): Brief description

     - Detailed change 1
     - Detailed change 2
     - Impact or rationale"

  Commit types:

  - feat: new features
  - fix: bug fixes
  - docs: documentation (including task status updates)
  - style: code formatting
  - refactor: code restructuring
  - test: adding/fixing tests
  - config: configuration changes
  - chore: maintenance tasks

  Scope Guidelines (Feature Context):

  - Use feature/system name for multi-task features (e.g., "logging-system", "user-auth", "movie-api")
  - Use specific component for single changes (e.g., "middleware", "database", "frontend")
  - Examples: feat(logging-system), config(user-auth), docs(movie-api)
  - Provides context for related commits across multiple tasks

  Task Documentation Guidelines:

  - Reference specific task numbers with feature context (e.g., "Complete logging-system task 2.0")
  - Include parent feature name when completing sub-tasks
  - When all subtasks are done, mark parent task complete in same commit
  - Commit messages should match actual task progress
  - Always check \_docs/tasks/ files before committing docs changes

  Example Commit Messages with Feature Context:

  ```
  # Multi-task feature development
  feat(logging-system): Implement request correlation middleware (Task 2.1)
  config(logging-system): Register middleware in Django settings (Task 2.6)  
  docs(logging-system): Complete Task 2.0 - Request Correlation
  
  # Single feature changes
  fix(movie-api): Resolve TMDB rate limiting in discover endpoint
  style(backend): Fix flake8 violations in middleware files
  test(user-auth): Add comprehensive JWT token validation tests
  ```

- name: Verify Commits
  command: git log --oneline -10
  description: Review recent commit messages for clarity

- name: Final Check
  command: git status
  description: Ensure all changes are committed

notes: |
Good atomic commit practices:

- Each commit should be a single logical change
- Commits should be independently buildable/testable
- Use descriptive commit messages with context
- Group related changes together
- Separate formatting from functional changes
- Keep commits focused and purposeful

Task Documentation Consistency:

- Always verify task status matches commit content
- Mark parent tasks [x] when all subtasks are [x]
- Reference correct task numbers in commit messages
- Include task status updates in documentation commits
- Follow \_docs/workflows/process-tasks.md completion protocol
