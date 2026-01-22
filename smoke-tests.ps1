Param(
  [string]$Environment = "test"
)

function Test-Service {
  param(
    [string]$Name,
    [string]$TGName,
    [string]$Path
  )

  Write-Output "Looking up target group: $TGName"
  try {
    $tgArn = (& aws elbv2 describe-target-groups --names $TGName --query 'TargetGroups[0].TargetGroupArn' --output text) 2>$null
  } catch {
    $tgArn = $null
  }

  if ([string]::IsNullOrWhiteSpace($tgArn) -or $tgArn -eq "None") {
    Write-Error "ERROR: target group $TGName not found"
    exit 2
  }

  Write-Output "Checking target health for $tgArn"
  $health = (& aws elbv2 describe-target-health --target-group-arn $tgArn --query 'TargetHealthDescriptions[*].TargetHealth.State' --output text) 2>$null
  Write-Output "Target health states: $health"
  if (-not ($health -match 'healthy')) {
    Write-Error "ERROR: no healthy targets"
    exit 3
  }

  $lbArn = (& aws elbv2 describe-target-groups --target-group-arns $tgArn --query 'TargetGroups[0].LoadBalancerArns[0]' --output text)
  $albDns = (& aws elbv2 describe-load-balancers --load-balancer-arns $lbArn --query 'LoadBalancers[0].DNSName' --output text)
  if ([string]::IsNullOrWhiteSpace($albDns) -or $albDns -eq "None") {
    Write-Error "ERROR: ALB DNS not found"
    exit 4
  }

  $url = "http://$albDns$Path"
  Write-Output "Requesting $url"

  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
    $status = $resp.StatusCode
  } catch {
    Write-Error "Request failed: $($_.Exception.Message)"
    exit 5
  }

  Write-Output "HTTP status: $status"
  if ($status -ne 200) {
    Write-Error "FAIL: $Name returned HTTP $status"
    exit 5
  }

  Write-Output "OK: $Name"
}

Test-Service -Name 'need-server' -TGName "need-server-tg-$Environment" -Path '/'
Test-Service -Name 'resource-server' -TGName "resource-server-tg-$Environment" -Path '/resource'
Test-Service -Name 'auth-server' -TGName "auth-server-tg-$Environment" -Path '/auth'

Write-Output "All smoke tests passed."
