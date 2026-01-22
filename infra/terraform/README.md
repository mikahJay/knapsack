# Terraform (infra/terraform)

This directory contains the Terraform configuration used to provision the project's infrastructure (VPC, subnets, ECS cluster, task definitions, services, ALB, etc.).

CI notes
 - The CI workflow may run targeted `terraform apply` commands to create only the ECS cluster and a specific service when they are missing. Example targets used by the workflow:
   - `-target=aws_ecs_cluster.knapsack`
   - `-target=aws_ecs_task_definition.<service>` (e.g. `need_server` or `resource_server`)
   - `-target=aws_ecs_service.<service>`
 - Targeted applies avoid touching unrelated resources but can skip dependencies. If you make changes that affect other modules (networking, IAM, etc.), run a normal `terraform init` + `terraform apply` without `-target` to ensure a correct full apply.

Usage (local):
 - `cd infra/terraform`
 - `terraform init`
 - `terraform plan -var="environment=test"`
 - `terraform apply -var="environment=test"`
