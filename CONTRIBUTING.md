# Contributing to KhataBox

Thank you for considering contributing to KhataBox. This document outlines the process for contributing to the project.

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Harassment, discrimination, or disrespectful behavior is not tolerated.

---

## How to Report Issues

### Bug Reports

When reporting a bug, include:

- A clear, descriptive title.
- Steps to reproduce the issue (including environment details).
- Expected behavior vs actual behavior.
- Screenshots or logs if applicable.
- Information about your environment (OS, Python version, Node.js version, database).

### Feature Requests

When requesting a feature, include:

- A clear description of the feature and its use case.
- How it would benefit the platform.
- Any relevant examples from other applications.

---

## Development Setup

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker Desktop
- Git

### Setup Steps

```bash
# Fork and clone the repository
git clone https://github.com/your-username/KhataBox.git
cd KhataBox

# Frontend dependencies
npm install

# Backend dependencies (virtual environment recommended)
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows
pip install -r backend/requirements.txt

# Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# Run database migrations
cd backend
alembic upgrade head

# Seed demo data
python seed_india.py

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002

# In a new terminal, start frontend
cd frontend
npm run dev

# Verify
# Open http://localhost:3000
# Login with admin@khatabox.com / Admin@123
```

---

## Coding Conventions

### General

- Follow existing patterns in the codebase. Consistency is preferred over personal preference.
- All new features must include corresponding tests.
- Keep functions focused and single-purpose.
- Use descriptive variable and function names.

### Backend (Python)

- Follow PEP 8 style guidelines.
- Use type hints for all function signatures.
- Async/await for I/O operations (database, HTTP calls, file operations).
- Pydantic v2 schemas for request/response validation.
- Service layer pattern: route handlers are thin; business logic lives in `services/`.
- Organize imports: standard library → third-party → local.

### Frontend (TypeScript/React)

- Use TypeScript — avoid `any` types where possible.
- Server Components by default; Client Components only when interactivity is needed.
- Tailwind CSS for styling — avoid inline styles and separate CSS files.
- Shadcn UI primitives for common components (buttons, inputs, dialogs, tables).
- Zustand for global state (cart, active store).
- `client-api.ts` for HTTP requests — wraps fetch with JWT Bearer token.
- Organize imports: React → Next.js → third-party → local.

### Naming Conventions

| Language | Convention | Example |
|----------|-----------|---------|
| Python files | `snake_case` | `rate_limiter.py` |
| Python classes | `PascalCase` | `class ProductService` |
| Python functions | `snake_case` | `def get_current_user()` |
| TypeScript files | `kebab-case` | `client-api.ts` |
| TypeScript components | `PascalCase` | `RoleGuard.tsx` |
| TypeScript functions | `camelCase` | `requireAuth()` |
| API routes | `snake_case` | `purchase_orders.py` |
| Database tables | `snake_case` | `inventory_movements` |

---

## Pull Request Process

1. **Fork the repository** and create a feature branch from `main`.
2. **Keep changes focused** — one feature or fix per PR.
3. **Write tests** for new functionality and ensure existing tests pass.
4. **Run linting** before submitting:
   ```bash
   cd frontend && npm run lint    # Frontend linting
   cd backend && ruff check .     # Backend linting (if ruff is installed)
   ```
5. **Ensure the frontend builds** without errors:
   ```bash
   cd frontend && npm run build
   ```
6. **Update documentation** if changing public APIs or adding features.
7. **Submit the PR** with a clear description of changes and any related issues.

### PR Title Format

Use conventional commit prefixes:

| Prefix | When to use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `refactor:` | Code restructuring (no functional change) |
| `test:` | Adding or updating tests |
| `chore:` | Build/config changes |
| `perf:` | Performance improvements |
| `security:` | Security fixes |

Example: `feat: add pagination to product list endpoint`

---

## Commit Message Format

```
<type>: <short description>

<optional longer description>
```

- First line max 72 characters.
- Use imperative mood ("add", "fix", not "added", "fixed").
- Reference issues and pull requests where applicable.

Examples:
```
feat: add product image upload to R2 storage
fix: resolve MissingGreenlet error in order creation
docs: update deployment guide with Railway config
test: add integration tests for bulk order creation
```

---

## Testing Guidelines

### Backend Tests

- Tests are in `backend/tests/test_api.py` using pytest.
- Run all tests:
  ```bash
  cd backend
  python -m pytest tests/ -v --tb=short
  ```
- Run a specific test class:
  ```bash
  python -m pytest tests/test_api.py::TestProducts -v
  ```
- Tests require a running PostgreSQL database (from Docker Compose).
- The test fixture starts uvicorn on a random port for integration testing.
- Write tests for:
  - Successful request (200/201)
  - Validation errors (422)
  - Unauthorized access (401)
  - Forbidden access (403)
  - Business logic edge cases (empty cart, insufficient stock, etc.)

### Frontend Tests

- Tests are in `src/test/` using Vitest.
- Run all tests:
  ```bash
  npm test
  ```
- Run in watch mode:
  ```bash
  npm run test:watch
  ```
- Write tests for:
  - Utility functions (`cn()`, formatters)
  - Component rendering (Shadcn UI components)
  - Store logic (Zustand store actions)
  - API client helper methods

---

## Branch Strategy

- `main` — production-ready code.
- Feature branches: `feat/<short-description>`.
- Bug fix branches: `fix/<short-description>`.
- Documentation branches: `docs/<short-description>`.

All PRs should target `main`.

---

## Need Help?

- Open an issue for questions about the codebase.
- Tag maintainers for guidance on complex changes.
- Look at existing PRs and issues for context on project conventions.
