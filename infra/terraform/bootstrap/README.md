Using an AWS CLI profile
-----------------------

If you have multiple AWS CLI profiles (for example you configured `aws configure --profile test`), you can run Terraform with that profile by setting the `AWS_PROFILE` environment variable. The repository includes a helper PowerShell script to do this conveniently:

```powershell
cd infra/terraform/bootstrap
.\run-bootstrap.ps1 -BucketName "knapsack-terraform-state-test-<your-suffix>" -DynamoDBTableName "knapsack-terraform-locks-test-<your-suffix>" -ProfileName test -AutoApprove
```

The script sets `AWS_PROFILE` for the session and runs `terraform init` + `terraform apply` with the provided variables. Replace `test` with the profile name you configured.
# Bootstrap: create remote state resources

This directory contains a small Terraform config that bootstraps the remote state infrastructure (S3 bucket + DynamoDB table) used to store and lock Terraform state for the `test` environment.

Why a bootstrap step?
- Terraform backend must exist before you can use it for remote state. This bootstrap config uses a local state (default) to create the S3 bucket and DynamoDB table. After creating them, reconfigure the backend to point at the new S3/DynamoDB.

Steps:

1. Choose bucket and table names (unique across AWS account/region):

   - S3 bucket example: `knapsack-terraform-state-test-<your-suffix>`
   - DynamoDB table example: `knapsack-terraform-locks-test-<your-suffix>`

2. Initialize and apply the bootstrap (from this directory):

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply -var="bucket_name=knapsack-terraform-state-test-<your-suffix>" -var="dynamodb_table_name=knapsack-terraform-locks-test-<your-suffix>" -var="environment=test"
```

3. Note the created bucket and table names (outputs). Update `infra/terraform/backend.tf` with the real names, or run `terraform init -backend-config="bucket=..." -backend-config="dynamodb_table=..."` from `infra/terraform`.

4. Re-run `terraform init` in `infra/terraform` to switch to the remote backend, then `terraform plan` / `apply` as usual.

Security note: keep the S3 bucket private and versioning enabled (the bootstrap config enables versioning). Limit who can read or write the state bucket; CI should be given the deploy role that can read/write the state.
