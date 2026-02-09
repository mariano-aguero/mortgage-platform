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

output "user_pool_id" {
  description = "The ID of the Cognito User Pool"
  value       = module.core.user_pool_id
}

output "app_client_id" {
  description = "The ID of the Cognito App Client"
  value       = module.core.app_client_id
}

output "s3_bucket_documents_name" {
  description = "The name of the S3 bucket for mortgage documents"
  value       = module.core.s3_bucket_documents_name
}

output "sqs_queue_url" {
  description = "The URL of the main SQS queue"
  value       = module.core.sqs_queue_url
}

output "event_bus_name" {
  description = "The name of the custom EventBridge bus"
  value       = module.core.event_bus_name
}
