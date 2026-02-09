resource "aws_sqs_queue" "mortgage_application_processing_dlq" {
  name                      = "mortgage-application-processing-dlq-${var.environment}"
  message_retention_seconds = 1209600 # 14 días

  tags = {
    Name = "mortgage-application-processing-dlq-${var.environment}"
  }
}

resource "aws_sqs_queue" "mortgage_application_processing" {
  name                       = "mortgage-application-processing-${var.environment}"
  visibility_timeout_seconds = 300
  message_retention_seconds  = 1209600 # 14 días
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.mortgage_application_processing_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "mortgage-application-processing-${var.environment}"
  }
}
