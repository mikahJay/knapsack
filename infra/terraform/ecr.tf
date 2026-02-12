// Placeholder for ECR repositories for each service
// Create one repository per service and reference them in CI/build pipelines.

resource "aws_ecr_repository" "auth_server" {
  name              = "auth-server-${var.environment}"
  force_delete      = true
}

resource "aws_ecr_repository" "resource_server" {
  name              = "resource-server-${var.environment}"
  force_delete      = true
}

resource "aws_ecr_repository" "need_server" {
  name              = "need-server-${var.environment}"
  force_delete      = true
}

resource "aws_ecr_repository" "match_server" {
  name              = "match-server-${var.environment}"
  force_delete      = true
}

resource "aws_ecr_repository" "web_app" {
  name              = "web-app-${var.environment}"
  force_delete      = true
}
