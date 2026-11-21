@echo off
chcp 65001 >nul
title 啟動台股殖利率與配息篩選 (TW_Stock_Assistant)

echo ===================================================================
echo   正在啟動「台股殖利率與配息篩選」本地服務...
echo ===================================================================
echo.

cd /d "%~dp0"

REM 檢查是否有 Python 可啟動本地伺服器
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] 偵測到 Python 環境，正在啟動本機伺服器 (Port 8000)...
    echo.
    echo 伺服器網址: http://localhost:8000
    echo (瀏覽器將在 2 秒後自動開啟，如要結束請關閉此視窗)
    echo.
    start "" http://localhost:8000
    python -m http.server 8000
    goto end
)

REM 檢查是否有 Python 安裝在使用者 AppData
if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
    echo [OK] 偵測到使用者 Python 環境，正在啟動本機伺服器 (Port 8000)...
    echo.
    echo 伺服器網址: http://localhost:8000
    echo (瀏覽器將在 2 秒後自動開啟，如要結束請關閉此視窗)
    echo.
    start "" http://localhost:8000
    "%LOCALAPPDATA%\Python\bin\python.exe" -m http.server 8000
    goto end
)

REM 若無伺服器環境，直接以瀏覽器開啟網頁
echo [INFO] 未偵測到 Python 伺服器，將直接使用預設瀏覽器開啟 index.html...
echo.
start "" "%~dp0index.html"

:end
