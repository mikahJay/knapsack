# infra


Terraform skeleton for the `test` AWS environment.

This folder contains a starter Terraform layout for deploying the Knapsack services to AWS `test`:

- `provider.tf` — AWS provider configuration
- `backend.tf` — commented example for S3 remote state + DynamoDB locking (configure before use)
- `variables.tf` / `outputs.tf` — stack variables and outputs
- `modules/iam` — IAM module that creates a deploy role and a generic service role with example policies
- `ecr.tf` — ECR repository placeholders for each service
- `ecs.tf` — ECS cluster placeholder and notes for task/service definitions
- `alb.tf` — ALB / routing placeholders

Next steps before applying to AWS:

1. Create an S3 bucket and DynamoDB table for remote state locking, then provide the real values in `backend.tf` or pass via `-backend-config` to `terraform init`.
2. Review and tighten IAM policies in `modules/iam` to follow least privilege.
3. Add concrete ECS task definitions, container IAM roles, and ALB listeners for each service.
4. Wire CI (GitHub Actions / other) to assume the `knapsack-deploy-test` role or use deploy principals configured in `var.deploy_principals`.

Usage (example):

```bash
cd infra/terraform
terraform init
terraform plan -var="environment=test"
terraform apply -var="environment=test"
```

Bootstrap remote state (S3 + DynamoDB)
-------------------------------------

Before switching to a remote backend, create the S3 bucket and DynamoDB lock table. Use the bootstrap module in `infra/terraform/bootstrap`:

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var="bucket_name=knapsack-terraform-state-test-<your-suffix>" -var="dynamodb_table_name=knapsack-terraform-locks-test-<your-suffix>" -var="environment=test"
```

Then update `infra/terraform/backend.tf` with the chosen bucket and table names (or run `terraform init -backend-config=...`), and re-run `terraform init` from `infra/terraform`.


