output "aws_region" {
  description = "The AWS region"
  value       = module.core.aws_region
}

output "environment" {
  description = "The environment"
  value       = module.core.environment
}

output "project_name" {
  description = "The project name"
  value       = module.core.project_name
}

output "dynamodb_table_name" {
  description = "The name of the DynamoDB table"
  value       = module.core.dynamodb_table_name
}

output "dynamodb_table_arn" {
  description = "The ARN of the DynamoDB table"
  value       = module.core.dynamodb_table_arn
}

output "dynamodb_gsi_arns" {
  description = "The ARNs of the DynamoDB GSIs"
  value       = module.core.dynamodb_gsi_arns
}

output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = module.core.user_pool_id
}

output "user_pool_arn" {
  description = "The ARN of the Cognito User Pool"
  value       = module.core.user_pool_arn
}

output "app_client_id" {
  description = "The ID of the Cognito App Client"
  value       = module.core.app_client_id
}

output "user_pool_endpoint" {
  description = "The endpoint of the Cognito User Pool"
  value       = module.core.user_pool_endpoint
}

output "s3_bucket_documents_name" {
  description = "The name of the S3 bucket for mortgage documents"
  value       = module.core.s3_bucket_documents_name
}

output "s3_bucket_documents_arn" {
  description = "The ARN of the S3 bucket for mortgage documents"
  value       = module.core.s3_bucket_documents_arn
}

output "sqs_queue_url" {
  description = "The URL of the main SQS queue"
  value       = module.core.sqs_queue_url
}

output "sqs_queue_arn" {
  description = "The ARN of the main SQS queue"
  value       = module.core.sqs_queue_arn
}

output "sqs_dlq_url" {
  description = "The URL of the dead letter queue"
  value       = module.core.sqs_dlq_url
}

output "sqs_dlq_arn" {
  description = "The ARN of the dead letter queue"
  value       = module.core.sqs_dlq_arn
}

output "event_bus_name" {
  description = "The name of the custom EventBridge bus"
  value       = module.core.event_bus_name
}

output "event_bus_arn" {
  description = "The ARN of the custom EventBridge bus"
  value       = module.core.event_bus_arn
}

output "event_rule_arn" {
  description = "The ARN of the EventBridge rule"
  value       = module.core.event_rule_arn
}

output "api_lambda_role_arn" {
  description = "The ARN of the IAM role for the API Lambda"
  value       = module.core.api_lambda_role_arn
}

output "processor_lambda_role_arn" {
  description = "The ARN of the IAM role for the Processor Lambda"
  value       = module.core.processor_lambda_role_arn
}
