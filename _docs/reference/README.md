# Reference Documentation

This directory contains authoritative reference documentation for architectural decisions, design patterns, and technical standards in CineXplorer.

## Purpose

**Reference documents** serve as:

- Single source of truth for established patterns
- Guidelines for consistent implementation across the codebase
- Reasoning and justification for architectural decisions
- Long-term stable documentation (not temporal notes)

## Documents

### [Type Safety Strategy and Guidelines](./type-safety-strategy.md)

Comprehensive reference for achieving type safety in Django + Pydantic applications.

**Covers:**

- Django ORM type safety challenges
- .pyi stub file implementation
- ModelSchema patterns and best practices
- Hybrid Pyright + MyPy configuration
- Type ignore guidelines and justifications
- Maintenance procedures

**Use this when:**

- Implementing new Django models
- Creating Pydantic schemas
- Setting up type checking for new modules
- Debugging type checking issues
- Onboarding new developers

---

## Guidelines for Reference Documents

**When to create a reference document:**

- Pattern has been implemented and proven in production
- Decision affects multiple parts of the codebase
- Future developers will need to understand the "why" behind the approach
- Information needs to be stable and authoritative (not experimental)

**When NOT to create a reference document:**

- Pattern is still experimental (use `_docs/notes/` instead)
- Decision is project-specific and temporary
- Information is already well-covered in external documentation
- Topic is too specific to a single feature

**Document structure:**

1. **Purpose** - What problem does this solve?
2. **Context** - Why was this approach chosen?
3. **Implementation** - How to apply this pattern
4. **Guidelines** - Best practices and anti-patterns
5. **Maintenance** - How to keep this working over time
6. **References** - Related documents and resources

---

## Relationship to Other Documentation

```
_docs/
├── reference/          ← Long-term stable patterns (YOU ARE HERE)
│   └── type-safety-strategy.md
├── sub-prds/          ← Feature requirements and specifications
├── tasks/             ← Feature implementation tracking
├── workflows/         ← Process documentation for development
└── notes/             ← Temporal, untracked working documents
```

**Key differences:**

- **Reference docs** are tracked, stable, and authoritative
- **Notes** are untracked, temporal, and exploratory
- **PRDs** define what to build
- **Reference docs** define how to build it consistently
