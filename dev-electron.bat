@echo off
chcp 65001 >nul

:: 切换到脚本所在目录
cd /d "%~dp0"

echo ================================
echo MusePocket Electron 开发模式
echo ================================
echo.
echo 当前目录: %CD%
echo.

echo 正在启动开发环境...
echo.
echo 这将：
echo 1. 启动 Vite 开发服务器
echo 2. 启动 Electron 窗口
echo.
echo 请等待浏览器窗口打开...
echo.

call npm run electron:dev
