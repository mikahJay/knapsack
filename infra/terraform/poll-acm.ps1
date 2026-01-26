$region = 'us-east-2'
$domain = 'knap-sack.com'
$maxChecks = 40
$sleep = 15
Write-Host "Starting ACM + DNS polling for $domain (region=$region)"
$arn = aws acm list-certificates --region $region --query "CertificateSummaryList[?DomainName=='$domain'].CertificateArn | [0]" --output text
if (-not $arn -or $arn -eq 'None') {
  Write-Host "Certificate ARN not found for $domain"
  exit 2
}
Write-Host "Found ARN: $arn"
for ($i=0; $i -lt $maxChecks; $i++) {
  $c = aws acm describe-certificate --certificate-arn $arn --region $region --output json | ConvertFrom-Json
  $status = $c.Certificate.Status
  Write-Host "[$((Get-Date).ToString('HH:mm:ss'))] ACM status: $status (check $($i+1)/$maxChecks)"
  foreach ($dvo in $c.Certificate.DomainValidationOptions) {
    $name = $dvo.ResourceRecord.Name
    $value = $dvo.ResourceRecord.Value
    Write-Host " Checking public DNS for $name -> expected $value"
    try {
      $ns = nslookup $name 8.8.8.8 2>$null | Out-String
    } catch {
      $ns = ''
    }
    if ($ns -match [regex]::Escape($value)) {
      Write-Host "  -> public DNS resolves to ACM validation value"
    } else {
      Write-Host "  -> public DNS NOT yet resolving to ACM value"
    }
  }
  if ($status -eq 'ISSUED') { Write-Host 'Certificate ISSUED'; exit 0 }
  Start-Sleep -Seconds $sleep
}
Write-Host 'Timed out waiting for validation'
exit 3
