@echo off
chcp 65001 >nul

:: 切换到脚本所在目录
cd /d "%~dp0"

echo ================================
echo 清理 Electron 打包文件
echo ================================
echo.
echo 当前目录: %CD%
echo.

echo 正在清理...
echo.

:: 强制结束可能占用文件的进程
taskkill /f /im MusePocket.exe 2>nul
timeout /t 1 /nobreak >nul

:: 清理 release 目录
if exist release (
    echo 删除 release 目录...
    rd /s /q release 2>nul
    if exist release (
        echo.
        echo ⚠️  部分文件无法删除，正在尝试强制删除...
        timeout /t 2 /nobreak >nul
        rd /s /q release 2>nul
    )

    if exist release (
        echo.
        echo ❌ 仍有文件无法删除
        echo 请手动删除 release 目录或重启电脑后再试
        pause
        exit /b 1
    )
    echo ✅ release 目录已删除
) else (
    echo ✅ release 目录不存在，无需清理
)

:: 清理 node_modules/.cache
if exist node_modules\.cache (
    echo 删除构建缓存...
    rd /s /q node_modules\.cache 2>nul
    echo ✅ 缓存已清理
)

:: 清理 dist 目录（可选）
if exist dist (
    echo 删除旧的构建文件...
    rd /s /q dist 2>nul
    echo ✅ dist 目录已删除
)

echo.
echo ================================
echo ✅ 清理完成！
echo ================================
echo.
pause
