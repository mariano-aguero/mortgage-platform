#!/bin/bash
#==============================================================================
# Seed Data Script
#==============================================================================
# Creates test users in Cognito and inserts sample applications in DynamoDB
#
# Usage:
#   ./scripts/seed-data.sh [stage]
#
# Examples:
#   ./scripts/seed-data.sh dev
#   ./scripts/seed-data.sh local
#==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Container name for docker exec fallback
CONTAINER_NAME="localstack-main"

# Configuration
STAGE="${1:-dev}"
INFRA_DIR="infrastructure/environments/${STAGE}"

echo -e "${BLUE}==> Seeding data for stage: ${STAGE}${NC}"

#==============================================================================
# Get infrastructure values
#==============================================================================
get_infra_values() {
    echo -e "${YELLOW}Fetching infrastructure values...${NC}"

    if [ "$STAGE" = "local" ]; then
        # LocalStack configuration
        export AWS_ENDPOINT_URL="http://localhost:4566"
        export AWS_DEFAULT_REGION="us-east-1"
        export AWS_REGION="us-east-1"
        export AWS_ACCESS_KEY_ID="test"
        export AWS_SECRET_ACCESS_KEY="test"

        # Try to read from packages/api/.env.local first
        if [ -f "packages/api/.env.local" ]; then
            source "packages/api/.env.local"
        else
            # Fallback defaults
            export DYNAMODB_TABLE="mortgage-platform-local-applications"
            export USER_POOL_ID="us-east-1_local"
            export APP_CLIENT_ID="local_client"
        fi

        # Verify LocalStack is running
        if ! curl -s http://localhost:4566/_localstack/health > /dev/null 2>&1; then
            echo -e "${RED}Error: LocalStack is not running!${NC}"
            echo "Start it with: make local-up"
            exit 1
        fi

        # Set up awscli function - use docker exec if aws CLI not available
        if command -v aws &> /dev/null; then
            awscli() {
                aws --endpoint-url=$AWS_ENDPOINT_URL "$@"
            }
        else
            echo -e "${YELLOW}AWS CLI not found locally, using docker exec...${NC}"
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
    else
        # Get from Terraform
        if [ -d "$INFRA_DIR" ]; then
            cd "$INFRA_DIR"
            TERRAFORM_OUTPUT=$(terraform output -json 2>/dev/null)
            cd - > /dev/null

            export AWS_REGION=$(echo "$TERRAFORM_OUTPUT" | jq -r '.aws_region.value // "us-east-1"')
            export DYNAMODB_TABLE=$(echo "$TERRAFORM_OUTPUT" | jq -r '.dynamodb_table_name.value')
            export USER_POOL_ID=$(echo "$TERRAFORM_OUTPUT" | jq -r '.user_pool_id.value')
            export APP_CLIENT_ID=$(echo "$TERRAFORM_OUTPUT" | jq -r '.app_client_id.value')
        else
            # Try to read from .env file
            if [ -f ".env.${STAGE}" ]; then
                source ".env.${STAGE}"
            else
                echo -e "${RED}Error: Could not find infrastructure values.${NC}"
                echo "Run 'make infra-apply STAGE=${STAGE}' first."
                exit 1
            fi
        fi

        # For non-local stages, use regular AWS CLI
        awscli() {
            aws "$@"
        }
    fi

    echo -e "${GREEN}Infrastructure values loaded${NC}"
    echo "  Region: ${AWS_REGION}"
    echo "  DynamoDB Table: ${DYNAMODB_TABLE}"
    echo "  User Pool ID: ${USER_POOL_ID}"
    if [ -n "$AWS_ENDPOINT_URL" ]; then
        echo "  Endpoint: ${AWS_ENDPOINT_URL} (LocalStack)"
    fi
}

#==============================================================================
# Create test users in Cognito
#==============================================================================
create_test_users() {
    echo -e "${YELLOW}Creating test users in Cognito...${NC}"

    # Test user data: email|password|group
    local test_users=(
        "testuser@example.com|TestUser123!|"
        "loanoffice@example.com|LoanOfficer123!|LoanOfficers"
        "admin@example.com|AdminUser123!|Admins"
    )

    for user_data in "${test_users[@]}"; do
        IFS='|' read -r email password group <<< "$user_data"

        echo "  Creating user: ${email}..."

        # Create user (admin-create-user)
        awscli cognito-idp admin-create-user \
            --user-pool-id "$USER_POOL_ID" \
            --username "$email" \
            --user-attributes Name=email,Value="$email" Name=email_verified,Value=true \
            --temporary-password "$password" \
            --message-action SUPPRESS \
            --region "$AWS_REGION" \
            --no-cli-pager 2>/dev/null || true

        # Set permanent password
        awscli cognito-idp admin-set-user-password \
            --user-pool-id "$USER_POOL_ID" \
            --username "$email" \
            --password "$password" \
            --permanent \
            --region "$AWS_REGION" \
            --no-cli-pager 2>/dev/null || true

        # Add to group if specified
        if [ -n "$group" ]; then
            echo "    Adding to group: ${group}..."

            # Create group if it doesn't exist
            awscli cognito-idp create-group \
                --user-pool-id "$USER_POOL_ID" \
                --group-name "$group" \
                --region "$AWS_REGION" \
                --no-cli-pager 2>/dev/null || true

            # Add user to group
            awscli cognito-idp admin-add-user-to-group \
                --user-pool-id "$USER_POOL_ID" \
                --username "$email" \
                --group-name "$group" \
                --region "$AWS_REGION" \
                --no-cli-pager 2>/dev/null || true
        fi

        echo -e "    ${GREEN}Created: ${email}${NC}"
    done

    echo -e "${GREEN}Test users created successfully${NC}"
    echo ""
    echo "Test credentials:"
    echo "  Regular User:  testuser@example.com / TestUser123!"
    echo "  Loan Officer:  loanoffice@example.com / LoanOfficer123!"
    echo "  Admin:         admin@example.com / AdminUser123!"
}

#==============================================================================
# Insert sample applications in DynamoDB
#==============================================================================
insert_sample_applications() {
    echo -e "${YELLOW}Inserting sample applications in DynamoDB...${NC}"

    local NOW=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    local USER_ID="user-seed-$(date +%s)"

    # Sample applications
    local apps=(
        "app-demo-001|SUBMITTED|John|Doe|john.doe@example.com|75000|123 Main St, New York, NY 10001|Single Family|400000|320000|Conventional|20"
        "app-demo-002|UNDER_REVIEW|Jane|Smith|jane.smith@example.com|95000|456 Oak Ave, Los Angeles, CA 90001|Condo|350000|280000|FHA|20"
        "app-demo-003|APPROVED|Robert|Johnson|robert.j@example.com|125000|789 Pine Rd, Chicago, IL 60601|Townhouse|500000|400000|VA|20"
        "app-demo-004|DRAFT|Emily|Brown|emily.b@example.com|85000|321 Elm St, Houston, TX 77001|Multi-Family|450000|360000|Jumbo|20"
    )

    for app_data in "${apps[@]}"; do
        IFS='|' read -r app_id status first_name last_name email income address prop_type value amount loan_type down_pct <<< "$app_data"

        echo "  Inserting application: ${app_id} (${status})..."

        awscli dynamodb put-item \
            --table-name "$DYNAMODB_TABLE" \
            --item '{
                "PK": {"S": "APP#'"$app_id"'"},
                "SK": {"S": "METADATA"},
                "GSI1PK": {"S": "USER#'"$USER_ID"'"},
                "GSI1SK": {"S": "APP#'"$app_id"'"},
                "applicationId": {"S": "'"$app_id"'"},
                "userId": {"S": "'"$USER_ID"'"},
                "status": {"S": "'"$status"'"},
                "borrowerInfo": {"M": {
                    "firstName": {"S": "'"$first_name"'"},
                    "lastName": {"S": "'"$last_name"'"},
                    "email": {"S": "'"$email"'"},
                    "phone": {"S": "(555) 123-4567"},
                    "ssnLast4": {"S": "1234"},
                    "annualIncome": {"N": "'"$income"'"},
                    "employmentStatus": {"S": "Employed"},
                    "employer": {"S": "Demo Company Inc"}
                }},
                "propertyInfo": {"M": {
                    "address": {"S": "'"$address"'"},
                    "type": {"S": "'"$prop_type"'"},
                    "estimatedValue": {"N": "'"$value"'"},
                    "loanAmount": {"N": "'"$amount"'"},
                    "loanType": {"S": "'"$loan_type"'"},
                    "downPaymentPercentage": {"N": "'"$down_pct"'"}
                }},
                "createdAt": {"S": "'"$NOW"'"},
                "updatedAt": {"S": "'"$NOW"'"},
                "entityType": {"S": "APPLICATION"}
            }' \
            --region "$AWS_REGION" \
            --no-cli-pager 2>/dev/null || {
                echo -e "    ${YELLOW}Skipped (may already exist)${NC}"
                continue
            }

        echo -e "    ${GREEN}Inserted: ${app_id}${NC}"
    done

    echo -e "${GREEN}Sample applications inserted successfully${NC}"
}

#==============================================================================
# Verify data
#==============================================================================
verify_data() {
    echo -e "${YELLOW}Verifying seeded data...${NC}"

    # Count applications
    local count=$(awscli dynamodb scan \
        --table-name "$DYNAMODB_TABLE" \
        --select COUNT \
        --region "$AWS_REGION" \
        --no-cli-pager 2>/dev/null | jq -r '.Count // 0')

    echo -e "${GREEN}Total applications in database: ${count}${NC}"

    # List users
    echo ""
    echo "Cognito users:"
    awscli cognito-idp list-users \
        --user-pool-id "$USER_POOL_ID" \
        --region "$AWS_REGION" \
        --no-cli-pager 2>/dev/null | jq -r '.Users[].Username' | while read user; do
            echo "  - $user"
        done
}

#==============================================================================
# Main
#==============================================================================
main() {
    echo ""
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}  Mortgage Platform - Seed Data${NC}"
    echo -e "${BLUE}================================================${NC}"
    echo ""

    # Check prerequisites
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed.${NC}"
        exit 1
    fi

    # For non-local stages, AWS CLI is required
    if [ "$STAGE" != "local" ] && ! command -v aws &> /dev/null; then
        echo -e "${RED}Error: AWS CLI is required for non-local stages.${NC}"
        exit 1
    fi

    get_infra_values

    echo ""
    read -p "Create test users in Cognito? [Y/n] " create_users
    if [[ ! "$create_users" =~ ^[Nn]$ ]]; then
        create_test_users
    fi

    echo ""
    read -p "Insert sample applications in DynamoDB? [Y/n] " insert_apps
    if [[ ! "$insert_apps" =~ ^[Nn]$ ]]; then
        insert_sample_applications
    fi

    echo ""
    verify_data

    echo ""
    echo -e "${GREEN}================================================${NC}"
    echo -e "${GREEN}  Seed Data Complete!${NC}"
    echo -e "${GREEN}================================================${NC}"
    echo ""
    echo "You can now:"
    echo "  1. Login with test credentials in the frontend"
    echo "  2. View sample applications in the dashboard"
    echo "  3. Test status changes as a loan officer"
    echo ""
}

main
