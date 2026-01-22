#!/usr/bin/env sh
set -eu

# need-server smoke test: ensures at least one healthy target and that GET / returns 200
ENV=${ENV:-test}
TG_NAME="need-server-tg-${ENV}"

echo "Looking up target group: $TG_NAME"
TG_ARN=$(aws elbv2 describe-target-groups --names "$TG_NAME" --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)
if [ -z "$TG_ARN" ] || [ "$TG_ARN" = "None" ]; then
  echo "ERROR: target group $TG_NAME not found"
  exit 2
fi

echo "Checking target health for $TG_ARN"
HEALTH_STATES=$(aws elbv2 describe-target-health --target-group-arn "$TG_ARN" --query 'TargetHealthDescriptions[*].TargetHealth.State' --output text || true)
echo "Target health states: $HEALTH_STATES"
echo "$HEALTH_STATES" | grep -q "healthy" || (echo "ERROR: no healthy targets" && exit 3)

LB_ARN=$(aws elbv2 describe-target-groups --target-group-arns "$TG_ARN" --query 'TargetGroups[0].LoadBalancerArns[0]' --output text)
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns "$LB_ARN" --query 'LoadBalancers[0].DNSName' --output text)

if [ -z "$ALB_DNS" ] || [ "$ALB_DNS" = "None" ]; then
  echo "ERROR: ALB DNS not found"
  exit 4
fi

URL="http://$ALB_DNS/"
echo "Requesting $URL"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$URL" || true)
echo "HTTP status: $STATUS"
[ "$STATUS" -eq 200 ] && (echo "OK" && exit 0) || (echo "FAIL" && exit 5)
