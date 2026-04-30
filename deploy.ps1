# NoteCognition AWS Deployment Script

Write-Host "--- NoteCognition Cloud Deployment ---" -ForegroundColor Cyan

# 1. Take User Input for AWS Credentials
$accessKey = Read-Host "Enter your AWS Access Key ID"
$secretKey = Read-Host "Enter your AWS Secret Access Key" -AsSecureString
$region = Read-Host "Enter your preferred AWS Region (e.g., us-east-1)"

# Convert secure string back to plain text for environment variable
$unmanagedSecret = [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secretKey)
$plainSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($unmanagedSecret)

# 2. Set AWS Environment Variables for this session
$env:AWS_ACCESS_KEY_ID = $accessKey
$env:AWS_SECRET_ACCESS_KEY = $plainSecret
$env:AWS_DEFAULT_REGION = $region

Write-Host "`n[1/3] Verifying AWS Connection..." -ForegroundColor Yellow
aws sts get-caller-identity | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: AWS credentials invalid or CLI not installed." -ForegroundColor Red
    exit
}

# 3. Create a Bootstrap S3 bucket for Lambda code package
$accountId = (aws sts get-caller-identity --query Account --output text)
$bootstrapBucket = "notecognition-bootstrap-$accountId-$region"

Write-Host "[2/3] Creating bootstrap bucket: $bootstrapBucket" -ForegroundColor Yellow
aws s3 mb "s3://$bootstrapBucket" --region $region 2>$null

# 4. Package for CloudFormation (Zips and uploads Lambda code)
Write-Host "[3/3] Packaging and Deploying CloudFormation Stack..." -ForegroundColor Yellow
$templatePath = Join-Path $PSScriptRoot "cloudformation\template.yaml"
$transformedPath = Join-Path $PSScriptRoot "cloudformation\transformed-template.yaml"

aws cloudformation package `
    --template-file "$templatePath" `
    --s3-bucket $bootstrapBucket `
    --output-template-file "$transformedPath"

# 5. Deploy the Stack
aws cloudformation deploy `
    --template-file "$transformedPath" `
    --stack-name notecognition-stack-dev `
    --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND `
    --region $region

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n--- DEPLOYMENT SUCCESSFUL ---" -ForegroundColor Green
    Write-Host "Run 'aws cloudformation describe-stacks --stack-name notecognition-stack-dev --query ""Stacks[0].Outputs""' to see your new IDs." -ForegroundColor Cyan
} else {
    Write-Host "`nDeployment failed. Check the AWS CloudFormation Console for details." -ForegroundColor Red
}

# Cleanup Sensitive Info
Remove-Item env:AWS_ACCESS_KEY_ID
Remove-Item env:AWS_SECRET_ACCESS_KEY
[System.Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($unmanagedSecret)
