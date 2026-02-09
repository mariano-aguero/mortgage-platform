#!/bin/bash
#==============================================================================
# Initialize LocalStack Resources
#==============================================================================
# Creates all required AWS resources in LocalStack for local development
#
# Usage:
#   ./scripts/init-localstack.sh
#
# Prerequisites:
#   - Docker running
#   - LocalStack container running (docker-compose up -d)
#   - AWS CLI installed
#==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# LocalStack configuration
export AWS_ENDPOINT_URL="http://localhost:4566"
export AWS_DEFAULT_REGION="us-east-1"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"

# Detect AWS CLI availability - use docker exec as fallback
CONTAINER_NAME="localstack-main"

if command -v aws &> /dev/null; then
    # Use local AWS CLI with endpoint override
    awscli() {
        aws --endpoint-url=$AWS_ENDPOINT_URL "$@"
    }
else
    echo -e "${YELLOW}AWS CLI not found locally, using docker exec...${NC}"
    # Use awslocal inside LocalStack container (filter out unsupported flags)
    awscli() {
        local args=()
        for arg in "$@"; do
            case "$arg" in
                --no-cli-pager) ;;  # Skip - not supported by awslocal
                *) args+=("$arg") ;;
            esac
        done
        docker exec $CONTAINER_NAME awslocal "${args[@]}"
    }
fi

# Resource names
PROJECT_NAME="mortgage-platform"
ENVIRONMENT="local"
TABLE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-applications"
BUCKET_NAME="${PROJECT_NAME}-${ENVIRONMENT}-documents"
QUEUE_NAME="${PROJECT_NAME}-${ENVIRONMENT}-queue"
DLQ_NAME="${PROJECT_NAME}-${ENVIRONMENT}-dlq"
EVENT_BUS_NAME="${PROJECT_NAME}-${ENVIRONMENT}-events"
USER_POOL_NAME="${PROJECT_NAME}-${ENVIRONMENT}-users"

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  Initializing LocalStack Resources${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

#==============================================================================
# Check LocalStack is running
#==============================================================================
check_localstack() {
    echo -e "${YELLOW}Checking LocalStack status...${NC}"

    if ! curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
        echo -e "${RED}Error: LocalStack is not running!${NC}"
        echo ""
        echo "Start LocalStack with:"
        echo "  docker-compose up -d"
        echo ""
        echo "Or manually:"
        echo "  docker run -d -p 4566:4566 localstack/localstack"
        exit 1
    fi

    echo -e "${GREEN}LocalStack is running${NC}"
}

#==============================================================================
# Create DynamoDB Table
#==============================================================================
create_dynamodb_table() {
    echo -e "${YELLOW}Creating DynamoDB table: ${TABLE_NAME}...${NC}"

    # Check if table exists
    if awscli dynamodb describe-table \
        --table-name $TABLE_NAME \
        --no-cli-pager > /dev/null 2>&1; then
        echo -e "${GREEN}Table already exists${NC}"
        return
    fi

    awscli dynamodb create-table \
        --table-name $TABLE_NAME \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
            AttributeName=GSI1PK,AttributeType=S \
            AttributeName=GSI1SK,AttributeType=S \
            AttributeName=status,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --global-secondary-indexes \
            '[
                {
                    "IndexName": "GSI1",
                    "KeySchema": [
                        {"AttributeName": "GSI1PK", "KeyType": "HASH"},
                        {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
                },
                {
                    "IndexName": "statusIndex",
                    "KeySchema": [
                        {"AttributeName": "status", "KeyType": "HASH"},
                        {"AttributeName": "SK", "KeyType": "RANGE"}
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                    "ProvisionedThroughput": {"ReadCapacityUnits": 5, "WriteCapacityUnits": 5}
                }
            ]' \
        --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
        --no-cli-pager > /dev/null

    echo -e "${GREEN}DynamoDB table created${NC}"
}

#==============================================================================
# Create S3 Bucket
#==============================================================================
create_s3_bucket() {
    echo -e "${YELLOW}Creating S3 bucket: ${BUCKET_NAME}...${NC}"

    # Check if bucket exists
    if awscli s3api head-bucket \
        --bucket $BUCKET_NAME 2>/dev/null; then
        echo -e "${GREEN}Bucket already exists${NC}"
        return
    fi

    awscli s3 mb s3://$BUCKET_NAME \
        --no-cli-pager > /dev/null

    # Enable CORS for the bucket
    awscli s3api put-bucket-cors \
        --bucket $BUCKET_NAME \
        --cors-configuration '{
            "CORSRules": [{
                "AllowedHeaders": ["*"],
                "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
                "AllowedOrigins": ["*"],
                "ExposeHeaders": ["ETag"]
            }]
        }' \
        --no-cli-pager > /dev/null

    echo -e "${GREEN}S3 bucket created${NC}"
}

#==============================================================================
# Create SQS Queues
#==============================================================================
create_sqs_queues() {
    echo -e "${YELLOW}Creating SQS queues...${NC}"

    # Create DLQ first
    echo "  Creating DLQ: ${DLQ_NAME}..."
    DLQ_URL=$(awscli sqs create-queue \
        --queue-name $DLQ_NAME \
        --attributes '{
            "MessageRetentionPeriod": "1209600"
        }' \
        --no-cli-pager \
        --query 'QueueUrl' --output text 2>/dev/null) || true

    if [ -z "$DLQ_URL" ]; then
        DLQ_URL=$(awscli sqs get-queue-url \
            --queue-name $DLQ_NAME \
            --no-cli-pager \
            --query 'QueueUrl' --output text)
    fi

    DLQ_ARN="arn:aws:sqs:${AWS_REGION}:000000000000:${DLQ_NAME}"

    # Create main queue with DLQ
    echo "  Creating main queue: ${QUEUE_NAME}..."
    QUEUE_URL=$(awscli sqs create-queue \
        --queue-name $QUEUE_NAME \
        --attributes '{
            "VisibilityTimeout": "60",
            "MessageRetentionPeriod": "345600",
            "RedrivePolicy": "{\"deadLetterTargetArn\":\"'"$DLQ_ARN"'\",\"maxReceiveCount\":3}"
        }' \
        --no-cli-pager \
        --query 'QueueUrl' --output text 2>/dev/null) || true

    if [ -z "$QUEUE_URL" ]; then
        QUEUE_URL=$(awscli sqs get-queue-url \
            --queue-name $QUEUE_NAME \
            --no-cli-pager \
            --query 'QueueUrl' --output text)
    fi

    echo -e "${GREEN}SQS queues created${NC}"
    echo "  Queue URL: $QUEUE_URL"
}

#==============================================================================
# Create EventBridge Event Bus
#==============================================================================
create_eventbridge() {
    echo -e "${YELLOW}Creating EventBridge event bus: ${EVENT_BUS_NAME}...${NC}"

    awscli events create-event-bus \
        --name $EVENT_BUS_NAME \
        --no-cli-pager > /dev/null 2>&1 || true

    # Create a rule to forward events to SQS
    awscli events put-rule \
        --name "${PROJECT_NAME}-${ENVIRONMENT}-status-changed" \
        --event-bus-name $EVENT_BUS_NAME \
        --event-pattern '{
            "source": ["mortgage-platform"],
            "detail-type": ["ApplicationStatusChanged"]
        }' \
        --no-cli-pager > /dev/null 2>&1 || true

    echo -e "${GREEN}EventBridge event bus created${NC}"
}

#==============================================================================
# Create Cognito User Pool (simulated)
#==============================================================================
create_cognito() {
    echo -e "${YELLOW}Creating Cognito User Pool...${NC}"

    # Note: LocalStack Community doesn't fully support Cognito
    # We'll create a mock setup for local testing

    USER_POOL_ID=$(awscli cognito-idp create-user-pool \
        --pool-name $USER_POOL_NAME \
        --policies '{
            "PasswordPolicy": {
                "MinimumLength": 8,
                "RequireUppercase": true,
                "RequireLowercase": true,
                "RequireNumbers": true,
                "RequireSymbols": false
            }
        }' \
        --auto-verified-attributes email \
        --username-attributes email \
        --no-cli-pager \
        --query 'UserPool.Id' --output text 2>/dev/null) || true

    if [ -z "$USER_POOL_ID" ] || [ "$USER_POOL_ID" == "None" ]; then
        # List existing pools and get the first one
        USER_POOL_ID=$(awscli cognito-idp list-user-pools \
            --max-results 1 \
            --no-cli-pager \
            --query 'UserPools[0].Id' --output text 2>/dev/null) || USER_POOL_ID="us-east-1_local"
    fi

    echo "  User Pool ID: ${USER_POOL_ID}"

    # Create app client
    APP_CLIENT_ID=$(awscli cognito-idp create-user-pool-client \
        --user-pool-id $USER_POOL_ID \
        --client-name "${PROJECT_NAME}-${ENVIRONMENT}-client" \
        --no-generate-secret \
        --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
        --no-cli-pager \
        --query 'UserPoolClient.ClientId' --output text 2>/dev/null) || APP_CLIENT_ID="local_client"

    echo "  App Client ID: ${APP_CLIENT_ID}"

    # Create user groups
    for group in "Admins" "LoanOfficers"; do
        awscli cognito-idp create-group \
            --user-pool-id $USER_POOL_ID \
            --group-name $group \
            --no-cli-pager > /dev/null 2>&1 || true
    done

    echo -e "${GREEN}Cognito User Pool created${NC}"
}

#==============================================================================
# Generate API .env.local file
#==============================================================================
generate_api_env() {
    echo -e "${YELLOW}Generating packages/api/.env.local file...${NC}"

    QUEUE_URL="http://localhost:4566/000000000000/${QUEUE_NAME}"
    QUEUE_ARN="arn:aws:sqs:${AWS_REGION}:000000000000:${QUEUE_NAME}"

    cat > packages/api/.env.local << EOF
##############################################################################
# Mortgage Platform API - Local Development Environment
##############################################################################
# Generated by init-localstack.sh on $(date)
# This file contains environment variables for local development with LocalStack
##############################################################################

# AWS Region
AWS_REGION=${AWS_REGION}

# DynamoDB Configuration
DYNAMODB_TABLE=${TABLE_NAME}

# S3 Configuration
S3_BUCKET_DOCUMENTS=${BUCKET_NAME}

# SQS Configuration
SQS_QUEUE_URL=${QUEUE_URL}
SQS_QUEUE_ARN=${QUEUE_ARN}

# EventBridge Configuration
EVENT_BUS_NAME=${EVENT_BUS_NAME}

# Cognito Configuration
COGNITO_USER_POOL_ID=${USER_POOL_ID:-us-east-1_local}
COGNITO_APP_CLIENT_ID=${APP_CLIENT_ID:-local_client}
COGNITO_USER_POOL_ARN=arn:aws:cognito-idp:${AWS_REGION}:000000000000:userpool/${USER_POOL_ID:-us-east-1_local}

# Webhook Configuration
WEBHOOK_SECRET=local-webhook-secret-for-testing

# LocalStack Configuration
LOCALSTACK_ENDPOINT=http://localhost:4566
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
EOF

    echo -e "${GREEN}packages/api/.env.local file generated${NC}"
}

#==============================================================================
# Generate frontend .env.local file
#==============================================================================
generate_frontend_env() {
    echo -e "${YELLOW}Generating packages/web/.env.local file...${NC}"

    cat > packages/web/.env.local << EOF
##############################################################################
# Mortgage Platform Frontend - Local Development Environment
##############################################################################
# Generated by init-localstack.sh on $(date)
##############################################################################

# API Configuration (Serverless Offline)
VITE_API_URL=http://localhost:3000

# AWS Region
VITE_AWS_REGION=${AWS_REGION}

# Cognito Configuration
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID:-us-east-1_local}
VITE_COGNITO_APP_CLIENT_ID=${APP_CLIENT_ID:-local_client}
VITE_COGNITO_REGION=${AWS_REGION}

# Environment
VITE_ENVIRONMENT=local

# LocalStack endpoint (for direct AWS calls if needed)
VITE_LOCALSTACK_ENDPOINT=http://localhost:4566

# Skip Cognito authentication (use mock auth for local development)
VITE_SKIP_AUTH=true
EOF

    echo -e "${GREEN}packages/web/.env.local file generated${NC}"
}

#==============================================================================
# Verify resources
#==============================================================================
verify_resources() {
    echo ""
    echo -e "${YELLOW}Verifying created resources...${NC}"
    echo ""

    echo "DynamoDB Tables:"
    awscli dynamodb list-tables \
        --no-cli-pager \
        --query 'TableNames' --output text | tr '\t' '\n' | sed 's/^/  - /'

    echo ""
    echo "S3 Buckets:"
    awscli s3 ls 2>/dev/null | awk '{print "  - " $3}'

    echo ""
    echo "SQS Queues:"
    awscli sqs list-queues \
        --no-cli-pager \
        --query 'QueueUrls' --output text 2>/dev/null | tr '\t' '\n' | sed 's/^/  - /' || echo "  (none)"

    echo ""
    echo "EventBridge Event Buses:"
    awscli events list-event-buses \
        --no-cli-pager \
        --query 'EventBuses[*].Name' --output text 2>/dev/null | tr '\t' '\n' | sed 's/^/  - /' || echo "  (none)"
}

#==============================================================================
# Main
#==============================================================================
main() {
    check_localstack
    echo ""

    create_dynamodb_table
    create_s3_bucket
    create_sqs_queues
    create_eventbridge
    create_cognito

    echo ""
    generate_api_env
    generate_frontend_env

    verify_resources

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  LocalStack Initialization Complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "Resources created:"
    echo "  - DynamoDB Table: ${TABLE_NAME}"
    echo "  - S3 Bucket: ${BUCKET_NAME}"
    echo "  - SQS Queue: ${QUEUE_NAME}"
    echo "  - SQS DLQ: ${DLQ_NAME}"
    echo "  - EventBridge: ${EVENT_BUS_NAME}"
    echo "  - Cognito Pool: ${USER_POOL_ID:-us-east-1_local}"
    echo ""
    echo "Environment files:"
    echo "  - packages/api/.env.local (API)"
    echo "  - packages/web/.env.local (Frontend)"
    echo ""
    echo "Next steps:"
    echo "  1. Seed test data: make seed-local"
    echo "  2. Start backend:  make dev     (Terminal 1)"
    echo "  3. Start frontend: make dev-web (Terminal 2)"
    echo ""
}

main
