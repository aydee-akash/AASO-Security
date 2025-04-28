$code = Get-Content -Path test-sonar.js -Raw
$body = @{
    code = $code
} | ConvertTo-Json -Compress

$response = Invoke-RestMethod `
    -Uri "http://localhost:3001/sonarqube-scan" `
    -Method Post `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body

$response | ConvertTo-Json -Depth 10 