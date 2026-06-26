@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\vite\bin\vite.js" exit /b 1

call npm run dev
