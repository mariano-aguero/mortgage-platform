output "aws_region" {
  description = "The AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "The environment"
  value       = var.environment
}

output "project_name" {
  description = "The project name"
  value       = var.project_name
}

output "dynamodb_table_name" {
  description = "The name of the DynamoDB table"
  value       = aws_dynamodb_table.mortgage_applications.name
}

output "dynamodb_table_arn" {
  description = "The ARN of the DynamoDB table"
  value       = aws_dynamodb_table.mortgage_applications.arn
}

output "dynamodb_gsi_arns" {
  description = "The ARNs of the DynamoDB GSIs"
  value = {
    GSI1        = "${aws_dynamodb_table.mortgage_applications.arn}/index/GSI1"
    statusIndex = "${aws_dynamodb_table.mortgage_applications.arn}/index/statusIndex"
  }
}

output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = aws_cognito_user_pool.pool.id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = aws_cognito_user_pool.pool.arn
}

output "app_client_id" {
  description = "The ID of the Cognito App Client"
  value       = aws_cognito_user_pool_client.client.id
}

output "user_pool_endpoint" {
  description = "The endpoint of the Cognito User Pool"
  value       = aws_cognito_user_pool.pool.endpoint
}

# S3 Outputs
output "s3_bucket_documents_name" {
  description = "The name of the S3 bucket for mortgage documents"
  value       = aws_s3_bucket.mortgage_documents.id
}

output "s3_bucket_documents_arn" {
  description = "The ARN of the S3 bucket for mortgage documents"
  value       = aws_s3_bucket.mortgage_documents.arn
}

# SQS Outputs
output "sqs_queue_url" {
  description = "The URL of the main SQS queue"
  value       = aws_sqs_queue.mortgage_application_processing.id
}

output "sqs_queue_arn" {
  description = "The ARN of the main SQS queue"
  value       = aws_sqs_queue.mortgage_application_processing.arn
}

output "sqs_dlq_url" {
  description = "The URL of the dead letter queue"
  value       = aws_sqs_queue.mortgage_application_processing_dlq.id
}

output "sqs_dlq_arn" {
  description = "The ARN of the dead letter queue"
  value       = aws_sqs_queue.mortgage_application_processing_dlq.arn
}

# EventBridge Outputs
output "event_bus_name" {
  description = "The name of the custom EventBridge bus"
  value       = aws_cloudwatch_event_bus.mortgage_events.name
}

output "event_bus_arn" {
  description = "The ARN of the custom EventBridge bus"
  value       = aws_cloudwatch_event_bus.mortgage_events.arn
}

output "event_rule_arn" {
  description = "The ARN of the EventBridge rule"
  value       = aws_cloudwatch_event_rule.application_status_changed.arn
}

# IAM Outputs
output "api_lambda_role_arn" {
  description = "The ARN of the IAM role for the API Lambda"
  value       = aws_iam_role.api_lambda_role.arn
}

output "processor_lambda_role_arn" {
  description = "The ARN of the IAM role for the Processor Lambda"
  value       = aws_iam_role.processor_lambda_role.arn
}
