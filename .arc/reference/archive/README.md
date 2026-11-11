# CineXplorer Archive

This archive contains documentation for completed work, preserving the development history while keeping active
working directories clean and focused.

## Archive Organization

Archives are organized by **quarter** (e.g., `2025-q4/`) containing all work completed during that period.

Each quarter directory uses **work-package subdirectories** where all documents for a piece of work live together:

- **`feature/`** - User-facing planned work (each feature has its own subdirectory)
- **`technical/`** - Infrastructure planned work (each technical work has its own subdirectory)
- **`incidental/`** - Unplanned reactive work (subdirectories for work with notes, root for simple task lists)
- **`completed-atomic-{quarter}.md`** - Permanent record of completed atomic tasks

### Work Package Structure

Each completed work unit gets its own subdirectory containing:

- `draft-{name}.md` - Design draft (when the work had one)
- `prd-{name}.md` - Product Requirements Document (only exists for feature/technical work)
- `tasks-{name}.md` - Task implementation documentation
- `notes-{name}.md` - Development notes (optional)
- `completion-{name}.md` - Completion metadata and summary
- `review-log-{name}.md` - Review passes from design to code review (when any were recorded)

**Example:**

```
archive/2025-q4/technical/logging-system/
├── prd-logging-system.md
├── tasks-logging-system.md
└── completion-logging-system.md
```
---

## Navigation

### Active Documentation

- **Current Work**: [`.arc/active/`](../../active/) (feature/, technical/, incidental/)
- **Upcoming Work**: [`.arc/upcoming/`](../../upcoming/) (feature/, technical/)
- **Workflows**: [`workflows/`](../workflows/)

### Archive Workflow

- **Archival Process**: [`workflows/supplemental/archive-completed.md`](../workflows/supplemental/archive-completed.md)
- **Work Organization**: [`strategies/arc/strategy-work-organization.md`](../strategies/arc/strategy-work-organization.md)

## Purpose

This archive serves multiple purposes:

1. **Professional Documentation**: Demonstrates systematic development methodology
2. **Reference Material**: Provides context for similar future features
3. **Development History**: Preserves the evolution from planning to completion
4. **Knowledge Base**: Creates searchable resource of completed work organized by work type
5. **Clean Workspace**: Keeps active directories focused on current/planned work

## Benefits of Work-Package Organization

- **All related docs in one place**: PRD, tasks, notes, and completion metadata together
- **Easier navigation**: Find everything about a piece of work in one subdirectory
- **Simpler archival**: Move all files together instead of distributing across 4 directories
- **Better git history**: Related documents move together, preserving relationships

## File Naming Conventions

- **Design drafts**: `draft-{name}.md`
- **PRDs**: `prd-{name}.md`
- **Tasks**: `tasks-{name}.md`
- **Review logs**: `review-log-{name}.md`
- **Notes**: `notes-{name}.md` (optional)
- **Completion**: `completion-{name}.md`
- **Incidental Tasks**: `tasks-{name}.md`
- **Incidental Notes**: `notes-{name}.md` (optional)

---

_Archive maintained as part of CineXplorer's ARC development framework_
