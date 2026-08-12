@echo off
title DOCTAR Frontend — Starting...
echo.
echo  ============================
echo   DOCTAR Frontend - Starting
echo  ============================
echo.
echo  NOTE: This only starts the frontend (Next.js, port 3000).
echo  The backend API (DOCTAR API) is a separate project now - start it
echo  on its own from wherever you cloned it, e.g.:
echo    cd path\to\Doctar-AI-Backend ^&^& npm run dev
echo  and make sure NEXT_PUBLIC_API_URL in .env.local points at it.
echo.

npm run dev

pause
