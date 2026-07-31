@echo off
setlocal enabledelayedexpansion

echo ========================================
echo Library System - Collection Decision Framework
echo ========================================
echo.

cd /d "%~dp0backend"
echo [1/3] Starting backend server (Python Flask)...
start "Backend Server" cmd /k "python app.py"

timeout /t 3 /nobreak >nul

cd /d "%~dp0frontend"
echo [2/3] Starting frontend server...
start "Frontend Server" cmd /k "npm run dev"

timeout /t 5 /nobreak >nul

echo [3/3] Application started!
echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:5000
echo.
echo Sample accounts (run seed.bat to load sample data):
echo   Admin: admin@library.edu / admin123
echo   User:  user1@university.edu / password123
echo.
echo Press any key to exit this window (servers will keep running)...
pause >nul
