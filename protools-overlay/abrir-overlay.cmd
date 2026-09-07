@echo off
title Overlay para Pro Tools
cd /d "%~dp0"

call "%~dp0..\local\node.cmd"

if "%NODE_EXE%"=="" (
  echo.
  echo   No encuentro Node en este equipo. Instalalo desde https://nodejs.org
  echo.
  pause
  exit /b 1
)

if not exist "%~dp0node_modules\electron\dist\electron.exe" (
  echo.
  echo   Faltan las dependencias. Instalandolas ^(tarda un minuto^)...
  echo.
  for %%N in ("%NODE_EXE%") do set "NODE_DIR=%%~dpN"
  call "%NODE_DIR%npm.cmd" install --no-audit --no-fund
)

echo.
echo   Arrancando el overlay...
"%~dp0node_modules\electron\dist\electron.exe" "%~dp0."
