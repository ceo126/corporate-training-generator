@echo off
chcp 65001 >/dev/null
echo ==========================================
echo   12.기업교육발표자료 - 초기 설정
echo ==========================================
echo.

REM 1. npm 패키지 설치
echo [1/2] npm install 실행 중...
cd /d "
call npm install
echo.

REM 2. .env 설정 안내
echo [2/2] 추가 설정 없음
echo.
echo ==========================================
echo   설정 완료!necho   start.bat 으로 실행
echo ==========================================
pause