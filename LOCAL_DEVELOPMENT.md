# Local Development Guide

This guide explains how to set up and run MortgageFlow locally using LocalStack to emulate AWS services.

## Prerequisites

Before starting, ensure you have the following installed:

| Tool | Version | Check Command | Installation |
|------|---------|---------------|--------------|
| Node.js | 20.x+ | `node --version` | [nodejs.org](https://nodejs.org/) |
| pnpm | 8.x+ | `pnpm --version` | `npm install -g pnpm` |
| Docker | 24.x+ | `docker --version` | [docker.com](https://www.docker.com/) |
| AWS CLI | 2.x+ | `aws --version` | [AWS CLI Install](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) |
| jq | 1.6+ | `jq --version` | `brew install jq` (macOS) |

## Quick Start

```bash
# 1. Clone and install dependencies
git clone https://github.com/your-org/mortgage-platform.git
cd mortgage-platform
make install

# 2. Start local environment (LocalStack + seed data)
make dev-local

# 3. Start services (in separate terminals)
make dev      # Terminal 1: API on http://localhost:3000
make dev-web  # Terminal 2: Frontend on http://localhost:5173

# 4. Open http://localhost:5173 in your browser
```

## Step-by-Step Setup

### Step 1: Install Dependencies

```bash
# Install all workspace dependencies
pnpm install

# Build the shared package (required for other packages)
pnpm build:shared
```

This installs dependencies for:
- `packages/shared` - Shared types and schemas
- `packages/api` - Backend API (Serverless)
- `packages/web` - Frontend (React + Vite)

### Step 2: Start LocalStack

LocalStack emulates AWS services locally. Start it with Docker:

```bash
# Start LocalStack container
make local-up

# Verify it's running
make local-status
```

You should see output like:
```json
{
  "services": {
    "dynamodb": "available",
    "s3": "available",
    "sqs": "available",
    "cognito": "available"
  }
}
```

### Step 3: Initialize AWS Resources

Create the required AWS resources in LocalStack:

```bash
make local-init
```

This creates:
- **DynamoDB Table**: `mortgage-platform-local-applications`
- **S3 Bucket**: `mortgage-platform-local-documents`
- **SQS Queue**: `mortgage-platform-local-queue`
- **EventBridge Bus**: `mortgage-platform-local-events`
- **Cognito User Pool**: For authentication

It also generates environment files:
- `packages/api/.env.local`
- `packages/web/.env.local`

### Step 4: Seed Test Data

Populate the database with test users and sample applications:

```bash
make seed-local
```

This creates:

**Test Users (Cognito):**
| Role | Email | Password |
|------|-------|----------|
| Regular User | testuser@example.com | TestUser123! |
| Loan Officer | loanoffice@example.com | LoanOfficer123! |
| Admin | admin@example.com | AdminUser123! |

**Sample Applications (DynamoDB):**
- 4 sample mortgage applications with different statuses

### Step 5: Start the API

In a terminal, start the backend API:

```bash
make dev
```

The API runs on `http://localhost:3000` with these endpoints:
- `GET /health` - Health check
- `GET /applications` - List applications
- `POST /applications` - Create application
- `GET /applications/{id}` - Get application
- `PATCH /applications/{id}/status` - Update status

### Step 6: Start the Frontend

In a **new terminal**, start the frontend:

```bash
make dev-web
```

The frontend runs on `http://localhost:5173`.

### Step 7: Access the Application

Open your browser to `http://localhost:5173` and log in with one of the test credentials.

## Environment Variables

### API Package (`packages/api/.env.local`)

```bash
# AWS Configuration
AWS_REGION=us-east-1
LOCALSTACK_ENDPOINT=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test

# DynamoDB
DYNAMODB_TABLE=mortgage-platform-local-applications

# S3
S3_BUCKET_DOCUMENTS=mortgage-platform-local-documents

# SQS
SQS_QUEUE_URL=http://localhost:4566/000000000000/mortgage-platform-local-queue
SQS_QUEUE_ARN=arn:aws:sqs:us-east-1:000000000000:mortgage-platform-local-queue

# EventBridge
EVENT_BUS_NAME=mortgage-platform-local-events

# Cognito
COGNITO_USER_POOL_ID=us-east-1_local
COGNITO_APP_CLIENT_ID=local_client
COGNITO_USER_POOL_ARN=arn:aws:cognito-idp:us-east-1:000000000000:userpool/us-east-1_local

# Webhooks
WEBHOOK_SECRET=local-webhook-secret-for-testing
```

### Web Package (`packages/web/.env.local`)

```bash
# API URL (Serverless Offline)
VITE_API_URL=http://localhost:3000

# AWS Configuration
VITE_AWS_REGION=us-east-1

# Cognito
VITE_COGNITO_USER_POOL_ID=us-east-1_local
VITE_COGNITO_APP_CLIENT_ID=local_client
VITE_COGNITO_REGION=us-east-1

# Environment
VITE_ENVIRONMENT=local

# LocalStack (optional)
VITE_LOCALSTACK_ENDPOINT=http://localhost:4566
```

## Project Structure

```
mortgage-platform/
├── packages/
│   ├── api/                    # Backend API
│   │   ├── src/
│   │   │   ├── handlers/       # Lambda handlers
│   │   │   ├── services/       # Business logic
│   │   │   ├── models/         # Data models
│   │   │   └── utils/          # Utilities
│   │   ├── .env.local          # Local env vars (generated)
│   │   ├── .env.example        # Example env file
│   │   ├── serverless.yml      # Serverless config
│   │   └── package.json
│   │
│   ├── web/                    # Frontend
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   ├── services/       # API services
│   │   │   └── hooks/          # Custom hooks
│   │   ├── .env.local          # Local env vars (generated)
│   │   ├── .env.example        # Example env file
│   │   └── package.json
│   │
│   └── shared/                 # Shared code
│       ├── src/
│       │   ├── types.ts        # TypeScript types
│       │   ├── schemas.ts      # Zod schemas
│       │   └── index.ts        # Exports
│       └── package.json
│
├── infrastructure/             # Terraform IaC
├── scripts/                    # Deployment scripts
├── docker-compose.yml          # LocalStack config
├── Makefile                    # Build automation
└── pnpm-workspace.yaml         # Monorepo config
```

## Common Commands

| Command | Description |
|---------|-------------|
| `make install` | Install all dependencies |
| `make dev` | Start API server |
| `make dev-web` | Start frontend server |
| `make dev-local` | Full local setup (LocalStack + seed) |
| `make test` | Run all tests |
| `make test-api` | Run API tests only |
| `make test-web` | Run frontend tests only |
| `make lint` | Lint all packages |
| `make local-up` | Start LocalStack |
| `make local-down` | Stop LocalStack |
| `make local-logs` | View LocalStack logs |
| `make local-status` | Check LocalStack health |
| `make local-reset` | Reset LocalStack (delete all data) |
| `make seed-local` | Seed local database |
| `make clean` | Clean build artifacts |

## Troubleshooting

### LocalStack won't start

```bash
# Check if Docker is running
docker ps

# Check if port 4566 is in use
lsof -i :4566

# Reset LocalStack
make local-reset
```

### API returns 500 errors

```bash
# Check LocalStack is running
make local-status

# Check environment variables are set
cat packages/api/.env.local

# Re-initialize resources
make local-init
```

### Frontend can't connect to API

1. Verify API is running on port 3000:
   ```bash
   curl http://localhost:3000/health
   ```

2. Check frontend environment:
   ```bash
   cat packages/web/.env.local | grep VITE_API_URL
   ```

3. Check for CORS errors in browser console

### Tests fail

```bash
# Ensure shared package is built
pnpm build:shared

# Run tests with verbose output
cd packages/api && pnpm test -- --verbose
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use different port
PORT=3001 make dev
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Local Development                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐         ┌─────────────┐                  │
│   │   Browser   │────────▶│   Vite      │                  │
│   │ :5173       │         │   (React)   │                  │
│   └─────────────┘         └──────┬──────┘                  │
│                                  │                          │
│                                  ▼                          │
│   ┌──────────────────────────────────────────────┐         │
│   │            Serverless Offline                 │         │
│   │            http://localhost:3000              │         │
│   │  ┌────────┐ ┌────────┐ ┌────────┐           │         │
│   │  │ Create │ │  Get   │ │ Update │  Lambdas  │         │
│   │  └────────┘ └────────┘ └────────┘           │         │
│   └──────────────────────┬───────────────────────┘         │
│                          │                                  │
│                          ▼                                  │
│   ┌──────────────────────────────────────────────┐         │
│   │              LocalStack :4566                 │         │
│   │  ┌──────────┐ ┌─────┐ ┌─────┐ ┌───────────┐ │         │
│   │  │ DynamoDB │ │ S3  │ │ SQS │ │ Cognito   │ │         │
│   │  └──────────┘ └─────┘ └─────┘ └───────────┘ │         │
│   └──────────────────────────────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Next Steps

Once you have local development working:

1. **Run tests**: `make test`
2. **Check code quality**: `make validate`
3. **Deploy to AWS**: See [README.md](README.md) for deployment instructions
