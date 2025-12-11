@echo off
chcp 65001 >nul

:: 切换到脚本所在目录
cd /d "%~dp0"

echo ================================
echo MusePocket Electron 打包工具
echo ================================
echo.
echo 当前目录: %CD%
echo.

echo [1/4] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)
echo ✅ Node.js 已安装

echo.
echo [2/4] 清理旧的打包文件...
if exist release (
    echo 正在删除 release 目录...
    timeout /t 2 /nobreak >nul
    rd /s /q release 2>nul
    if exist release (
        echo ⚠️  无法删除 release 目录，可能有文件被占用
        echo 请手动关闭 release 目录中的所有程序后重试
        pause
        exit /b 1
    )
    echo ✅ 清理完成
) else (
    echo ✅ 无需清理
)

echo.
echo [3/4] 安装依赖...
echo 这可能需要几分钟时间，请耐心等待...
call npm install
if errorlevel 1 (
    echo ❌ 依赖安装失败
    pause
    exit /b 1
)
echo ✅ 依赖安装完成

echo.
echo [4/4] 打包 Electron 应用...
call npm run electron:build:win
if errorlevel 1 (
    echo ❌ 打包失败
    pause
    exit /b 1
)

echo.
echo ================================
echo ✅ 打包完成！
echo ================================
echo.
echo 安装包位置: release\MusePocket-1.0.0-x64.exe
echo.
echo 按任意键打开 release 文件夹...
pause >nul
explorer release
