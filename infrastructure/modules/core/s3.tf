data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "mortgage_documents" {
  bucket = "${var.project_name}-documents-${var.environment}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "mortgage_documents_versioning" {
  bucket = aws_s3_bucket.mortgage_documents.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "mortgage_documents_encryption" {
  bucket = aws_s3_bucket.mortgage_documents.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "mortgage_documents_access" {
  bucket = aws_s3_bucket.mortgage_documents.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "mortgage_documents_cors" {
  bucket = aws_s3_bucket.mortgage_documents.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = ["*"] # Ajustar en prod según sea necesario
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "mortgage_documents_lifecycle" {
  bucket = aws_s3_bucket.mortgage_documents.id

  rule {
    id     = "move-to-ia"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}
