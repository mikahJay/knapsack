// ECS / Fargate task and service placeholders.
// Flesh these out with task definitions, container definitions, and desired counts.

// Example: ECS cluster
resource "aws_ecs_cluster" "knapsack" {
  name = "knapsack-${var.environment}"
}

// NOTE: create per-service task definitions and services referencing ECR images built by CI.
