@echo off
title L2Realm — Запуск

echo  ==============================
echo   L2Realm — Запуск проекта
echo  ==============================
echo.

:: Backend
start "L2Realm Backend" cmd /k "cd /d "%~dp0backend" && npm run start:dev"

:: Небольшая задержка чтобы backend успел стартовать
timeout /t 3 /nobreak > nul

:: Frontend
start "L2Realm Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo  Backend:  http://localhost:4000
echo  Frontend: http://localhost:3000
echo  Swagger:  http://localhost:4000/api/docs
echo.
echo  Два окна открылись — не закрывай их!
echo.
pause
