@echo off
title Dubbipt - pruebas
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

"%NODE_EXE%" "%~dp0pruebas\correr.js"
set SALIDA=%ERRORLEVEL%

if not "%SALIDA%"=="0" (
  echo.
  echo   ^*^*^* HAY PRUEBAS EN ROJO ^*^*^*
  echo   No despliegues hasta arreglarlas.
  echo.
)

pause
exit /b %SALIDA%
