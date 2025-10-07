# .arc - ARC Documentation System

This directory contains the complete documentation system for the CineXplorer project, organized following the ARC (Agentic, Recursive, Coordination) framework methodology.

## Directory Structure

```
.arc/
├── active/           # Current session work - PRD, tasks, notes, and session context
├── upcoming/         # Future work pipeline organized by work type
│   ├── sub-prds/     # Feature specifications ready for development
│   ├── notes/        # Research and decision logs for upcoming features  
│   └── tasks/        # Generated task lists from approved PRDs
└── reference/        # Stable, long-term documentation
    ├── constitution/ # Foundational project documents (META-PRD, rules, architecture)
    ├── strategies/   # Evolved implementation approaches and stable patterns
    ├── ai-instructions/ # Agent configuration and context
    ├── archive/      # Completed feature documentation and decisions
    └── workflows/    # Development process guidance
```

## Usage Patterns

### Active Development

- Work primarily in `active/` during feature development
- Contains current session context, active PRD, tasks, and research notes
- Files here represent your immediate work scope

### Planning & Pipeline

- Use `upcoming/` to organize future work by type
- Sub-PRDs ready for development, research notes, and generated tasks
- Maintains development pipeline visibility

### Reference & History

- `reference/` contains stable documentation and completed work
- Constitutional documents define project principles and architecture
- Strategies capture evolved patterns and approaches
- Archive preserves completed feature context
- AI instructions provide agent configuration
- Workflows guide development processes

## Framework Integration

This structure implements the ARC framework's core principles:

- **Agentic**: Optimized for AI agent collaboration with clear context boundaries
- **Recursive**: Knowledge evolves from temporal notes → stable patterns → archived decisions  
- **Coordination**: Shared language and systematic handoffs across development cycles

For more information about the ARC framework, see the [arc-agentic-dev-framework](https://github.com/andrewRCr/arc-agentic-dev-framework) repository.
