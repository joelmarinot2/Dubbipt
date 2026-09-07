@echo off
REM Busca Node: primero el del sistema, si no el portatil de esta maquina.
REM Devuelve la ruta en la variable NODE_EXE.
setlocal enabledelayedexpansion

set "NODE_EXE="
where node.exe >nul 2>&1 && set "NODE_EXE=node.exe"

if "%NODE_EXE%"=="" (
  if exist "%USERPROFILE%\node-portable\node-v20.19.1-win-x64\node.exe" (
    set "NODE_EXE=%USERPROFILE%\node-portable\node-v20.19.1-win-x64\node.exe"
  )
)
if "%NODE_EXE%"=="" (
  for /d %%D in ("%USERPROFILE%\node-portable\node-v*") do (
    if exist "%%D\node.exe" set "NODE_EXE=%%D\node.exe"
  )
)

endlocal & set "NODE_EXE=%NODE_EXE%"
