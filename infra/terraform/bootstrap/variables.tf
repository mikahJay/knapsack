variable "aws_region" {
  description = "AWS region for the bootstrap resources"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Environment name (e.g. test)"
  type        = string
  default     = "test"
}

variable "bucket_name" {
  description = "Name for the S3 bucket to store Terraform state"
  type        = string
}

variable "dynamodb_table_name" {
  description = "Name for the DynamoDB table used for state locking"
  type        = string
}
