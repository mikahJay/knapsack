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
  # Credentials will be loaded from the environment, shared credentials file, or assumed role.
}
