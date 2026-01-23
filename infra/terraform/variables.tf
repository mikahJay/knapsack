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

variable "nat_instance_type" {
  description = "Instance type to use for the NAT instance (dev = cheaper)"
  type        = string
  default     = "t3.micro"
}
// (duplicate aws_region removed)

variable "db_username" {
  description = "Master username for RDS Postgres"
  type        = string
  default     = "knapsack"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}
