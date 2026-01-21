// IAM module: creates deployment role and per-service roles/policies.
// This is a starting point — review and restrict policies before use.

resource "aws_iam_role" "deploy_role" {
  name = "knapsack-deploy-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          AWS = var.deploy_principals
        },
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "deploy_policy" {
  name        = "knapsack-deploy-policy-${var.environment}"
  description = "Placeholder deploy policy (limit in CI)"
  policy      = jsonencode({
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
  policy      = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "secretsmanager:GetSecretValue",
          "s3:GetObject"
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
