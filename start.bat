@echo off
chcp 65001 >nul
title 기업교육 발표자료 생성기

cd /d "%~dp0"

if not exist node_modules (
    echo [설치] 패키지 설치 중...
    call npm install
    echo.
)

if not exist input mkdir input
if not exist output\pptx mkdir output\pptx
if not exist output\web mkdir output\web

echo ========================================
echo   기업교육 발표자료 생성기 v1.0
echo ========================================
echo.
echo [1] input 폴더에 교육자료 넣기
echo [2] Claude Code에게 "발표자료 만들어줘" 요청
echo [3] 웹 UI에서 결과 확인
echo.

:: 포트 충돌 체크
echo [체크] 포트 8220 확인 중...
netstat -ano | findstr ":8220 " | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 (
    echo.
    echo [경고] 포트 8220이 이미 사용 중입니다!
    echo        다른 프로세스가 이 포트를 점유하고 있습니다.
    echo        기존 프로세스를 종료하거나, server.js의 포트를 변경하세요.
    echo.
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8220 " ^| findstr "LISTENING"') do (
        echo        사용 중인 PID: %%a
    )
    echo.
    pause
    exit /b 1
) else (
    echo [체크] 포트 8220 사용 가능
)
echo.

:: npm 업데이트 체크 (선택사항)
echo [체크] 패키지 업데이트 확인 중...
npm outdated 2>nul
if %errorlevel%==0 (
    echo [정보] 위 패키지들의 새 버전이 있습니다. npm update 로 업데이트 가능합니다.
) else (
    echo [정보] 모든 패키지가 최신입니다.
)
echo.

:: 브라우저 선택 (Chrome 우선)
echo [시작] 브라우저를 열고 있습니다...
where chrome >nul 2>&1
if %errorlevel%==0 (
    start chrome http://localhost:8220
    goto :server
)

:: Chrome 기본 설치 경로 확인
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" http://localhost:8220
    goto :server
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" http://localhost:8220
    goto :server
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" http://localhost:8220
    goto :server
)

:: Chrome을 못 찾으면 기본 브라우저로 열기
start http://localhost:8220

:server
echo.
echo [서버] 서버를 시작합니다. 종료하려면 Ctrl+C를 누르세요.
echo.
node server.js

echo.
echo ========================================
echo   서버가 종료되었습니다.
echo ========================================
echo.
pause
