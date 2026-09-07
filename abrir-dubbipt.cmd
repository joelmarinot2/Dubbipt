@echo off
title Dubbipt - servidor local
cd /d "%~dp0"

call "%~dp0local\node.cmd"

if "%NODE_EXE%"=="" (
  echo.
  echo   No encuentro Node en este equipo.
  echo.
  echo   Instalalo desde  https://nodejs.org  ^(version LTS^),
  echo   o deja una copia portatil en:
  echo     %USERPROFILE%\node-portable\node-v20.19.1-win-x64\
  echo.
  pause
  exit /b 1
)

echo.
echo   Arrancando Dubbipt...
start "" http://localhost:8080
"%NODE_EXE%" "%~dp0local\servidor.js" 8080
pause
