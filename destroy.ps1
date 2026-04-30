# NoteCognition Infrastructure Destruction Script

Write-Host "--- WARNING: DELETING ALL AWS INFRASTRUCTURE ---" -ForegroundColor Red
$confirm = Read-Host "Are you absolutely sure you want to delete the NoteCognition stack? (y/n)"

if ($confirm -eq 'y') {
    # 1. Take User Input for AWS Credentials
    $accessKey = Read-Host "Enter your AWS Access Key ID"
    $secretKey = Read-Host "Enter your AWS Secret Access Key" -AsSecureString
    $region = Read-Host "Enter your AWS Region"

    # Set temporary environment
    $unmanagedSecret = [System.Runtime.InteropServices.Marshal]::SecureStringToGlobalAllocUnicode($secretKey)
    $plainSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringUni($unmanagedSecret)
    $env:AWS_ACCESS_KEY_ID = $accessKey
    $env:AWS_SECRET_ACCESS_KEY = $plainSecret
    $env:AWS_DEFAULT_REGION = $region

    Write-Host "`nDeleting stack: notecognition-stack-dev..." -ForegroundColor Yellow
    aws cloudformation delete-stack --stack-name notecognition-stack-dev --region $region
    
    Write-Host "The deletion process has started. This can take a few minutes." -ForegroundColor Green
    Write-Host "You can check progress in the AWS CloudFormation Console." -ForegroundColor Cyan

    # Cleanup sensitive info
    Remove-Item env:AWS_ACCESS_KEY_ID
    Remove-Item env:AWS_SECRET_ACCESS_KEY
} else {
    Write-Host "Aborted." -ForegroundColor Yellow
}
