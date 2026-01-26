terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.0"
    }
  }

  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
  # Credentials are read from the environment (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)
  # or from the AWS CLI configuration selected by the `AWS_PROFILE` env var.
}
