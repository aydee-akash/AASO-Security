# Read the test code
$code = Get-Content -Path test-sonar.js -Raw

# Create the request body
$body = @{
    code = $code
} | ConvertTo-Json -Compress

try {
    # Make the request with correct header syntax
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    Write-Host "Sending request to SonarQube..."
    $response = Invoke-RestMethod `
        -Uri "http://localhost:3001/sonarqube-scan" `
        -Method Post `
        -Headers $headers `
        -Body $body

    # Display the results
    Write-Host "Analysis Results:"
    $response | ConvertTo-Json -Depth 10
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.ErrorDetails) {
        Write-Host "Response: $($_.ErrorDetails.Message)"
    }
} 