# Architecture Decision Records (ADR) Methodology

**Version:** 1.1 | **Updated:** 2025-10-30

## Purpose

Standards and guidance for documenting architectural decisions using Architecture Decision Records (ADRs).
This strategy ensures consistent capture of decision context, rationale, and consequences throughout
the project lifecycle.

ADRs serve as:

- Historical record of why decisions were made
- Reference for understanding system constraints
- Learning tool for new developers
- Input material for strategy documents

## Table of Contents

1. [What Are ADRs](#what-are-adrs)
2. [When to Write an ADR](#when-to-write-an-adr)
3. [ADR Format and Structure](#adr-format-and-structure)
4. [Naming Conventions](#naming-conventions)
5. [ADR Lifecycle](#adr-lifecycle)
6. [Amending Accepted ADRs](#amending-accepted-adrs)
7. [Template](#template)
8. [Relationship to Strategy Documents](#relationship-to-strategy-documents)

---

## What Are ADRs

**Architecture Decision Record (ADR)** is a lightweight document that captures a significant architectural decision
along with its context and consequences.

**Core Principle:** Capture not just *what* was decided, but *why* it was decided and *what happens* as a result.

**Key Characteristics:**

- **Stable:** Once the change that accepts an ADR merges, its decision is final: corrections and amendments are
  permitted, but the decision itself changes only through [supersession](#superseded). See
  [Amending Accepted ADRs](#amending-accepted-adrs)
- **Sequential:** Numbered sequentially (001, 002, 003...), numbers never reused
- **Concise:** Typically 1-2 pages, focusing on decision and context, not implementation details
- **Discoverable:** Stored in version control alongside code, easily searchable

---

## When to Write an ADR

Write an ADR when a decision meets any of these criteria:

**1. Decision affects system structure or external contracts**

- Choosing between API endpoint patterns
- Selecting authentication mechanism
- Deciding on data modeling approach
- Defining integration patterns with external services

**2. Multiple alternatives were considered**

- Decision involved weighing trade-offs between options
- Example: "JWT in cookies vs localStorage vs sessions?"

**3. Decision driven by external constraint**

- External API limitations (e.g., "TMDB list endpoints don't support filtering")
- Regulatory requirements (e.g., GDPR data handling)
- Performance requirements (e.g., "must support 10k concurrent users")

**4. Future developers will ask "why did we do it this way?"**

- Non-obvious architectural choices
- Decisions that go against common patterns
- Workarounds for framework limitations

**5. Decision could be reversed later**

- If circumstances change, someone will need context to decide whether to reverse it

**Don't write an ADR for:**

- Tactical implementation choices (variable names, loop constructs, code organization)
- Decisions obvious from code (standard CRUD, framework conventions)
- Temporary or experimental choices

**Rule of Thumb:** If someone might want to change this decision in 6 months, they'll need context for why it was made.

---

## ADR Format and Structure

Every ADR follows this five-section structure:

### 1. Title

**Format:** `ADR-NNN: [Present-Tense Imperative Title]`

**Guidelines:**

- Use present tense imperative mood: "Use X", "Choose Y", "Implement Z"
- Describe the decision itself, not the problem
- Keep concise (under 10 words ideal)

**Examples:**

- ✅ `ADR-001: Use TMDB Discover Endpoint for Filtering`
- ✅ `ADR-002: Store JWT Tokens in HTTP-Only Cookies`
- ❌ `ADR-001: TMDB Filtering Problem` (describes problem, not decision)

### 2. Status

**Format:** The section's first line states the current status. Later paragraphs may record how it was reached.

**Valid States:**

- `Proposed` - Written but not yet accepted: in an unmerged change, or on `main` awaiting acceptance
- `Accepted (YYYY-MM-DD)` - Set in the delivering change before it merges, dated the day of the flip
- `Deprecated` - Decision no longer valid but not replaced
- `Superseded by ADR-XXX` - Decision replaced by a new ADR
- `Accepted; Superseded in part by ADR-XXX (part)` - Part of the decision, named in parentheses, replaced by a new
  ADR; the rest stands

ADRs accepted before this format keep their Status lines as written, such as `Accepted (Owner, 2025-10-22)`.

**Note:** The record locks when the change that sets `Accepted` merges. Corrections and amendments then follow
specific rules — see [Amending Accepted ADRs](#amending-accepted-adrs).

### 3. Context

Explain the forces at play that motivated this decision.

**Include:**

- Technical constraints or limitations
- Business requirements
- External API or regulatory constraints
- Performance or scalability needs
- Alternatives that were considered

**Tone:** Neutral and factual - present the situation objectively

### 4. Decision

State clearly what was decided.

**Format:**

- Use active voice: "We will..."
- Be specific about what is being done, who/what is affected
- Short and definitive

### 5. Consequences

Document what becomes easier or harder as a result.

**Structure:**

- **Positive:** What improves (maintainability, clarity, performance)
- **Negative:** What becomes harder, trade-offs accepted
- **Risks (optional):** Concerns requiring monitoring, follow-up work

**Example ADR** (see adr-001-use-tmdb-discover-endpoint.md for complete structure)

### Reader independence

An ADR's Context, Decision, and Consequences meet [spec-review][spec-review]'s reader-independence check: their
meaning stands without planning history. Its Reference boundaries supply these three rules:

- "Judge what supplies meaning, not tokens."
- "ARC terms and artifact names are valid subject matter when their required meaning is established or defined
  locally."
- "The substantive thesis stands without tracking fields; they supply no missing design."

These sentences come from spec-review; a change to them carries here. Status is the tracking slot. A new ADR meets
the rule across its body. An edit to an existing ADR meets it over the changed footprint, including removals and
affected surrounding obligations and definitions.

Process narration doing the explaining goes, such as "surfaced during Task 5.2" or "ships with work unit X". The
project's own domain vocabulary stays.

---

## Naming Conventions

**File Naming Pattern:** `adr-NNN-short-title.md`

**Components:**

- `adr-` - Prefix for fuzzy finding and explicit type marking
- `NNN` - Three-digit sequential number (001, 002, 003, ...)
- `short-title` - Lowercase words separated by dashes

**Examples:**

- `adr-001-use-tmdb-discover-endpoint.md`
- `adr-002-jwt-cookie-authentication.md`
- `adr-003-client-side-filtering-for-data-quality.md`

**Guidelines:**

- Numbers are never reused, even if an ADR is deprecated
- Numbers increment sequentially based on creation order
- When two ADRs share a number, the one that landed first on `main` keeps it. Renumber the other to the next free
  number and correct the records that cite it, a [correction](#amending-accepted-adrs) even after acceptance
- Title should match (or abbreviate) the ADR's title section
- Keep title portion under 50 characters if possible

---

## ADR Lifecycle

### Proposed

**When:** Written with the implementation, in the change that completes the work. This timing holds even when
planning recommends the ADR earlier.

Until then the PRD carries the decision, its rationale, and its ADR disposition as binding design. Its Design
Decisions record each disposition, beside its decision or in one list there, and list each new or amended ADR among
what the work delivers ([1_create-prd.md](../../workflows/1_create-prd.md)). No ADR file exists during planning: an
earlier recommendation is a disposition first. An errand has no PRD; one that writes or amends an ADR follows the
same lifecycle within its pull request.

**Process:**

1. Write the ADR file reading `Proposed`.
2. Edit it freely through implementation, verification, and review.
3. Set `Accepted (YYYY-MM-DD)` in the delivering change before it merges.

A Proposed ADR already on `main` stays editable until the change that accepts it, and locks when that change merges.
A change that doesn't accept it may still edit it, or rename it while keeping its number. Nothing that reaches
`main` may add an ADR reading `Proposed` or return one to `Proposed`.

### Accepted

**When:** The delivering change's work is complete, before it merges
([archive-completed.md § 1](../../workflows/supplemental/archive-completed.md#1-verify-the-work)).

**Process:**

1. Set Status to `Accepted (YYYY-MM-DD)`, dated the day of the flip.
2. Ensure Context, Decision, and Consequences are complete.
3. Deliver the ADR with the implementation; the decision locks when that change merges. Until then it stays freely
   editable, including after the status flip.

When later work realizes an Accepted decision, note the realization timing in the ADR and append learnings as dated
amendments. A decision that genuinely unfolds in separable phases may be split into one record per phase.

### Deprecated

**When:** Decision no longer valid but hasn't been replaced

**Process:**

1. Update Status to Deprecated with brief explanation
2. Do NOT delete the ADR - historical record is valuable

**Example:**

```markdown
## Status

Deprecated - TMDB added filtering support to list endpoints as of API v4 (2026-03-15)
```

### Superseded

**When:** Decision replaced by a new, different decision

**Process:**

1. Write NEW ADR documenting the new decision
2. Update old ADR status to `Superseded by ADR-XXX`
3. New ADR should reference old one in Context section

**Important:** Never delete deprecated or superseded ADRs - they document system evolution.

---

## Amending Accepted ADRs

An accepted ADR's **decision is final once the change that accepts it merges**: the Context, Decision, and original
Consequences sections then represent the point-in-time record and should not be rewritten. However, strict "never
touch the file" immutability creates practical friction (typos persist, broken links accumulate, implementation
learnings have nowhere to go).

This project uses a three-tier model that preserves the spirit of immutability while accommodating real-world needs:

### Tier 1: Corrections — always permitted

Fix without ceremony. No new ADR required.

- Typos, grammar, and spelling errors
- Broken links and updated file paths
- Formatting fixes (markdown lint, whitespace)
- Correcting factual errors in metadata (dates, names)
- Renumbering an ADR whose number collides with another's, together with the records that cite it by number

**Rule:** The fix must not change the meaning of any section. If you're unsure whether a rewording changes
meaning, treat it as a Tier 2 amendment.

### Tier 2: Amendments — append-only with annotation

Add new information without altering what's already written. Amendments go in the Consequences section (or a
dedicated Amendments section if multiple accumulate) using a dated annotation:

```markdown
**Amendment (YYYY-MM-DD):** In practice, the batch size limit (Consequence #3) has not been
a concern — upstream API raised its limit to 500 in v4.1.
```

**What qualifies:**

- Post-implementation learnings that add context to consequences
- Clarifications prompted by questions from new team members
- Noting that a predicted risk did or did not materialize
- Cross-references to later ADRs or strategy documents

**What doesn't qualify** (use supersession instead):

- Changing the Decision section
- Rewriting Context to present a different framing
- Removing or contradicting original consequences

**Commit note:** Mention the amendment in the commit message (e.g., "amend ADR-007 with production
latency observations").

### Tier 3: Supersession — new ADR

When the decision itself changes, write a new ADR and update the original's status. This is the existing
[Superseded](#superseded) lifecycle process. When only part of the decision changes, the original's status becomes
`Accepted; Superseded in part by ADR-XXX (part)`, and the rest of its decision stands.

### Choosing the right tier

| Change                                      | Tier                                |
| ------------------------------------------- | ----------------------------------- |
| Fix a typo in the Decision section          | Correction                          |
| Update a broken link to an external API doc | Correction                          |
| Note that a predicted risk didn't happen    | Amendment                           |
| Add a cross-reference to a new ADR          | Amendment                           |
| Reword the Decision for clarity             | Amendment (must not change meaning) |
| Change one part of the decision             | Supersession in part                |
| Reverse or significantly alter the decision | Supersession                        |
| Choose a different technology than decided  | Supersession                        |

---

## Template

Use this template when creating new ADRs. Copy from `.arc/reference/adr/adr-template.md`.

```markdown
# ADR-NNN: [Short Title in Present Tense Imperative]

## Status

Proposed

<!-- Valid states:
- Proposed: while the delivering change is unmerged.
- Accepted (YYYY-MM-DD): set in that change before it merges, dated the day of the flip; the record locks at merge.
- Deprecated: the decision is no longer valid and has no replacement.
- Superseded by ADR-XXX: a new ADR replaces the decision.
- Accepted; Superseded in part by ADR-XXX (part): a new ADR replaces the named part; the rest stands.
-->

## Context

Describe the forces at play (technical, business, project constraints) that are probably in tension.
This section should be neutral - just the facts about the problem space.

What is the issue that we're seeing that is motivating this decision or change?

If applicable, mention alternatives that were considered:

- **Option A**: Description and key characteristics
- **Option B**: Description and key characteristics
- **Option C (chosen)**: Description and key characteristics

## Decision

State the decision in full sentences, with active voice.
"We will ..."

Be specific about:

- What is being done
- Who/what is affected
- When this takes effect (if relevant)

This section should be short and definitive.

## Consequences

What becomes easier or more difficult as a result of this decision?
List both positive and negative consequences honestly.

### Positive

- List what improves
- Think about maintainability, clarity, performance, testability
- Consider impact on developers, users, operations

### Negative

- List what becomes harder or what we're giving up
- Be honest about trade-offs
- Consider long-term implications
- Mention increased complexity if relevant

### Risks (optional)

- List any concerns or risks that need monitoring
- Mention follow-up work if required
- Note dependencies on external factors
```

---

## Relationship to Strategy Documents

**Strategy Documents** (`.arc/reference/strategies/strategy-*.md`):

- Synthesized approaches to problem domains
- "How we think about X" (testing, type safety, API integration)
- Extracted from multiple experiences and decisions
- Updated as understanding evolves

**ADRs** (`.arc/reference/adr/adr-*.md`):

- Specific decisions made at a point in time
- "What we chose for X situation"
- Final once the change that accepts them merges
- Raw material that can inform strategies

**Relationship:**

- Multiple related ADRs may reveal patterns worth extracting into a strategy
- Strategy documents often reference ADRs as examples
- Writing ADRs helps identify when a strategy is needed

**Example Pattern:**

1. Write ADR-001 (TMDB discover endpoint), ADR-007 (Rate limiting), ADR-012 (Cache invalidation)
2. Notice pattern: "We keep making decisions about external API integration"
3. Extract: `strategy-api-integration.md` synthesizing principles across multiple ADRs
4. Strategy references specific ADRs as case studies

---

[spec-review]: ../../methods/spec-review.md
