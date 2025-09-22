# CineXplorer

[![Checks](https://github.com/andrewRCr/CineXplorer/actions/workflows/checks.yml/badge.svg)](https://github.com/andrewRCr/CineXplorer/actions/workflows/checks.yml)

A modern, full-stack movie discovery application built with Django REST Framework and React. CineXplorer helps movie enthusiasts discover films, maintain personal watchlists, and track their viewing history with rich data from The Movie Database (TMDB).

**[Live Demo](https://your-live-demo-url-here.com)** _(Link to be added)_

## 📚 Comprehensive Documentation

Detailed project documentation is available in **[`_docs/`](_docs/)**:

- **Product Requirements** - Vision, features, and user flows
- **Technical Architecture** - System design and implementation details
- **Project Status** - Current progress and roadmap
- **Development Workflows** - Selective AI-assisted development processes with quality gates

The `_docs/` directory showcases a structured approach to full-stack development with professional documentation standards and modern AI-assisted workflows.

## ✨ Key Features

- **Movie Discovery**: Browse, search, and filter movies with advanced controls
- **Personal Collections**: Watchlists and library with drag-and-drop organization
- **User Engagement**: Rate, review, and like movies to build your profile
- **Personalized Recommendations**: "For You" page with tailored suggestions
- **Secure Authentication**: JWT-based auth with email verification

## 🎯 Project Purpose

This is a **solo portfolio project** showcasing modern full-stack development with professional standards:

- Comprehensive backend and frontend architecture
- Containerized infrastructure and CI/CD
- Systematic development workflows with AI assistance
- Clean, maintainable, and well-documented code

## Tech Stack

| Category     | Technology                                                         |
| ------------ | ------------------------------------------------------------------ |
| **Frontend** | React, TypeScript, Vite, Chakra UI, React Router, Axios            |
| **Backend**  | Django, Django REST Framework, Python                              |
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

> 💡 **Detailed setup instructions** and development commands are in [`_docs/TECHNICAL-ARCHITECTURE.md`](_docs/TECHNICAL-ARCHITECTURE.md)
