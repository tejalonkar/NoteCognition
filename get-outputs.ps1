# NoteCognition Fetch Outputs Script

Write-Host "--- NoteCognition AWS Output Fetcher ---" -ForegroundColor Cyan

# 1. Take User Input for AWS Credentials
$accessKey = Read-Host "Enter your AWS Access Key ID"
$secretKey = Read-Host "Enter your AWS Secret Access Key" -AsSecureString
$region = Read-Host "Enter your AWS Region (e.g., ap-south-1)"

# Set environment
$unmanagedSecret = [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secretKey)
$plainSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($unmanagedSecret)
$env:AWS_ACCESS_KEY_ID = $accessKey
$env:AWS_SECRET_ACCESS_KEY = $plainSecret
$env:AWS_DEFAULT_REGION = $region

Write-Host "`nFetching IDs from AWS..." -ForegroundColor Yellow
aws cloudformation describe-stacks --stack-name notecognition-stack-dev --query "Stacks[0].Outputs" --region $region

# Cleanup Sensitive Info
Remove-Item env:AWS_ACCESS_KEY_ID
Remove-Item env:AWS_SECRET_ACCESS_KEY
[System.Runtime.InteropServices.Marshal]::ZeroFreeGlobalAllocUnicode($unmanagedSecret)
