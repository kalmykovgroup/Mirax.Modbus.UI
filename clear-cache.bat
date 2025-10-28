@echo off
echo Clearing Vite cache...
rd /s /q "node_modules\.vite" 2>nul
echo Done!
echo.
echo Now restart your dev server with: npm run dev
echo Then press Ctrl+F5 in browser
pause
