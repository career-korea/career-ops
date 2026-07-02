@echo off
echo Starting career-ops servers...

start "Backend" cmd /k "cd /d C:\Users\parkh\Desktop\questory\career-ops\web-wrapper\backend && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

start "Frontend" cmd /k "cd /d C:\Users\parkh\Desktop\questory\career-ops\web-wrapper\frontend && npm run dev"

echo Done. Open http://localhost:5173
