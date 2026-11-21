@echo off
chcp 65001 >nul
title 每週自動更新全台股資料 (TW_Stock_Assistant)

echo ===================================================================
echo   正在從證交所 OpenAPI、櫃買中心與公開資訊觀測站 (MOPS)
echo   批量抓取全台股（上市 + 上櫃 + ETF，共 2,000+ 檔）最新數據...
echo ===================================================================
echo.

cd /d "%~dp0"

REM 嘗試尋找本機 Python
set PYTHON_CMD=python
where python >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Python\bin\python.exe" (
        set PYTHON_CMD="%LOCALAPPDATA%\Python\bin\python.exe"
    ) else (
        echo [錯誤] 找不到 Python 執行檔！請確認系統已安裝 Python。
        pause
        exit /b 1
    )
)

echo 使用 Python: %PYTHON_CMD%
%PYTHON_CMD% -u fetch_stocks.py

if %errorlevel% equ 0 (
    echo.
    echo ===================================================================
    echo   [成功] 全台股資料已更新完成！
    echo   已同步更新: stocks.json、public\stocks.json 與 stocks_data.js
    echo   可直接重新整理 index.html 或執行 一鍵啟動.bat 查看最新數據。
    echo ===================================================================
) else (
    echo.
    echo [警告] 執行過程發生錯誤，請檢查網路連線或官方 API 回傳狀態。
)

echo.
pause
