# Usage: powershell -ExecutionPolicy Bypass -File .\sync.ps1 "what changed"
# Pushes this folder to GitHub, then updates the working copy in C:\dev\shiloh-events.
param([string]$m = "Update app")
Set-Location $PSScriptRoot
git pull
git add -A
git commit -m $m
git push
git -C C:\dev\shiloh-events pull
