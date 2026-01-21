terraform {
  required_version = ">= 1.0"
}

// This is a placeholder Terraform configuration. Add providers, modules
// and resources appropriate for the `test` AWS environment here.

// Instantiate the IAM module which provides deploy and service roles.
module "iam" {
  source = "./modules/iam"

  environment       = var.environment
  deploy_principals = var.deploy_principals
}

// Export IAM role ARNs for reference
output "deploy_role_arn" {
  value = module.iam.deploy_role_arn
}

output "service_role_arn" {
  value = module.iam.service_role_arn
}
// Networking outputs are defined in network.tf
