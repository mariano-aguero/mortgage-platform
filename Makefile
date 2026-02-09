#==============================================================================
# MortgageFlow - Makefile
#==============================================================================
# Monorepo build and deployment automation
#
# Usage:
#   make help          - Show this help message
#   make install       - Install all dependencies
#   make dev           - Start development servers
#   make deploy-all    - Deploy entire platform
#==============================================================================

.PHONY: help install build test lint format typecheck validate clean \
        dev dev-api dev-web dev-local \
        infra-init infra-plan infra-apply infra-destroy \
        deploy deploy-dev deploy-staging deploy-prod \
        local-up local-down local-init local-logs local-status local-reset \
        seed-data seed-local

# Default target
.DEFAULT_GOAL := help

# Variables
STAGE ?= dev
REGION ?= us-east-1
INFRA_DIR = infrastructure/environments/$(STAGE)

#==============================================================================
# Help
#==============================================================================
help:
	@echo ""
	@echo "MortgageFlow - Monorepo Commands"
	@echo "================================="
	@echo ""
	@echo "Setup & Development:"
	@echo "  make install        - Install all dependencies"
	@echo "  make build          - Build all packages"
	@echo "  make dev            - Start API dev server (serverless offline)"
	@echo "  make dev-web        - Start frontend dev server (Vite)"
	@echo "  make dev-local      - Full local setup with LocalStack"
	@echo ""
	@echo "Quality:"
	@echo "  make test           - Run all tests"
	@echo "  make test-api       - Run API tests only"
	@echo "  make test-web       - Run frontend tests only"
	@echo "  make lint           - Lint all packages"
	@echo "  make format         - Format all packages"
	@echo "  make typecheck      - Type check all packages"
	@echo "  make validate       - Run lint, typecheck, and tests"
	@echo ""
	@echo "Infrastructure (Terraform):"
	@echo "  make infra-init     - Initialize Terraform"
	@echo "  make infra-plan     - Plan infrastructure changes"
	@echo "  make infra-apply    - Apply infrastructure"
	@echo "  make infra-destroy  - Destroy infrastructure"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-dev     - Deploy to dev environment"
	@echo "  make deploy-staging - Deploy to staging environment"
	@echo "  make deploy-prod    - Deploy to production environment"
	@echo "  make deploy-all     - Full deployment (infra + api + web)"
	@echo ""
	@echo "Local Development (LocalStack):"
	@echo "  make local-up       - Start LocalStack container"
	@echo "  make local-down     - Stop LocalStack container"
	@echo "  make local-init     - Initialize LocalStack resources"
	@echo "  make local-logs     - View LocalStack logs"
	@echo "  make local-status   - Check LocalStack health"
	@echo "  make local-reset    - Reset LocalStack data"
	@echo "  make seed-local     - Seed local database with test data"
	@echo ""
	@echo "Utilities:"
	@echo "  make setup-env      - Generate .env files from Terraform"
	@echo "  make seed-data      - Seed database with test data"
	@echo "  make clean          - Clean build artifacts"
	@echo ""
	@echo "Options:"
	@echo "  STAGE=dev|staging|prod|local - Target environment (default: dev)"
	@echo "  REGION=us-east-1             - AWS region (default: us-east-1)"
	@echo ""

#==============================================================================
# Setup & Build
#==============================================================================
install:
	@echo "==> Installing all dependencies..."
	pnpm install
	@echo "==> Building shared package..."
	pnpm build:shared
	@echo "==> Dependencies installed!"

build:
	@echo "==> Building all packages..."
	pnpm build

build-shared:
	@echo "==> Building shared package..."
	pnpm build:shared

build-api:
	@echo "==> Building API package..."
	pnpm build:api

build-web:
	@echo "==> Building web package..."
	pnpm build:web

#==============================================================================
# Quality
#==============================================================================
test:
	@echo "==> Running all tests..."
	pnpm test

test-api:
	@echo "==> Running API tests..."
	pnpm test:api

test-web:
	@echo "==> Running frontend tests..."
	pnpm test:web

test-coverage:
	@echo "==> Running tests with coverage..."
	pnpm test:coverage

lint:
	@echo "==> Linting all packages..."
	pnpm lint

lint-fix:
	@echo "==> Fixing lint issues..."
	pnpm lint:fix

format:
	@echo "==> Formatting all packages..."
	pnpm format

format-check:
	@echo "==> Checking format..."
	pnpm format:check

typecheck:
	@echo "==> Type checking all packages..."
	pnpm typecheck

validate: lint typecheck test
	@echo "==> All validations passed!"

#==============================================================================
# Development
#==============================================================================
dev:
	@echo "==> Starting API development server..."
	cd packages/api && pnpm dev

dev-api: dev

dev-web:
	@echo "==> Starting frontend development server..."
	cd packages/web && pnpm dev

dev-all:
	@echo "==> Starting all services..."
	@echo "Run in separate terminals:"
	@echo "  Terminal 1: make dev     (API on :3000)"
	@echo "  Terminal 2: make dev-web (Frontend on :5173)"

#==============================================================================
# Infrastructure (Terraform)
#==============================================================================
infra-init:
	@echo "==> Initializing Terraform for $(STAGE)..."
	cd $(INFRA_DIR) && terraform init

infra-plan:
	@echo "==> Planning infrastructure changes for $(STAGE)..."
	cd $(INFRA_DIR) && terraform plan

infra-apply:
	@echo "==> Applying infrastructure for $(STAGE)..."
	cd $(INFRA_DIR) && terraform apply -auto-approve
	@echo "==> Infrastructure deployed. Run 'make setup-env' to generate .env files."

infra-destroy:
	@echo "==> Destroying infrastructure for $(STAGE)..."
	@echo "WARNING: This will delete all resources including data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	cd $(INFRA_DIR) && terraform destroy -auto-approve

infra-output:
	@cd $(INFRA_DIR) && terraform output -json

#==============================================================================
# Deployment
#==============================================================================
deploy-dev:
	@echo "==> Deploying to dev..."
	cd packages/api && pnpm deploy:dev

deploy-staging:
	@echo "==> Deploying to staging..."
	cd packages/api && pnpm deploy:staging

deploy-prod:
	@echo "==> Deploying to production..."
	@echo "WARNING: This will deploy to production!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	cd packages/api && pnpm deploy:prod

deploy-all: infra-apply setup-env deploy-dev build-web
	@echo ""
	@echo "=============================================="
	@echo "  Deployment Complete!"
	@echo "=============================================="
	@echo ""
	@echo "Next steps:"
	@echo "  1. Deploy frontend to S3/CloudFront"
	@echo "  2. Seed test data: make seed-data"
	@echo "  3. Check API: make api-info"
	@echo ""

api-info:
	@echo "==> API info for $(STAGE)..."
	cd packages/api && pnpm info

api-logs:
	@echo "==> Fetching logs for $(STAGE)..."
	cd packages/api && pnpm logs

api-remove:
	@echo "==> Removing API from $(STAGE)..."
	cd packages/api && pnpm remove

#==============================================================================
# Local Development (LocalStack)
#==============================================================================
local-up:
	@echo "==> Starting LocalStack..."
	docker-compose up -d
	@echo "==> Waiting for LocalStack to be ready..."
	@sleep 5
	@until curl -s http://localhost:4566/_localstack/health | grep -q '"dynamodb": "available"'; do \
		echo "Waiting for LocalStack..."; \
		sleep 2; \
	done
	@echo "==> LocalStack is ready!"

local-down:
	@echo "==> Stopping LocalStack..."
	docker-compose down

local-init: local-up
	@echo "==> Initializing LocalStack resources..."
	@chmod +x scripts/init-localstack.sh
	@./scripts/init-localstack.sh

local-logs:
	@echo "==> Showing LocalStack logs..."
	docker-compose logs -f localstack

local-status:
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║              MortgageFlow - Local Environment                ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "┌──────────────────────────────────────────────────────────────┐"
	@echo "│ LocalStack (AWS Services)                                    │"
	@echo "├──────────────────────────────────────────────────────────────┤"
	@if curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then \
		echo "│ Status:  ✅ Running                                          │"; \
		echo "│ URL:     http://localhost:4566                               │"; \
		echo "│ Services: DynamoDB, S3, SQS, Cognito, EventBridge            │"; \
	else \
		echo "│ Status:  ❌ Not running                                       │"; \
		echo "│ Start:   make local-up                                       │"; \
	fi
	@echo "└──────────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "┌──────────────────────────────────────────────────────────────┐"
	@echo "│ API (Backend)                                                │"
	@echo "├──────────────────────────────────────────────────────────────┤"
	@if curl -s http://localhost:3000/health > /dev/null 2>&1; then \
		echo "│ Status:  ✅ Running                                          │"; \
		echo "│ URL:     http://localhost:3000                               │"; \
		echo "│ Health:  http://localhost:3000/health                        │"; \
		echo "│ Docs:    GET /applications, POST /applications, etc.         │"; \
	else \
		echo "│ Status:  ❌ Not running                                       │"; \
		echo "│ Start:   make dev                                            │"; \
	fi
	@echo "└──────────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "┌──────────────────────────────────────────────────────────────┐"
	@echo "│ Frontend (React App)                                         │"
	@echo "├──────────────────────────────────────────────────────────────┤"
	@if curl -s http://localhost:5173 > /dev/null 2>&1; then \
		echo "│ Status:  ✅ Running                                          │"; \
		echo "│ URL:     http://localhost:5173                               │"; \
		echo "│ Open in browser to access the application                    │"; \
	else \
		echo "│ Status:  ❌ Not running                                       │"; \
		echo "│ Start:   make dev-web                                        │"; \
	fi
	@echo "└──────────────────────────────────────────────────────────────┘"
	@echo ""
	@echo "┌──────────────────────────────────────────────────────────────┐"
	@echo "│ Test Credentials                                             │"
	@echo "├──────────────────────────────────────────────────────────────┤"
	@echo "│ User:         testuser@example.com / TestUser123!            │"
	@echo "│ Loan Officer: loanoffice@example.com / LoanOfficer123!       │"
	@echo "│ Admin:        admin@example.com / AdminUser123!              │"
	@echo "└──────────────────────────────────────────────────────────────┘"
	@echo ""

local-reset: local-down
	@echo "==> Resetting LocalStack data..."
	rm -rf .localstack
	$(MAKE) local-init

seed-local:
	@echo "==> Seeding local database..."
	@chmod +x scripts/seed-data.sh
	@./scripts/seed-data.sh local

dev-local: local-init seed-local
	@echo ""
	@echo "=============================================="
	@echo "  Local Environment Ready!"
	@echo "=============================================="
	@echo ""
	@echo "Start the services in separate terminals:"
	@echo "  Terminal 1: make dev     (API on :3000)"
	@echo "  Terminal 2: make dev-web (Frontend on :5173)"
	@echo ""
	@echo "Test credentials:"
	@echo "  testuser@example.com / TestUser123!"
	@echo "  loanoffice@example.com / LoanOfficer123!"
	@echo "  admin@example.com / AdminUser123!"
	@echo ""

#==============================================================================
# Environment Setup
#==============================================================================
setup-env:
	@echo "==> Generating .env files from Terraform outputs..."
	@chmod +x scripts/setup-env.sh
	@./scripts/setup-env.sh $(STAGE)
	@echo "==> Environment files generated!"

seed-data:
	@echo "==> Seeding database with test data..."
	@chmod +x scripts/seed-data.sh
	@./scripts/seed-data.sh $(STAGE)
	@echo "==> Test data seeded!"

#==============================================================================
# Cleanup
#==============================================================================
clean:
	@echo "==> Cleaning build artifacts..."
	pnpm clean
	rm -rf .serverless
	rm -rf coverage
	rm -rf packages/*/dist
	rm -rf packages/*/coverage
	rm -rf packages/*/.serverless
	@echo "==> Clean complete!"

clean-all: clean
	@echo "==> Removing all node_modules..."
	rm -rf node_modules
	rm -rf packages/*/node_modules
	@echo "==> Full clean complete!"

#==============================================================================
# CI/CD Helpers
#==============================================================================
ci-install:
	@echo "==> Installing dependencies for CI..."
	pnpm install --frozen-lockfile

ci-build: build

ci-test: test

ci-lint: lint

ci-typecheck: typecheck

ci-validate: validate

ci-deploy: deploy-dev
	@echo "==> CI deploy complete!"
