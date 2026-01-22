// IAM module: creates deployment role and per-service roles/policies.
// This is a starting point — review and restrict policies before use.

data "aws_caller_identity" "current" {}

locals {
  deploy_principals = length(var.deploy_principals) > 0 ? var.deploy_principals : ["arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"]
}

resource "aws_iam_role" "deploy_role" {
  name = "knapsack-deploy-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          AWS = local.deploy_principals
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "deploy_policy" {
  name        = "knapsack-deploy-policy-${var.environment}"
  description = "Placeholder deploy policy (limit in CI)"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "ecr:*",
          "ecs:*",
          "iam:PassRole",
          "elasticloadbalancing:*",
          "logs:*",
          "s3:*",
          "secretsmanager:*"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "deploy_attach" {
  role       = aws_iam_role.deploy_role.name
  policy_arn = aws_iam_policy.deploy_policy.arn
}

// Example service role for ECS tasks / services to assume
resource "aws_iam_role" "service_role" {
  name = "knapsack-service-${var.environment}"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect    = "Allow",
        Principal = { Service = "ecs-tasks.amazonaws.com" },
        Action    = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "service_policy" {
  name        = "knapsack-service-policy-${var.environment}"
  description = "Minimal permissions for service operation (placeholder)"
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "secretsmanager:GetSecretValue",
          "s3:GetObject",
          "ecr:GetAuthorizationToken",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchCheckLayerAvailability"
        ],
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "service_attach" {
  role       = aws_iam_role.service_role.name
  policy_arn = aws_iam_policy.service_policy.arn
}

// Attach AWS managed policy for ECR read access so ECS tasks can pull images
resource "aws_iam_role_policy_attachment" "service_ecr_read" {
  role       = aws_iam_role.service_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

// Attach CloudWatch Logs managed policy so tasks can create log streams
resource "aws_iam_role_policy_attachment" "service_logs" {
  role       = aws_iam_role.service_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}
