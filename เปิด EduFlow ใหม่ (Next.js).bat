@echo off
chcp 65001 >nul 2>&1
title EduFlow (Next.js) — กำลังเริ่มระบบ...

echo.
echo  ╔══════════════════════════════════╗
echo  ║   EduFlow ^(Next.js^) — เริ่มระบบ   ║
echo  ╚══════════════════════════════════╝
echo.

where node >nul 2>&1
if not %errorlevel%==0 (
    echo  [ERROR] ไม่พบ Node.js — กรุณาติดตั้งจาก https://nodejs.org ก่อน
    echo.
    pause
    goto :end
)

cd /d "%~dp0eduflow-next"

if not exist node_modules (
    echo  [INFO] ติดตั้ง dependencies ครั้งแรก อาจใช้เวลา 1-2 นาที...
    echo.
    call npm install
    echo.
)

echo  [OK] เริ่มเซิร์ฟเวอร์ที่ http://localhost:3000
echo  เดี๋ยว browser จะเปิดเองใน 5 วินาที — กด Ctrl+C ในหน้าต่างนี้เพื่อหยุด
echo.

start "" cmd /c "timeout /t 5 /nobreak >nul & start http://localhost:3000"
call npm run dev

:end
