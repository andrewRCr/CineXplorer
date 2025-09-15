This is a Django / Django REST Framework / React movie discovery application with TypeScript that helps users find movies and track what they've watched (and want to watch). Docker is used for containerization. Please follow these guidelines when contributing:

## Code Standards

### Starting / Stopping Servers

- Always check if the backend and frontend servers are running before starting new instances.
- Use the VSCode Task 'Stop All Servers (Host)' to stop both backend and frontend servers. Do this before starting new servers to avoid port conflicts.
- Use the VSCode Task 'Start All Servers (Host)' to start both backend and frontend servers, as well as Caddy for reverse proxy HTTPS in development.
- Ensure that no other processes are using the required ports (8000 for backend, 5173 for frontend, 8444 for Caddy) before starting the servers.

### Required Before Each Commit

- Run flake (backend) + eslint (frontend) with the included configuration to ensure code follows project standards
- Make sure all components follow React Router patterns
- When adding new functionality, make sure documentation is updated accordingly
- Make sure that the repository structure documentation is correct and accurate in the Copilot Instructions file
- Ensure all tests pass by running backend (manage.py test) and frontend (pending, coming soon) tests

### Python, TypeScript and React Patterns

- Follow PEP 8 guidelines for Python code
- Use type hints for all functions and methods
- Use Django REST Framework serializers for data validation and transformation
- Use TypeScript interfaces/types for all props and data structures
- Follow React best practices (hooks, functional components)
- Use proper state management techniques
- Components should be modular and follow single-responsibility principle
- Use React Router for navigation and routing
- DRY (Don't Repeat Yourself) principle should be followed to avoid code duplication
- Write unit tests for new features and bug fixes

### Styling

- You should prioritize using Chakra UI CSS classes as much as possible. If needed, you may define custom Chakra UI Classes / Styles. Creating custom CSS should be the last approach. Follow existing styling patterns in the codebase, though suggestions for improvement are welcome.

<!-- ## Development Flow

- Install dependencies: ``
- Development server: ``
- Build: `
- Test: ``
- Lint: `` -->

## Repository Structure

- `backend/`: Django backend with Django REST Framework

  - `backend/apps/`: Contains all Django apps
    - `backend/core/`: Core settings and configurations; shared elements
    - `backend/movie/`: Movie-related app
    - `backend/user/`: User management app
    - `backend/user_movie_data/`: User movie tracking app
  - `config/`: Django project configuration
  - `requirements/`: Python dependency definitions
  - various backend root files: `manage.py`, `Dockerfile`, backend-specific `.env`, `flake8` etc.

- `frontend/`: React frontend with TypeScript

  - `public/`: Static assets (currently unused, but reserved for future use)
  - `frontend/src/`: Source code
    - `frontend/src/assets/`: Images, icons, and other static assets
    - `frontend/src/pages/`: React Router pages
    - `frontend/src/components/`: Reusable React components
    - `frontend/src/constants/`: Application-wide constants
    - `frontend/src/hooks/`: Custom React hooks
    - `frontend/src/services/`: API interaction and business logic
    - `frontend/src/utilities/`: Utility functions
    - various frontend src root files: `App.tsx`, `main.tsx`, `index.css`, etc.
  - various frontend root files: `package.json`, `tsconfig.json`, `vite.config.ts`, frontend-specific `.env`s, etc.

- `infrastructure/`: Infrastructure as code (Docker-Compose, Caddyfile, etc.)

  - `dev-certs/`: Development SSL certificates for Caddy

- `shared/`: Shared resources (e.g., synced error code definitions, etc.)

## Key Guidelines

1. Ensure accessibility standards are met (e.g., proper use of ARIA roles, keyboard navigability)
2. Follow SEO best practices (e.g., proper use of meta tags, semantic HTML)
3. Images should contain meaningful alt text unless they are purely for decoration. If they are for decoration only, a null (empty) alt text should be provided (alt="") so that the images are ignored by the screen reader.
4. Follow React best practices for data fetching, routing, and rendering
5. Use proper error handling and loading states
6. Optimize components and pages for performance
7. Ensure responsiveness and mobile-friendliness
8. Write unit and integration tests for new features and bug fixes
9. Follow security best practices (e.g., input validation, secure authentication)
10. Document your code and update documentation as needed
11. Ensure that all environment variables are properly managed and documented
12. Follow best practices for database design and interactions
13. Ensure that all API interactions are efficient and handle errors gracefully
14. Be careful not to break existing functionality when making changes
