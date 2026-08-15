@echo off
REM One-click launcher for stewards who don't use a terminal. Installs what is
REM missing, then runs the same `pnpm dev` documented in the README.
setlocal
title StewardPad
cd /d "%~dp0"

echo ==========================================
echo   StewardPad
echo ==========================================
echo.

REM --- Node -----------------------------------------------------------------
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Installing it now...
  echo.
  winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements
  if errorlevel 1 (
    echo.
    echo Could not install Node.js automatically.
    echo Opening the download page - install the LTS version, then run this file again.
    start "" https://nodejs.org
    pause
    exit /b 1
  )
  echo.
  echo Node.js installed. Please close this window and run this file again.
  pause
  exit /b 0
)

REM --- pnpm -----------------------------------------------------------------
where pnpm >nul 2>nul
if errorlevel 1 (
  echo Setting up pnpm...
  call corepack enable pnpm >nul 2>nul
  where pnpm >nul 2>nul
  if errorlevel 1 call npm install -g pnpm
  where pnpm >nul 2>nul
  if errorlevel 1 (
    echo.
    echo Could not install pnpm. See the Prerequisites section of README.md.
    pause
    exit /b 1
  )
)

REM --- Settings file --------------------------------------------------------
if not exist ".env" (
  echo Creating settings file .env from .env.example...
  copy /y ".env.example" ".env" >nul
)

REM --- Dependencies ---------------------------------------------------------
echo Checking dependencies. The first run takes a few minutes...
echo.
call pnpm install
if errorlevel 1 (
  echo.
  echo Dependency install failed. The error is above this line.
  pause
  exit /b 1
)

REM --- Start ----------------------------------------------------------------
echo.
echo Starting StewardPad. Your browser opens automatically when it is ready.
echo KEEP THIS WINDOW OPEN - closing it stops StewardPad.
echo.

REM Wait for Vite to actually accept connections before opening the tab. A
REM fixed sleep opens a dead page on a slow machine, which reads as "broken".
start "" /min powershell -NoProfile -Command "while($true){ try { (New-Object Net.Sockets.TcpClient).Connect('localhost',5173); break } catch { Start-Sleep -Milliseconds 500 } }; Start-Process 'http://localhost:5173'"

call pnpm dev

echo.
echo StewardPad has stopped.
pause
