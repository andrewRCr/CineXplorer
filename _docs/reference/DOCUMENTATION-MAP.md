# Documentation Map - CineXplorer

This map shows how all documentation relates and guides you to the right information for your needs.

## Documentation Hierarchy

```
_docs/
├── 📋 CORE FOUNDATION (Start Here)
│   ├── README.md ─────────────────── Entry point and navigation
│   ├── META-PRD.md ──────────────── Product vision, features, success metrics
│   ├── PROJECT-STATUS.md ───────── Current progress and priorities
│   ├── TECHNICAL-ARCHITECTURE.md ── Technical design and patterns
│   └── DEVELOPMENT-RULES.md ──────── Non-negotiable development standards
│
├── 🔄 SYSTEMATIC WORKFLOWS
│   └── workflows/
│       ├── create-prd.md ─────────── Step 1: Feature planning
│       ├── generate-tasks.md ────── Step 2: Task breakdown
│       ├── process-tasks.md ─────── Step 3: Task execution
│       └── atomic-commit.md ─────── Git commit organization
│
├── 📄 GENERATED DELIVERABLES
│   ├── sub-prds/ ──────────────────── Feature specifications
│   └── tasks/ ─────────────────────── Implementation task lists
│
├── 🤖 AI CONFIGURATION
│   └── ai-instructions/
│       ├── AI-SHARED.md ──────────── Complete project context
│       ├── CLAUDE.md ─────────────── Claude Code guidance
│       ├── WARP.md ────────────────── Warp AI guidance
│       └── copilot-instructions.md ── GitHub Copilot guidance
│
├── 📚 REFERENCE MATERIALS
│   └── reference/
│       ├── QUICK-REFERENCE.md ────── Commands and emergency protocols
│       └── DOCUMENTATION-MAP.md ──── This file
│
└── 📊 REPORTS & ARCHIVE
    ├── reports/ ───────────────────── Generated analysis documents
    └── archive/ ───────────────────── Completed work artifacts
```

## Reading Paths by Role

### 👤 **New Team Member** (Human)
1. **Start**: `README.md` → `_docs/README.md`
2. **Product Understanding**: `META-PRD.md` → `PROJECT-STATUS.md`
3. **Technical Context**: `TECHNICAL-ARCHITECTURE.md`
4. **Development Standards**: `DEVELOPMENT-RULES.md`
5. **Quick Reference**: `reference/QUICK-REFERENCE.md`

### 🤖 **AI Assistant** (First Session)
1. **Essential Context**: `DEVELOPMENT-RULES.md` (acknowledge version)
2. **Project Context**: `ai-instructions/AI-SHARED.md`
3. **Tool-Specific**: e.g., `ai-instructions/CLAUDE.md` or `ai-instructions/WARP.md`
4. **Product Alignment**: `META-PRD.md`
5. **Current State**: `PROJECT-STATUS.md`

### 👨‍💻 **Developer Starting New Feature**
1. **Product Alignment**: `META-PRD.md`
2. **Current Priorities**: `PROJECT-STATUS.md`
3. **Feature Planning**: `workflows/create-prd.md`
4. **Task Generation**: `workflows/generate-tasks.md`
5. **Implementation**: `workflows/process-tasks.md`

### 🔧 **Developer Debugging/Maintaining**
1. **Technical Context**: `TECHNICAL-ARCHITECTURE.md`
2. **Quality Standards**: `DEVELOPMENT-RULES.md`
3. **Command Reference**: `reference/QUICK-REFERENCE.md`
4. **Existing Work**: `tasks/` and `sub-prds/`

## Document Relationships

### **Core Foundation** → Informs Everything
- `META-PRD.md` → Guides all feature decisions
- `TECHNICAL-ARCHITECTURE.md` → Informs implementation patterns
- `DEVELOPMENT-RULES.md` → Governs all work processes
- `PROJECT-STATUS.md` → Prioritizes current work

### **Workflows** → Generate Deliverables
- `create-prd.md` → Produces files in `sub-prds/`
- `generate-tasks.md` → Produces files in `tasks/`
- `process-tasks.md` → Updates files in `tasks/`
- `atomic-commit.md` → Organizes code commits

### **AI Instructions** → Reference Core Foundation
- `AI-SHARED.md` → Synthesizes all core docs for AI context
- Tool-specific guides → Reference `DEVELOPMENT-RULES.md`

### **Reference** → Summarizes Everything
- `QUICK-REFERENCE.md` → Distills commands and protocols
- `DOCUMENTATION-MAP.md` → Shows relationships (this file)

## Update Dependencies

When you change these documents, also update:

### **META-PRD.md** changes → Update:
- `ai-instructions/AI-SHARED.md`
- Potentially `PROJECT-STATUS.md`

### **TECHNICAL-ARCHITECTURE.md** changes → Update:
- `ai-instructions/AI-SHARED.md`
- `reference/QUICK-REFERENCE.md` (if commands change)

### **DEVELOPMENT-RULES.md** changes → Update:
- Version number in the file
- All `ai-instructions/*.md` files
- `reference/QUICK-REFERENCE.md`

### **Workflow changes** → Update:
- `ai-instructions/CLAUDE.md`
- `ai-instructions/WARP.md`
- `reference/QUICK-REFERENCE.md`

## Finding Information Quickly

### "How do I...?"
- **Start a new feature** → `workflows/create-prd.md`
- **Break down tasks** → `workflows/generate-tasks.md`
- **Implement tasks** → `workflows/process-tasks.md`
- **Run tests/linting** → `reference/QUICK-REFERENCE.md`
- **Understand the product** → `META-PRD.md`
- **See current progress** → `PROJECT-STATUS.md`

### "What are the rules for...?"
- **Development standards** → `DEVELOPMENT-RULES.md`
- **Code quality** → `TECHNICAL-ARCHITECTURE.md`
- **Commit format** → `workflows/atomic-commit.md`
- **AI behavior** → `ai-instructions/` (tool-specific)

### "Where can I find...?"
- **Commands** → `reference/QUICK-REFERENCE.md`
- **Architecture details** → `TECHNICAL-ARCHITECTURE.md`
- **Feature specs** → `sub-prds/`
- **Task lists** → `tasks/`
- **Emergency protocols** → `reference/QUICK-REFERENCE.md`

## Maintenance Notes

This documentation system is designed to be self-maintaining through the systematic workflows. Key principles:

- **Single source of truth**: Core information lives in one place
- **Clear relationships**: Every document references its dependencies
- **Version awareness**: Critical rules include versioning for consistency
- **Dual audience**: Most documents serve both humans and AI effectively

Regular maintenance involves updating version numbers and ensuring cross-references remain accurate as the system evolves.