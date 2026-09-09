@echo off
setlocal
where node >nul 2>nul || (echo Node.js 20+ is required. & pause & exit /b 1)
if not exist node_modules (echo Installing dependencies... & call npm install --no-audit --no-fund)
echo Starting ECHO...
call npm run dev
