# Eco Pulse: Cloudflare Portable Downloader
# This script downloads the cloudflared.exe directly to this folder (no install needed!).

$url = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
$output = "$PSScriptRoot\cloudflared.exe"

try {
    Write-Host "📥 Downloading Cloudflare Tunnel (cloudflared.exe)..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $url -OutFile $output
    Write-Host "✅ Download complete: $output" -ForegroundColor Green
    Write-Host "👉 You can now run 'START_PULSE_TUNNEL.bat'!" -ForegroundColor Yellow
} catch {
    Write-Host "❌ Error downloading: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your internet connection." -ForegroundColor Yellow
}
pause
