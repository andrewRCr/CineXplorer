# GitHub Copilot Instructions

**See `AI-SHARED.md` for comprehensive project context, tech stack, and development standards.**

## Copilot-Specific Guidelines

### Code Completion Context
- **Django REST Framework** backend with modular app structure
- **React + TypeScript** frontend using Chakra UI components
- **Docker-first development** - suggest containerized commands
- **Quality gates required** - always mention testing/linting before commits

### Command Patterns
```bash
# Development
docker-compose -f infrastructure/docker-compose.yml up

# Testing & Linting
docker-compose exec backend python manage.py test --keepdb
docker-compose exec backend flake8 --max-line-length=99 --exclude migrations
docker-compose exec frontend npm run lint && npm run type-check
```

### Code Suggestions
- **Backend**: Follow Django app structure in `backend/apps/`
- **Frontend**: Use Chakra UI components, TypeScript interfaces
- **Always suggest proper error handling and loading states**
- **Reference existing patterns** in codebase before suggesting new approaches

### Key Patterns for Suggestions
- **Error Handling**: Always include loading states and error boundaries
- **TypeScript**: Strict typing for all props, API responses, and state
- **Testing**: Suggest test files alongside new components/functions
- **Accessibility**: Include ARIA labels and semantic HTML in suggestions

> **Note**: Detailed coding standards, architecture, and project context are in `AI-SHARED.md` and `_docs/TECHNICAL-ARCHITECTURE.md`
