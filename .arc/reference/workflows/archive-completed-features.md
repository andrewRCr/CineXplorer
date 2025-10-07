name: Archive Completed Features Workflow
description: Move completed feature documentation to structured archive for reference while keeping working directories clean
author: CineXplorer Development
tags: [documentation, archive, workflow, organization]

steps:

- name: Verify Feature Completion
  command: find .arc/active .arc/upcoming/tasks -name "*.md" -exec grep -l "\[x\]" {} \;
  description: |
  Before archiving, ensure the feature is truly complete:
  
  1. All task subtasks are marked [x] in tasks file
  2. Parent tasks are marked [x]
  3. Feature is moved to "Completed Work" in PROJECT-STATUS.md
  4. All related code is committed and tested
  5. Feature is functioning in development environment

- name: Create Archive Directory Structure
  description: |
  Ensure archive directories exist (should already be set up):
  
  1. mkdir -p .arc/reference/archive/sub-prds
  2. mkdir -p .arc/reference/archive/tasks  
  3. mkdir -p .arc/reference/archive/completion-metadata
  
  Archive mirrors active directory structure with completion metadata separate.

- name: Move PRD Documentation
  description: |
  Move the feature's PRD to archive:

  1. `mv .arc/upcoming/sub-prds/prd-[feature-name].md .arc/reference/archive/sub-prds/`
  2. Create completion metadata: `.arc/reference/archive/completion-metadata/completion-[feature-name].md`
  
  Completion metadata should include:
    - Completion date and final commit hash
    - Brief completion summary
    - Links to key implementation commits
    - Feature overview and capabilities

- name: Move Task Documentation
  description: |
  Move the feature's task file to archive:

  1. `mv .arc/upcoming/tasks/tasks-[feature-name].md .arc/reference/archive/tasks/`
  
  Task details remain accessible via the archived task file.
  Completion metadata captures high-level summary without duplicating task breakdown.

- name: Update PROJECT-STATUS.md
  description: |
  Ensure PROJECT-STATUS.md reflects the archival:
  
  1. Verify feature is in "Completed Work" section
  2. Add reference to archive location if appropriate
  3. Update any cross-references to archived documentation

- name: Create Archive Index
  command: find .arc/reference/archive -name "*.md" | sort
  description: |
  Maintain visibility of archived content:
  
  Archive directory should contain:
    - README.md with archive overview and navigation
    - Index of all archived features with completion dates
    - Guidelines for accessing archived documentation

- name: Commit Archive Changes
  description: |
  Commit the archival changes following atomic commit principles:

  **Before committing:**
  1. Run markdown linting: `npx markdownlint-cli2 "README.md" ".arc/**/*.md"`
  2. Fix any violations in completion metadata and archived docs
  3. Verify all quality gates pass

  ```bash
  git add .arc/reference/archive/
  git add .arc/upcoming/sub-prds/ .arc/upcoming/tasks/  # (for removed files)
  git add .arc/reference/constitution/PROJECT-STATUS.md
  ```

  git commit -m "docs(archive): Archive [feature-name] documentation

    - Move completed PRD and tasks to structured archive
    - Add completion metadata and summary
    - Update PROJECT-STATUS.md references
    - Maintain clean working directories for active development"

notes: |
Archive Organization Principles:

- Preserve Development History: Keep all planning and task documentation for future reference
- Maintain Clean Working Directories: Active development focuses on current/planned features only  
- Professional Documentation: Archived content demonstrates systematic development approach
- Easy Reference: Structured organization allows quick access to completed feature details

Archive Directory Structure:

```
.arc/reference/archive/
├── README.md                                    # Archive overview and navigation
├── sub-prds/
│   ├── prd-logging-system.md                    # Archived PRDs
│   ├── prd-user-authentication.md
│   └── [other-completed-features].md
├── tasks/
│   ├── tasks-logging-system.md                  # Archived task files
│   ├── tasks-user-authentication.md
│   └── [other-completed-features].md
└── completion-metadata/
    ├── completion-logging-system.md             # Comprehensive completion documentation
    ├── completion-user-authentication.md
    └── [other-completion-files].md
```

Benefits of Systematic Archival:

- Demonstrates professional development practices to potential employers
- Provides valuable reference for similar future features
- Maintains project history while keeping active workspace organized
- Creates searchable knowledge base of completed work
- Shows evolution from planning through implementation to completion
