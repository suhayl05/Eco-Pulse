# Eco Pulse Tunnel Helper
# This script starts a temporary Cloudflare tunnel to expose your local Eco Pulse app to the internet with HTTPS.
# HTTPS is REQUIRED for PWA installation (Add to Home Screen).

if (!(Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "❌ cloudflared not found in PATH." -ForegroundColor Red
    Write-Host "Please download it from: https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.msi" -ForegroundColor Cyan
    Write-Host "After installing, restart your terminal and run this script again."
    pause
    exit
}

Write-Host "🚀 Starting Eco Pulse Tunnel on port 5000..." -ForegroundColor Green
Write-Host "📋 Copy the 'https://...' link that appears below!" -ForegroundColor Yellow
Write-Host "📱 Open that link on your phone/laptop to see the 'Install' prompt." -ForegroundColor Cyan
Write-Host "--------------------------------------------------------"

cloudflared tunnel --url http://localhost:5000
