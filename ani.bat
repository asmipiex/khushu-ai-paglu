@echo off
title Khushi AI Paglu - Server
chcp 65001 >nul 2>&1
color 0D
echo.
echo   +--------------------------------------------+
echo   :   Khushi AI Paglu - Starting Server...     :
echo   +--------------------------------------------+
echo.
cd /d "%~dp0"
python serve.py 1111
pause
