# Claude API Key Setup for AWS

After terraform creates the secret, you need to populate it with your actual API key.

## One-time setup:

```bash
# Set the Claude API key in AWS Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id /knapsack/test/claude/api_key \
  --secret-string "your_actual_claude_api_key_here"
```

## Or use terraform:

```bash
# In infra/terraform directory
terraform apply -var="claude_api_key=your_actual_claude_api_key_here"
```

## Verify it's set:

```bash
aws secretsmanager get-secret-value \
  --secret-id /knapsack/test/claude/api_key \
  --query SecretString \
  --output text
```

The match-server ECS task will automatically receive this as the `CLAUDE_API_KEY` environment variable.
