variable "aws_region" {
  description = "AWS region for the test environment"
  type        = string
  default     = "us-east-2"
}

variable "environment" {
  description = "Deployment environment name"
  type        = string
  default     = "test"
}

variable "deploy_principals" {
  description = "List of ARNs (principals) allowed to assume the deploy role. Configure in CI or via IAM users/groups."
  type        = list(string)
  default     = []
}
// Define variables for the Terraform configuration here.
variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-2"
}
