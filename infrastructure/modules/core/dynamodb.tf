resource "aws_dynamodb_table" "mortgage_applications" {
  name         = "mortgage-applications-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "PK"
  range_key    = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "GSI1PK"
    type = "S"
  }

  attribute {
    name = "GSI1SK"
    type = "S"
  }

  attribute {
    name = "GSI2PK"
    type = "S"
  }

  attribute {
    name = "GSI2SK"
    type = "S"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  # GSI1: Access pattern for searching by userId
  # PK: USER#<userId>
  # SK: APP#<applicationId>
  global_secondary_index {
    name               = "GSI1"
    hash_key           = "GSI1PK"
    range_key          = "GSI1SK"
    projection_type    = "ALL"
  }

  # GSI2 (statusIndex): Access pattern for filtering by status and sorting by creation date
  # PK: STATUS#<status>
  # SK: <createdAt>
  global_secondary_index {
    name               = "statusIndex"
    hash_key           = "GSI2PK"
    range_key          = "GSI2SK"
    projection_type    = "ALL"
  }

  tags = {
    Name = "mortgage-applications-${var.environment}"
  }
}
