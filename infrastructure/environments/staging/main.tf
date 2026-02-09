terraform {
  required_version = ">= 1.0.0"

  backend "s3" {
    bucket         = "mortgage-platform-tf-state"
    key            = "environments/staging/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "mortgage-platform-tf-lock"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

module "core" {
  source = "../../modules/core"

  aws_region   = var.aws_region
  environment  = var.environment
  project_name = var.project_name
}
