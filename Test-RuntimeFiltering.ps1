Write-Host "=== Testing Runtime Filtering ===" -ForegroundColor Green

$BaseUrl = "http://localhost:8000/api"

Write-Host ""
Write-Host "1. Testing 'Under 90 min' filter (0-90)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/movie/discover/?min_runtime=0&max_runtime=90&page=1" -Method Get
    Write-Host "Results count: $($response.results.Count)"
    if ($response.results.Count -gt 0) {
        $response.results[0..2] | ForEach-Object { 
            Write-Host "- $($_.title): runtime = $($_.runtime)" 
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Testing '150+' filter (150-999)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/movie/discover/?min_runtime=150&max_runtime=999&page=1" -Method Get
    Write-Host "Results count: $($response.results.Count)"
    if ($response.results.Count -gt 0) {
        $response.results[0..2] | ForEach-Object { 
            Write-Host "- $($_.title): runtime = $($_.runtime)" 
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Testing '90-120 min' filter..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/movie/discover/?min_runtime=90&max_runtime=120&page=1" -Method Get
    Write-Host "Results count: $($response.results.Count)"
    if ($response.results.Count -gt 0) {
        $response.results[0..2] | ForEach-Object { 
            Write-Host "- $($_.title): runtime = $($_.runtime)" 
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "4. Testing no runtime filter..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/movie/discover/?page=1" -Method Get
    Write-Host "Results count: $($response.results.Count)"
    if ($response.results.Count -gt 0) {
        $response.results[0..2] | ForEach-Object { 
            Write-Host "- $($_.title): runtime = $($_.runtime)" 
        }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green