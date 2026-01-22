output "deploy_role_arn" {
  value = aws_iam_role.deploy_role.arn
}

output "service_role_arn" {
  value = aws_iam_role.service_role.arn
}
