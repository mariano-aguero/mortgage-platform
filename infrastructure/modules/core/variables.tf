variable "aws_region" {
  description = "The AWS region to deploy resources into"
  type        = string
}

variable "environment" {
  description = "The environment for the infrastructure (dev, staging, prod)"
  type        = string
}

variable "project_name" {
  description = "The name of the project"
  type        = string
}
