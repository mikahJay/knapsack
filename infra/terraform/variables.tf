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

variable "google_client_id" {
  description = "Google OAuth client ID for verifying ID tokens in resource-server"
  type        = string
  default     = ""
}

variable "image_tag" {
  description = "Image tag to deploy for services (resource-server, need-server, etc.)"
  type        = string
  default     = "latest"
}

variable "allowed_db_cidr_blocks" {
  description = "Optional extra CIDR blocks allowed to access the RDS instance (useful for CloudShell or office IPs)"
  type        = list(string)
  default     = []
}

variable "allowed_alb_cidr_blocks" {
  description = "Extra CIDR blocks allowed to access the ALB (in addition to the VPC CIDR). Use this to whitelist developer IPs."
  type        = list(string)
  default     = []
}
