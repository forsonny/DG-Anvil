@echo off
setlocal
set HOOK_NAME=%~1
if "%HOOK_NAME%"=="" exit /b 0
set SCRIPT_DIR=%~dp0
set HOOK_SCRIPT=%SCRIPT_DIR%%HOOK_NAME%
for /f "delims=" %%i in ('where bash 2^>NUL') do set BASH_EXE=%%i
if "%BASH_EXE%"=="" (
  if exist "%ProgramFiles%\Git\bin\bash.exe" set BASH_EXE=%ProgramFiles%\Git\bin\bash.exe
)
if "%BASH_EXE%"=="" exit /b 0
"%BASH_EXE%" "%HOOK_SCRIPT%"
exit /b %errorlevel%
