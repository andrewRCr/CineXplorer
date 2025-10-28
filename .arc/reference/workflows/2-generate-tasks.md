# Workflow: Generate Task List

## Purpose

This workflow guides the creation of detailed, executable task lists from PRDs (Product Requirements Documents).
Task lists break down feature or technical work into step-by-step implementation plans that can be followed
incrementally, with clear checkpoints and quality gates.

**When to use:** After a PRD has been created and work is ready to move into active implementation planning.

## Goal

Create a comprehensive task list in Markdown format that transforms PRD requirements into actionable development
steps. The task list should provide clear implementation guidance while respecting existing codebase patterns and
architectural decisions.

## Output

- **Format:** Markdown (`.md`)
- **Location:**
    - Feature work: `.arc/backlog/feature/`
    - Technical work: `.arc/backlog/technical/`
- **Filename:** `tasks-[name].md` (e.g., `tasks-user-profile-editing.md`, `tasks-api-modernization.md`)

**Note:** Task lists typically start in `.arc/backlog/` during planning, then move to `.arc/active/` when
work begins. See [Project Structure](../strategies/strategy-work-categorization.md) for complete lifecycle.

## Process

### Step 1: Review PRD and Project Context

Read the specified PRD to understand requirements, user stories, and acceptance criteria. Then review
foundational documents for broader context:

- **[META-PRD](../constitution/META-PRD.md)** - Product vision and core features
- **[PROJECT-STATUS](../constitution/PROJECT-STATUS.md)** - Current priorities and project state
- **[TECHNICAL-ARCHITECTURE](../constitution/TECHNICAL-ARCHITECTURE.md)** - Architectural patterns and conventions

### Step 2: Assess Current Codebase State

Review the existing codebase to identify:

- Existing infrastructure and architectural patterns that can be leveraged
- Components or features that already exist and relate to PRD requirements
- Files, components, and utilities that may need modification
- Testing patterns and quality standards to follow

### Step 3: Generate Parent Tasks

Based on the PRD analysis and codebase assessment, identify the major phases of work required to implement
the feature or technical improvement. Create 3-7 high-level parent tasks that represent logical implementation
phases.

**Considerations:**

- Each parent task should represent a complete phase that produces testable value
- Order tasks to minimize dependencies and enable incremental progress
- Include phases for testing, documentation, and quality validation

**Example parent task structure (showing test-first ordering):**

```markdown
## Tasks

### **Phase 1:** Backend Tests and Data Models

- [ ] **1.1 Write tests for data models**
- [ ] **1.2 Implement data models**

### **Phase 2:** API Endpoint Tests and Implementation

- [ ] **2.1 Write API integration tests**
- [ ] **2.2 Implement API endpoints**

### **Phase 3:** Frontend Component Tests and Implementation

- [ ] **3.1 Write component tests**
- [ ] **3.2 Implement UI components**

### **Phase 4:** Integration Testing and Quality Gates

- [ ] **4.1 Run full test suite**
- [ ] **4.2 Run quality gates**
```

**Note:** Tests come BEFORE or alongside implementation in each phase, not as separate final phase.

Present parent tasks and confirm the high-level plan aligns with expectations before proceeding to detailed
sub-tasks.

### Step 4: Break Down into Sub-Tasks

For each parent task, define specific, actionable sub-tasks that:

- Follow logically from the parent task
- Cover implementation details implied by the PRD
- Include quality checkpoints (linting, type checking, tests) at appropriate stages
- Reference specific files, components, or patterns where appropriate
- Are small enough to complete in a single work session (typically < 3 files modified)

**Sub-task guidelines:**

- **Test-first protocol (CRITICAL)**: Write test sub-tasks BEFORE implementation sub-tasks for:
    - Data models (Django models, schemas)
    - API endpoints and business logic
    - Service layer functions
    - See [strategy-testing-methodology.md](../strategies/strategy-testing-methodology.md)
      and [DEVELOPMENT-RULES.md](../constitution/DEVELOPMENT-RULES.md) for complete protocol
- **Quality gates**: Include linting and type-checking steps after significant changes
- **Incremental validation**: Structure tasks so progress can be verified at each step
- **No time estimates**: Task lists should NOT include time estimates (duration emojis, minute counts, etc.)
  Focus on clear scope and completion criteria instead

### Step 5: Add Implementation Notes Section (Placeholder)

If architectural decisions, patterns, or constraints emerged during planning, they can be documented in an
"Implementation Notes" section at the bottom of the task list. This provides context for future developers
and explains why certain approaches were chosen.

### Step 6: Generate Final Task List

Combine parent tasks, sub-tasks, and optional implementation notes into the standard Markdown structure:

```markdown
# Task List: [Feature/Work Name]

**PRD Reference:** `.arc/active/[category]/prd-[name].md`
**Branch:** `feature/[feature-name]` or `technical/[work-name]`

## Implementation Notes

_(Optional: Document architectural decisions, patterns, constraints discovered during planning)_

## Tasks

- [ ] 1.0 Parent Task Title
  - [ ] 1.1 Sub-task description
  - [ ] 1.2 Sub-task description
- [ ] 2.0 Parent Task Title
  - [ ] 2.1 Sub-task description
  - [ ] 2.2 Sub-task description
```

### Step 7: Save Task List

Save the generated task list in the appropriate category directory matching the PRD location:

- Feature work: `.arc/backlog/feature/tasks-[name].md`
- Technical work: `.arc/backlog/technical/tasks-[name].md`

The `[name]` should match the base name of the input PRD file
(e.g., if the input was `prd-user-profile-editing.md`, the output is `tasks-user-profile-editing.md`).

## Target Audience

Task lists should be written for developers (junior to mid-level) who will implement the feature with:

- Awareness of existing codebase context
- Understanding of the broader product vision from the META-PRD
- Familiarity with the project's testing and quality standards

**Writing style:**

- Clear, actionable sub-task descriptions
- Specific enough to guide implementation without over-prescribing solutions
- References to patterns, files, or approaches where helpful
- Assumes familiarity with the tech stack but not with every project-specific pattern

## Task List Structure

**Numbering convention:**

- Parent tasks: `1.0`, `2.0`, `3.0`, etc.
- Sub-tasks: `1.1`, `1.2`, `2.1`, `2.2`, etc.
- All tasks start unchecked: `- [ ]`

**Task completion tracking:**

- Mark completed: `- [x] 1.1 Sub-task description`
- Task list is a living document, updated throughout implementation
- See [Task Processing Loop](3-process-task-loop.md) for execution workflow

## Reference Template

**The task list must follow this exact structure:**

```markdown
# Task List: [Feature/Work Name]

**PRD Reference:** `.arc/active/[category]/prd-[name].md`
**Branch:** `[category]/[name]`

## Tasks

### **Phase 1:** Backend Tests and Implementation

- [ ] **1.1 Write tests for core functionality**
    - [ ] 1.1.1 Create test for `ModelName` validation
        - Test: Field validation with valid inputs
        - Test: Field validation with invalid inputs
        - Expect tests to FAIL initially (model doesn't exist yet)
    - [ ] 1.1.2 Create test for `ModelName.method()` behavior
        - Test edge cases with `mock_data` fixture
        - Use `pytest.mark.parametrize` for variants
    - [ ] 1.1.3 Run tests and verify failure messages

- [ ] **1.2 Implement core functionality**
    - [ ] 1.2.1 Create `ModelName` in `app/models.py`
        - Add fields: `field_name`, `other_field`
        - Add validation logic in `clean()` method
        - Full type annotations, comprehensive docstring
    - [ ] 1.2.2 Run tests - should now PASS
    - [ ] 1.2.3 Run quality gates (linting, type checking)

### **Phase 2:** API Endpoints

- [ ] **2.1 Write API integration tests**
    - [ ] 2.1.1 Create tests in `test_api.py`
        - Test successful endpoint responses
        - Test error handling and validation
- [ ] **2.2 Implement API endpoints**
    - [ ] 2.2.1 Create endpoint in `api.py`
    - [ ] 2.2.2 Run integration tests - should PASS

## Implementation Notes

_(Optional: Document architectural decisions, patterns, constraints discovered during planning)_
```

**Format guidelines:**

- Phase headers: `### **Phase X:** Description` (no time estimates)
- Parent tasks: `- [ ] **X.Y Description**` (checkbox + bold + numbered)
- Numbered subtasks: `- [ ] X.Y.Z Description` - Use ONLY when parent has 2+ distinct, independently completable steps
- Unnumbered bullets: Implementation details, checklists, context - Use for single-task guidance
- Backticks for technical terms: `field_name`, `ClassName`, `method_name()`, `/api/endpoint/`
- Indent with 4 spaces per level
- Tests BEFORE implementation in each phase

**Optional formatting enhancements:**

- **Blank lines between subtasks**: Use when subtasks have 2+ lines of implementation details and parent has
  3+ subtasks. Include blank line after parent task for visual consistency. Improves readability through chunking.

- **Goal:** **clarification line**: Use beneath parent task (indented to subtask level) when title is
  technical/terse and needs context. Must illuminate purpose/impact, not repeat title.
  Format:

  ```markdown
  - [ ] **X.Y Parent task**

      **Goal:** One-line purpose/rationale clarification.

      - [ ] X.Y.Z First subtask
          - Implementation detail

      - [ ] X.Y.Z Second subtask
  ```

**When to use numbered subtasks vs. detail bullets:**

Use **numbered subtasks (X.Y.Z)** when:

- Parent task requires 2+ distinct, independently completable steps
- Each step could potentially be worked on separately or by different people
- Steps have clear completion criteria and can be checked off individually

Use **unnumbered bullets** when:

- Providing implementation details or guidance for a single task
- Listing edge cases, considerations, or context
- Describing what should be included/tested (checklists within a task)

**When to include implementation details (optimize signal-to-noise):**

✅ **Include details when:**

- Non-obvious implementation approach or architecture decision
- Edge cases or tradeoffs to consider
- Specific patterns to follow from existing codebase
- Context that helps future readers understand "why"
- Expected behaviors (tests FAIL initially, tests should PASS after)
- File locations when not obvious from task description

❌ **Omit details when:**

- Restating the task title in different words
- Generic advice that applies to all tasks
- Step-by-step for trivial operations obvious to anyone in the codebase
- Reminders that are already in quality gates (e.g., "run type checking")
