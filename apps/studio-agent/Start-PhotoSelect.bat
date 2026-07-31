@echo off
:: Start PowerShell and bypass execution policy to run the launcher script
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\launcher.ps1"
