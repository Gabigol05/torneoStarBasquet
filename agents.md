# TorneoStar AI Subagents Architecture

## Why Subagents?
In modern Fullstack applications, managing both the Frontend and Backend simultaneously can become complex. We use a **Subagent Architecture** to enable parallel development, enforce separation of concerns, and maintain a clean codebase. 

Instead of relying on a single AI context to handle everything, we deploy specialized, autonomous agents that focus exclusively on their domain. This prevents code cross-contamination (e.g., confusing Django logic with React logic) and significantly speeds up development.

## The Team

### 1. Orchestrator (Primary Assistant)
- **Role:** High-level architect and project manager.
- **Responsibility:** Communicates with the human developer, plans the overall architecture, reviews the codebase, and delegates specific atomic tasks to the specialized subagents.

### 2. `django_backend_dev`
- **Role:** Senior Django Backend Developer.
- **Workspace:** `./Backend` directory.
- **Responsibility:** Fully autonomous agent responsible for configuring Django REST Framework, defining database models (Tournaments, Teams, Players, Matches), and building the API endpoints (e.g., `?categoria=masculino`).

### 3. `react_frontend_dev`
- **Role:** Senior React UI/UX Developer.
- **Workspace:** `./FrontEnd` directory.
- **Responsibility:** Builds responsive and highly aesthetic UI components using React, Vite, and Vanilla CSS with CSS Variables for theming. Connects the UI to the backend APIs.

### 4. `qa_tester`
- **Role:** Quality Assurance & Testing Engineer.
- **Workspace:** Entire project.
- **Responsibility:** Writes comprehensive unit and integration tests (using `pytest` for Python and `Vitest` for React) in the background. Ensures the API and UI critical paths remain stable as the application scales.

---
*Note: These agents are injected dynamically into the system's memory via the IDE's internal API (`define_subagent`) during active development sessions. This document serves purely as an architectural map for human developers and future context.*
