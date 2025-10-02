# CineXplorer - Shared AI Context

## Project Overview

CineXplorer is a Django REST Framework + React TypeScript movie discovery application that helps users find movies and track what they've watched. This is a **solo developer project** focused on showcasing comprehensive full-stack development skills to prospective employers.

## Key Reference Documents

### 📋 High-Level Documentation

- **`_docs/META-PRD.md`** - Product vision, core features, user flows, and success metrics
- **`_docs/PROJECT-STATUS.md`** - Current progress, completed work, and upcoming priorities
- **`_docs/TECHNICAL-ARCHITECTURE.md`** - Technical architecture, patterns, and implementation details

### 🔄 Development Workflow

- **`_docs/workflows/`** - Systematic approach for feature development:
  1. `1-create-prd.md` - Generate Sub-PRDs for new features
  2. `2-generate-tasks.md` - Create implementation task lists
  3. `3-process-tasks.md` - Task execution and completion protocols

### 📄 Generated Deliverables

- **`_docs/sub-prds/`** - Feature-level PRDs generated from workflow
- **`_docs/tasks/`** - Implementation task lists generated from Sub-PRDs

## Core Project Context

### Technology Stack

- **Backend**: Django 5.2 + DRF, PostgreSQL, JWT authentication
- **Frontend**: React 19 + TypeScript, Chakra UI v3, Vite
- **Infrastructure**: Docker + Docker Compose, Caddy reverse proxy
- **Data Source**: The Movie Database (TMDB) API

### Development Environment

- **Containerized**: All services run in Docker containers
- **SSL-enabled**: HTTPS in development for production parity
- **Monorepo**: Backend, frontend, infrastructure, and shared code
- **Testing**: Comprehensive coverage with backend (Django) + frontend (Vitest) tests

### Key Architectural Patterns

- **Authentication**: JWT tokens in HttpOnly cookies with CSRF protection
- **Error Handling**: Synchronized error codes between backend and frontend
- **State Management**: React Context API + custom hooks
- **API Integration**: Service layer with Axios and custom hooks

### Development Standards

- **Code Quality**: flake8 (backend), ESLint + TypeScript (frontend)
- **Testing**: Required before commits, run with `--keepdb` for backend
- **Feature Branches**: All feature work happens on dedicated branches (`feature/[name]`)
- **Commits**: Conventional commit format, never without explicit user approval
- **Documentation**: High priority for maintainability and employer showcase

### User-Focused Features

- **Movie Discovery**: Browse, search, filter movies from TMDB
- **Personal Tracking**: Watchlists, library (watched movies), favorites
- **User Management**: Registration, authentication, profiles
- **Recommendations**: Personalized "For You" suggestions (planned)

## Development Workflow Integration

When working on new features:

1. **Start with context**: Review META-PRD for product alignment
2. **Use systematic approach**: Follow the 3-step workflow (create Sub-PRD → generate tasks → process tasks)
3. **Work on feature branches**: All feature development happens on dedicated branches
4. **Maintain quality**: Full testing and linting before any commits
5. **Seek approval**: Never commit without explicit user review and permission

## Document Dependencies

When core documents change, also update:

### **META-PRD.md** changes → Update

- `ai-instructions/AI-SHARED.md` (this file)
- Potentially `PROJECT-STATUS.md`

### **DEVELOPMENT-RULES.md** changes → Update

- Version number in the file
- All `ai-instructions/*.md` files

### **TECHNICAL-ARCHITECTURE.md** changes → Update

- `ai-instructions/AI-SHARED.md` (this file)

## Quick Information Lookup

### "How do I...?"

- **Start a new feature** → `workflows/create-prd.md`
- **Break down tasks** → `workflows/generate-tasks.md`
- **Implement tasks** → `workflows/process-tasks.md`
- **Run tests/linting** → `DEVELOPMENT-RULES.md` (Essential Commands)
- **Understand the product** → `META-PRD.md`
- **See current progress** → `PROJECT-STATUS.md`

### "What are the rules for...?"

- **Development standards** → `DEVELOPMENT-RULES.md`
- **Code quality** → `TECHNICAL-ARCHITECTURE.md`
- **Commit format** → `workflows/atomic-commit.md`

## Project Goals

This is a **showcase project** emphasizing:

- **Clean Architecture**: Well-structured, maintainable code
- **Best Practices**: Industry-standard patterns and conventions
- **Comprehensive Testing**: Robust test coverage
- **Professional Documentation**: Clear, thorough documentation
- **Modern Tooling**: Current technologies and development practices

The goal is to demonstrate full-stack development capabilities suitable for professional developer roles.
