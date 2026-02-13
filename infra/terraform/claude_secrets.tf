// Store Claude API key in Secrets Manager for match-server to use

variable "claude_api_key" {
  description = "Claude API key for AI matching functionality"
  type        = string
  sensitive   = true
  default     = null
}

resource "aws_secretsmanager_secret" "claude_api_key" {
  name = "/knapsack/${var.environment}/claude/api_key"
}

resource "aws_secretsmanager_secret_version" "claude_api_key_ver" {
  count         = var.claude_api_key != null && trim(var.claude_api_key) != "" ? 1 : 0
  secret_id     = aws_secretsmanager_secret.claude_api_key.id
  secret_string = var.claude_api_key
}

output "claude_api_key_secret_arn" {
  value = aws_secretsmanager_secret.claude_api_key.arn
}
