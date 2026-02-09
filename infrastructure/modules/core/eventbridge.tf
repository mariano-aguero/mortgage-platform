resource "aws_cloudwatch_event_bus" "mortgage_events" {
  name = "mortgage-events-${var.environment}"

  tags = {
    Name = "mortgage-events-${var.environment}"
  }
}

resource "aws_cloudwatch_event_rule" "application_status_changed" {
  name           = "application-status-changed"
  description    = "Captures events when a mortgage application status changes"
  event_bus_name = aws_cloudwatch_event_bus.mortgage_events.name

  event_pattern = jsonencode({
    source      = ["mortgage.applications"]
    detail-type = ["ApplicationStatusChanged"]
  })

  tags = {
    Name = "application-status-changed"
  }
}

resource "aws_cloudwatch_event_target" "sqs_target" {
  rule           = aws_cloudwatch_event_rule.application_status_changed.name
  bus_name       = aws_cloudwatch_event_bus.mortgage_events.name
  target_id      = "SendToSQS"
  arn            = aws_sqs_queue.mortgage_application_processing.arn
}

# Policy to allow EventBridge to send messages to SQS
data "aws_iam_policy_document" "eventbridge_to_sqs" {
  statement {
    effect = "Allow"
    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.mortgage_application_processing.arn]
    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_cloudwatch_event_rule.application_status_changed.arn]
    }
  }
}

resource "aws_sqs_queue_policy" "eventbridge_to_sqs" {
  queue_url = aws_sqs_queue.mortgage_application_processing.id
  policy    = data.aws_iam_policy_document.eventbridge_to_sqs.json
}
