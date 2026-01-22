param(
  [string]$ProfileName = "test",
  [Parameter(Mandatory=$true)][string]$BucketName,
  [Parameter(Mandatory=$true)][string]$DynamoDBTableName,
  [string]$Environment = "test",
  [string]$AwsRegion = "",
  [switch]$AutoApprove
)

Write-Host "Using AWS CLI profile: $ProfileName"
$env:AWS_PROFILE = $ProfileName
if ($AwsRegion -ne "") {
  Write-Host "Using AWS region: $AwsRegion"
  $env:AWS_REGION = $AwsRegion
}

Write-Host "Initializing Terraform (local state for bootstrap)..."
& terraform init
if ($LASTEXITCODE -ne 0) {
  Write-Error "terraform init failed (exit $LASTEXITCODE)"
  exit $LASTEXITCODE
}

$applyArgs = @(
  'apply',
  "-var=bucket_name=$BucketName",
  "-var=dynamodb_table_name=$DynamoDBTableName",
  "-var=environment=$Environment"
)
if ($AwsRegion -ne "") {
  $applyArgs += "-var=aws_region=$AwsRegion"
}
if ($AutoApprove) { $applyArgs += '-auto-approve' }

Write-Host "Running: terraform $($applyArgs -join ' ')"
& terraform @applyArgs
if ($LASTEXITCODE -ne 0) {
  Write-Error "terraform apply failed (exit $LASTEXITCODE)"
  exit $LASTEXITCODE
}

Write-Host "Bootstrap apply completed successfully."
