@echo off
title Eco Pulse Tunnel Manager
color 0A
echo ========================================================
echo          ECO PULSE: PWA TUNNEL ACTIVATOR
echo ========================================================
echo.

set EXE_FILE=cloudflared.exe

if not exist "%~dp0%EXE_FILE%" (
    where cloudflared >nul 2>nul
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] cloudflared.exe NOT FOUND in this folder!
        echo.
        echo 1. Right-click 'DOWNLOAD_CLOUDFLARED.ps1' and 'Run with PowerShell'.
        echo 2. Wait for it to finish downloading.
        echo 3. Click this batch file again.
        echo.
        pause
        exit /b
    ) else (
        set TUNNEL_CMD=cloudflared
    )
) else (
    set TUNNEL_CMD="%~dp0%EXE_FILE%"
)

echo [READY] starting Cloudflare Tunnel on port 5000...
echo [INFO] Look for a link starting with 'https://' below.
echo [INFO] You MUST use the 'https' link for PWA to install.
echo.
echo --------------------------------------------------------
%TUNNEL_CMD% tunnel --url http://localhost:5000
pause
