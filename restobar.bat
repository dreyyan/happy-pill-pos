@echo off
echo ==========================================
echo Starting Restobar POS (Backend + Frontend)
echo ==========================================

set ROOT=%~dp0

:: --- Backend ---
echo Starting backend...
start cmd /k "cd /d %ROOT%backend && npm run dev"

:: --- Frontend (ROOT) ---
echo Starting frontend...
start cmd /k "cd /d %ROOT% && npm run dev"

echo ==========================================
echo Restobar POS is starting...
echo ==========================================

pause