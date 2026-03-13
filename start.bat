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

start http://localhost:8220
node server.js
