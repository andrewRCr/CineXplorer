# CineXplorer

[![Checks](https://github.com/andrewRCr/CineXplorer/actions/workflows/checks.yml/badge.svg)](https://github.com/andrewRCr/CineXplorer/actions/workflows/checks.yml)

A modern, full-stack movie discovery application built with Django REST Framework and React. CineXplorer helps movie enthusiasts discover films, maintain personal watchlists, and track their viewing history with rich data from The Movie Database (TMDB).

**[Live Demo](https://your-live-demo-url-here.com)** _(Link to be added)_

## 📚 Documentation & Development System

This project showcases a **systematic approach to full-stack development** with comprehensive documentation and structured AI-assisted workflows. **AI is not the default solution** - it's used deliberately and selectively to augment (not replace) core development skills. Detailed documentation is available in **[`_docs/`](_docs/)**.

### **🚀 Quick Start Paths**

**👤 New Developer?** Start here:
1. **[`_docs/README.md`](_docs/README.md)** - Documentation overview and navigation
2. **[`_docs/META-PRD.md`](_docs/META-PRD.md)** - What we're building and why
3. **[`_docs/TECHNICAL-ARCHITECTURE.md`](_docs/TECHNICAL-ARCHITECTURE.md)** - How it's built

**🤖 AI Assistant?** Essential reading:
1. **[`_docs/DEVELOPMENT-RULES.md`](_docs/DEVELOPMENT-RULES.md)** - Non-negotiable development standards
2. **[`_docs/ai-instructions/`](_docs/ai-instructions/)** - AI-specific guidance and context

**🔧 Development Reference?**
- **[`_docs/reference/QUICK-REFERENCE.md`](_docs/reference/QUICK-REFERENCE.md)** - Commands, shortcuts, emergency protocols

### **⚡ Systematic Development Workflows**

The project features a structured 3-step AI-assisted development process:
1. **Feature Planning** → Generate comprehensive Sub-PRDs with systematic requirements gathering
2. **Task Generation** → Break down features into actionable, granular task lists
3. **Task Execution** → Implement with built-in quality gates and approval processes

This approach demonstrates modern AI integration while maintaining professional development standards and human oversight.

## ✨ Key Features

- **Movie Discovery**: Browse, search, and filter movies with advanced controls
- **Personal Collections**: Watchlists and library with drag-and-drop organization
- **User Engagement**: Rate, review, and like movies to build your profile
- **Personalized Recommendations**: "For You" page with tailored suggestions
- **Secure Authentication**: JWT-based auth with OAuth (Google, GitHub) and email verification

## 🎯 Project Purpose

This is a **solo portfolio project** demonstrating professional full-stack development capabilities:

### **Technical Excellence**
- **Full-stack architecture**: Django REST + React TypeScript with comprehensive type safety
- **Production-ready infrastructure**: Docker containerization, reverse proxy, CI/CD pipeline
- **Quality assurance**: Comprehensive testing, linting, type checking with zero-tolerance gates

### **Modern Development Practices**
- **Systematic AI integration**: Structured workflows that augment (not replace) core development skills
- **Documentation-driven development**: Comprehensive specs, task tracking, and progress monitoring
- **Professional workflows**: Atomic commits, code reviews, systematic feature development

### **Portfolio Highlights**
- **Industry-standard patterns**: Authentication, API design, state management, testing methodologies
- **Scalable architecture**: Clean separation of concerns, maintainable codebase, extensible design
- **Process innovation**: Demonstrates thoughtful AI integration in professional development workflows

## Tech Stack

| Category     | Technology                                                         |
| ------------ | ------------------------------------------------------------------ |
| **Frontend** | React, TypeScript, Vite, Chakra UI, React Router, Axios            |
| **Backend**  | Django, Django REST Framework, Django Ninja, django-allauth, Python |
| **Database** | PostgreSQL                                                         |
| **Infra**    | Docker, Docker Compose, Caddy (Reverse Proxy), GitHub Actions (CI) |

## 🚀 Quick Start

**Prerequisites**: Docker, Docker Compose, and a [TMDB API key](https://www.themoviedb.org/settings/api)

```bash
# Clone and setup
git clone https://github.com/andrewRCr/CineXplorer.git
cd CineXplorer

# Configure environment
cp backend/config/.env.example backend/config/.env
# Edit .env with your TMDB_API_KEY and DJANGO_SECRET_KEY

# Run with Docker
docker-compose -f infrastructure/docker-compose.yml up --build
```

**Access**: `https://localhost:8444` (accept self-signed cert warning)

> 💡 **Detailed setup instructions** and development commands are in [`_docs/reference/QUICK-REFERENCE.md`](_docs/reference/QUICK-REFERENCE.md)

### OAuth Setup (Optional)

CineXplorer supports social authentication with Google and GitHub via django-allauth. To enable OAuth in your local development environment:

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth 2.0 Client ID**
5. Configure the OAuth consent screen if prompted
6. Set **Application type** to "Web application"
7. Add authorized redirect URIs:
   - `https://localhost:8444/accounts/google/login/callback/`
8. Copy the **Client ID** and **Client Secret** to your `.env` file:
   ```bash
   GOOGLE_CLIENT_ID='your-google-client-id'
   GOOGLE_CLIENT_SECRET='your-google-client-secret'
   ```

#### GitHub OAuth Setup
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the application details:
   - **Application name**: CineXplorer (Local Dev)
   - **Homepage URL**: `https://localhost:8444`
   - **Authorization callback URL**: `https://localhost:8444/accounts/github/login/callback/`
4. Click **Register application**
5. Copy the **Client ID** and generate a **Client Secret**
6. Add credentials to your `.env` file:
   ```bash
   GITHUB_CLIENT_ID='your-github-client-id'
   GITHUB_CLIENT_SECRET='your-github-client-secret'
   ```

#### Configure Social Apps in Django Admin
After setting up OAuth credentials and starting the application:

1. Navigate to `https://localhost:8444/admin/`
2. Log in with your Django superuser account (create one with `docker-compose exec backend python manage.py createsuperuser`)
3. Under **Social applications**, click **Add social application**
4. For **Google**:
   - Provider: Google
   - Name: Google
   - Client id: (from your `.env`)
   - Secret key: (from your `.env`)
   - Sites: Select `localhost:8444` and move it to "Chosen sites"
5. Repeat for **GitHub**:
   - Provider: GitHub
   - Name: GitHub
   - Client id: (from your `.env`)
   - Secret key: (from your `.env`)
   - Sites: Select `localhost:8444` and move it to "Chosen sites"

OAuth login will now be available at `https://localhost:8444/accounts/google/login/` and `https://localhost:8444/accounts/github/login/`

> **Note**: OAuth is optional for development. Password-based authentication works without any additional setup.

## 📖 Understanding This Project

### **For Employers/Reviewers**
This project demonstrates comprehensive full-stack development skills with modern practices. The **[`_docs/`](_docs/)** directory contains detailed documentation showcasing systematic development processes, architectural decisions, and professional-grade project management.

### **For Developers**
The codebase follows industry best practices with comprehensive documentation. Start with **[`_docs/README.md`](_docs/README.md)** for navigation, then explore the systematic development workflows that showcase modern AI-assisted development while maintaining human oversight and code quality.

### **For AI Researchers/Practitioners**
This project features innovative **AI-assisted development workflows** that maintain professional standards. See **[`_docs/workflows/`](_docs/workflows/)** for the 3-step systematic process and **[`_docs/ai-instructions/`](_docs/ai-instructions/)** for implementation details.
