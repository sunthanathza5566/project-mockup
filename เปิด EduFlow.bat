@echo off
chcp 65001 >nul 2>&1
title EduFlow — กำลังเริ่มระบบ...

echo.
echo  ╔══════════════════════════════╗
echo  ║   EduFlow — เริ่มระบบ        ║
echo  ╚══════════════════════════════╝
echo.

:: ลอง Python ก่อน (มักติดตั้งมาแล้วบน Windows)
python --version >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] พบ Python — เริ่มเซิร์ฟเวอร์ที่ http://localhost:3000
    echo.
    start "" python -m http.server 3000
    timeout /t 1 /nobreak >nul
    start http://localhost:3000
    echo  เปิด browser แล้ว — กด Ctrl+C ในหน้าต่างนี้เพื่อหยุดเซิร์ฟเวอร์
    echo.
    python -m http.server 3000
    goto :end
)

:: ลอง Node.js / npx
where node >nul 2>&1
if %errorlevel%==0 (
    echo  [OK] พบ Node.js — เริ่มเซิร์ฟเวอร์ที่ http://localhost:3000
    echo.
    start "" cmd /c "npx serve . -p 3000"
    timeout /t 2 /nobreak >nul
    start http://localhost:3000
    echo  เปิด browser แล้ว — ปิดหน้าต่างนี้เพื่อหยุดเซิร์ฟเวอร์
    echo.
    pause
    goto :end
)

:: ไม่พบทั้งคู่ — เปิดไฟล์ตรงๆ (CSS inline ทำให้ยังใช้งานได้)
echo  [INFO] ไม่พบ Python หรือ Node.js
echo  [INFO] เปิดไฟล์ตรงๆ — ระบบจะทำงานได้ปกติ (CSS ฝังในไฟล์แล้ว)
echo.
start "" "%~dp0index.html"
echo  เปิด EduFlow ใน browser แล้ว
echo.
pause

:end
