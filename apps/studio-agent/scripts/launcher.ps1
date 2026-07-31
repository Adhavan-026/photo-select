# Set console title
$host.ui.RawUI.WindowTitle = "PhotoSelect Local Agent Launcher"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "     LAUNCHING PHOTOSELECT LOCAL AGENT        " -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check if Docker is running
Write-Host "[*] Checking Docker Desktop status..." -NoNewline
$dockerStatus = & docker info 2>&1
if ($dockerStatus -match "error during connect") {
    Write-Host " [CLOSED]" -ForegroundColor Yellow
    Write-Host "[*] Launching Docker Desktop in the background..." -ForegroundColor Cyan
    
    # Try default installation path
    $dockerPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerPath) {
        Start-Process $dockerPath
    } else {
        # Check if Docker exists in PATH
        $dockerPath = Get-Command "Docker Desktop" -ErrorAction SilentlyContinue
        if ($dockerPath) {
            Start-Process $dockerPath.Source
        } else {
            Write-Host "❌ Error: Docker Desktop not found! Please ensure Docker is installed." -ForegroundColor Red
            Read-Host "Press Enter to exit..."
            exit 1
        }
    }
    
    # Wait for Docker to become active
    Write-Host "[*] Waiting for Docker daemon to become responsive (this may take up to 30 seconds)..." -ForegroundColor Yellow
    $retries = 30
    $dockerReady = $false
    while ($retries -gt 0) {
        Start-Sleep -Seconds 2
        $testDocker = & docker info 2>&1
        if ($testDocker -notmatch "error during connect") {
            $dockerReady = $true
            break
        }
        $retries--
        Write-Host "." -NoNewline
    }
    Write-Host ""
    
    if (-not $dockerReady) {
        Write-Host "❌ Error: Docker Desktop took too long to start. Please open it manually and try again." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        exit 1
    }
}
Write-Host " [RUNNING]" -ForegroundColor Green

# 2. Start the Docker containers
Write-Host "[*] Navigating to agent workspace..." -ForegroundColor Cyan
$agentDir = Split-Path -Path $MyInvocation.MyCommand.Definition -Parent
# Go up to the parent directory where docker-compose.yml is (apps/studio-agent)
$composeDir = Resolve-Path "$agentDir\.."
cd $composeDir

Write-Host "[*] Starting agent containers..." -ForegroundColor Cyan
& docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Failed to start agent containers!" -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    exit 1
}
Write-Host "✅ Containers started successfully!" -ForegroundColor Green

# 3. Open browser
Write-Host "[*] Launching PhotoSelect Dashboard..." -ForegroundColor Cyan
Start-Process "https://photo-select-cloud-frontend.vercel.app/login"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "  🎉 PHOTOSELECT AGENT IS ONLINE AND RUNNING!   " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "You can close this window now. The agent will keep running in the background."
Write-Host ""
Start-Sleep -Seconds 5
