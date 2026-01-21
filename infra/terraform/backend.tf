/*
  Remote backend configuration for the `test` environment.
  This file configures Terraform to use S3 for state storage and DynamoDB for state locking.
  Values below were bootstrapped and are safe to commit (they contain no secrets).
*/

terraform {
  backend "s3" {
    bucket         = "knapsack-terraform-state-test-887401460124-6ad87278"
    key            = "knapsack/test/terraform.tfstate"
    region         = "us-east-2"
    dynamodb_table = "knapsack-terraform-locks-test-887401460124-6ad87278"
    encrypt        = true
  }
}

