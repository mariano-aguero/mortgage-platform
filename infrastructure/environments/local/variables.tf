variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "The environment for the infrastructure (local, dev, staging, prod)"
  type        = string
  default     = "local"
}

variable "project_name" {
  description = "The name of the project"
  type        = string
  default     = "mortgage-platform"
}
