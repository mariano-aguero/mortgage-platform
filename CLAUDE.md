# MortgageFlow - Claude Code Guidelines

This file provides context and guidelines for Claude Code when working on the MortgageFlow platform.

## Project Overview

MortgageFlow is a serverless mortgage application platform built with:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Node.js + TypeScript + AWS Lambda + Serverless Framework
- **Database**: DynamoDB (single-table design)
- **Auth**: Amazon Cognito
- **Infrastructure**: Terraform
- **Event-driven**: EventBridge + SQS

## Monorepo Structure

```
mortgage-platform/
├── packages/
│   ├── shared/          # @mortgage-platform/shared - Types & schemas
│   ├── api/             # @mortgage-platform/api - Backend Lambda functions
│   └── web/             # @mortgage-platform/web - React frontend
├── infrastructure/      # Terraform IaC
├── scripts/             # Deployment & utility scripts
└── Makefile             # Build automation
```

## Language & Code Standards

**MANDATORY**: All code, comments, documentation, variable names, function names, and commit messages must be in **English**.

## Code Style

### TypeScript
- Strict mode enabled (`noUncheckedIndexedAccess`, `noImplicitReturns`, etc.)
- Use explicit types, avoid `any`
- Use Zod for runtime validation
- Use path aliases (`@handlers/*`, `@services/*`, etc.)

### React (Frontend)
- Functional components with hooks
- Use `react-hook-form` with Zod for forms
- Tailwind CSS for styling (no inline styles)
- Accessible components (ARIA labels, keyboard navigation)

### AWS Lambda (Backend)
- Single responsibility per handler
- Use `@utils/response` for consistent API responses
- Log with structured JSON (`@utils/logger`)
- Handle errors gracefully with proper status codes

## Architecture Patterns

### Single-Table DynamoDB Design
```
PK: APP#<applicationId>     SK: METADATA          → Application data
PK: APP#<applicationId>     SK: HISTORY#<date>    → Status history
GSI1PK: USER#<userId>       GSI1SK: APP#<appId>   → User's applications
```

### Event-Driven Processing
```
Lambda → EventBridge → SQS → Lambda (processor)
```

### Status State Machine
Valid transitions are defined in `@mortgage-platform/shared`:
```
DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/DENIED
```

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ApplicationCard.tsx` |
| Hooks | camelCase with `use` prefix | `useApplications.ts` |
| Utils | camelCase | `formatCurrency.ts` |
| Types | PascalCase | `MortgageApplication.ts` |
| Tests | Same as file + `.test.ts` | `validators.test.ts` |
| Lambda handlers | camelCase | `createApplication.ts` |

## Common Commands

```bash
# Install dependencies
make install

# Local development
make dev-local     # Start LocalStack + seed data
make dev           # Start API (port 3000)
make dev-web       # Start frontend (port 5173)

# Testing
make test          # Run all tests
make test-api      # API tests only
make test-web      # Frontend tests only

# Quality
make lint          # Lint all packages
make typecheck     # Type check all packages
make validate      # Lint + typecheck + test

# Deployment
make deploy-dev    # Deploy to dev
make deploy-prod   # Deploy to production
```

## API Response Format

All API responses follow this structure:

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": [...]
  }
}
```

## Environment Variables

Environment variables are stored per-package:
- `packages/api/.env.local` - Backend variables
- `packages/web/.env.local` - Frontend variables (prefixed with `VITE_`)

Run `make local-init` to auto-generate these files.

## Testing Guidelines

### Backend (Jest)
- Colocate tests with source files (`*.test.ts`)
- Mock AWS services in tests
- Use `jest.setup.ts` for common mocks

### Frontend (Vitest)
- Tests in `src/test/` directory
- Use Testing Library for component tests
- Mock API calls with MSW or manual mocks

## Git Workflow

### Commit Messages
Follow Conventional Commits:
```
feat: add loan officer dashboard
fix: resolve date formatting in application list
docs: update API documentation
refactor: extract validation logic to shared package
```

### Branch Naming
```
feature/add-document-upload
fix/status-transition-bug
refactor/extract-shared-types
```

## Security Considerations

- Never commit secrets or credentials
- Use SSM Parameter Store for production secrets
- Validate all user input with Zod
- Follow least privilege for IAM roles
- Sanitize data before rendering in frontend

## Performance Guidelines

- Use DynamoDB GSIs for access patterns
- Implement pagination for list endpoints
- Lazy load heavy components in frontend
- Use React Query for caching API responses

## Accessibility Requirements

- All interactive elements must be keyboard accessible
- Use semantic HTML elements
- Provide ARIA labels for icons and non-text content
- Ensure sufficient color contrast
- Support screen readers

## When Making Changes

1. **Read before editing** - Always read relevant files before making changes
2. **Follow existing patterns** - Match the style of surrounding code
3. **Update tests** - Add or update tests for changed functionality
4. **Run validation** - Execute `make validate` before committing
5. **Keep it simple** - Avoid over-engineering; solve the current problem

## Key Files Reference

| Purpose | Location |
|---------|----------|
| Shared types | `packages/shared/src/types.ts` |
| Zod schemas | `packages/shared/src/schemas.ts` |
| API handlers | `packages/api/src/handlers/` |
| DynamoDB service | `packages/api/src/services/dynamoService.ts` |
| React components | `packages/web/src/components/` |
| API client | `packages/web/src/services/api.ts` |
| Terraform modules | `infrastructure/modules/core/` |
| Deployment scripts | `scripts/` |

## Resources

- [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md) - Local setup guide
- [README.md](README.md) - Project documentation
- [Makefile](Makefile) - Available commands
