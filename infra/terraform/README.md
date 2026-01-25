# Terraform (infra/terraform)

This directory contains the Terraform configuration used to provision the project's infrastructure (VPC, subnets, ECS cluster, task definitions, services, ALB, etc.).

CI notes
 - The CI workflow may run targeted `terraform apply` commands to create only the ECS cluster and a specific service when they are missing. Example targets used by the workflow:
   - `-target=aws_ecs_cluster.knapsack`
   - `-target=aws_ecs_task_definition.<service>` (e.g. `need_server` or `resource_server`)
   - `-target=aws_ecs_service.<service>`
 - Targeted applies avoid touching unrelated resources but can skip dependencies. If you make changes that affect other modules (networking, IAM, etc.), run a normal `terraform init` + `terraform apply` without `-target` to ensure a correct full apply.

Credentials / CI notes
- The Terraform `provider "aws"` configuration was changed to rely on environment credentials or `AWS_PROFILE`.
- Locally, if you use an AWS CLI profile named `test`, set the environment variable before running Terraform:

  On macOS/Linux:

  ```bash
  export AWS_PROFILE=test
  terraform init
  terraform apply -var="environment=test"
  ```

  On Windows PowerShell:

  ```powershell
  $env:AWS_PROFILE = 'test'
  terraform init
  terraform apply -var="environment=test"
  ```

 - In CI we inject credentials as environment variables using `aws-actions/configure-aws-credentials`, so no named profile is required.

Usage (local):
 - `cd infra/terraform`
 - `terraform init`
 - `terraform plan -var="environment=test"`
 - `terraform apply -var="environment=test"`

## Postgres database notes

Only connectivity is through the "bastion" (an EC2) instance, via SSM, from machines designated by IP in bastion.tf. A sample command from that bastion:

```
sh-4.2$ psql -h "knapsack-test.ch6aw4ss271j.us-east-2.rds.amazonaws.com" -U knapsack -p 5432 sslmode=require
```

Then once connected:

```
knapsack=> select count(0) from needs;
 count
-------
  1001
(1 row)
```