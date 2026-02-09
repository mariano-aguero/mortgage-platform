# IAM Roles and Policies for Lambda functions

# Data source for account ID
data "aws_caller_identity" "current" {}

# Assume Role Policy for Lambda
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    effect  = "Allow"
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# 1. Role: mortgage-api-lambda-role-{environment}
resource "aws_iam_role" "api_lambda_role" {
  name               = "mortgage-api-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "mortgage-api-lambda-role-${var.environment}"
  }
}

# Policy Document for API Lambda
data "aws_iam_policy_document" "api_lambda_policy" {
  # DynamoDB: CRUD en la tabla de applications y sus GSIs
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:PutItem",
      "dynamodb:GetItem",
      "dynamodb:UpdateItem",
      "dynamodb:DeleteItem",
      "dynamodb:Query",
      "dynamodb:Scan"
    ]
    resources = [
      aws_dynamodb_table.mortgage_applications.arn,
      "${aws_dynamodb_table.mortgage_applications.arn}/index/*"
    ]
  }

  # EventBridge: PutEvents en el event bus custom
  statement {
    effect    = "Allow"
    actions   = ["events:PutEvents"]
    resources = [aws_cloudwatch_event_bus.mortgage_events.arn]
  }

  # CloudWatch Logs
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/mortgage-api-*"]
  }

  # S3: GetObject, PutObject en el bucket de documentos
  statement {
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject"
    ]
    resources = ["${aws_s3_bucket.mortgage_documents.arn}/*"]
  }

  # Cognito: AdminGetUser (para verificar roles)
  statement {
    effect    = "Allow"
    actions   = ["cognito-idp:AdminGetUser"]
    resources = [aws_cognito_user_pool.pool.arn]
  }
}

resource "aws_iam_role_policy" "api_lambda_policy" {
  name   = "mortgage-api-lambda-policy-${var.environment}"
  role   = aws_iam_role.api_lambda_role.id
  policy = data.aws_iam_policy_document.api_lambda_policy.json
}

# 2. Role: mortgage-processor-lambda-role-{environment}
resource "aws_iam_role" "processor_lambda_role" {
  name               = "mortgage-processor-lambda-role-${var.environment}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Name = "mortgage-processor-lambda-role-${var.environment}"
  }
}

# Policy Document for Processor Lambda
data "aws_iam_policy_document" "processor_lambda_policy" {
  # SQS: ReceiveMessage, DeleteMessage, GetQueueAttributes en la cola principal
  statement {
    effect = "Allow"
    actions = [
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes"
    ]
    resources = [aws_sqs_queue.mortgage_application_processing.arn]
  }

  # DynamoDB: GetItem, UpdateItem en la tabla
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:UpdateItem"
    ]
    resources = [aws_dynamodb_table.mortgage_applications.arn]
  }

  # CloudWatch Logs
  statement {
    effect = "Allow"
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents"
    ]
    resources = ["arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/mortgage-processor-*"]
  }

  # S3: GetObject en el bucket
  statement {
    effect    = "Allow"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.mortgage_documents.arn}/*"]
  }
}

resource "aws_iam_role_policy" "processor_lambda_policy" {
  name   = "mortgage-processor-lambda-policy-${var.environment}"
  role   = aws_iam_role.processor_lambda_role.id
  policy = data.aws_iam_policy_document.processor_lambda_policy.json
}
