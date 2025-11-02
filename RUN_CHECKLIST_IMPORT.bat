@echo off
echo ================================================
echo   Tournament Planning Checklist Import
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.7+ from python.org
    pause
    exit /b 1
)

echo Checking for required packages...
python -m pip show supabase >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    python -m pip install supabase python-dotenv --quiet
    echo Done!
)

echo.
echo Finding tournament checklist CSV...

REM CSV file path
set CSV_FILE=scripts\tournament_checklist_template.csv

if not exist "%CSV_FILE%" (
    echo ERROR: CSV file not found at: %CSV_FILE%
    pause
    exit /b 1
)

echo Found CSV file: %CSV_FILE%
echo.

REM Tournament ID - update this with your actual tournament ID
set TOURNAMENT_ID=b696c04b-ac49-4763-9ccd-1460b236f9ac

echo Tournament ID: %TOURNAMENT_ID%
echo.

REM Check for environment file
if exist .env (
    echo Using .env file for credentials...
    python scripts\import_checklist_items.py --csv "%CSV_FILE%" --tournament-id %TOURNAMENT_ID%
) else (
    echo No .env file found.
    echo You'll need to provide Supabase credentials.
    echo.
    echo IMPORTANT: Use the service_role key (NOT the anon public key)
    echo Get it from: Supabase Dashboard -^> Settings -^> API -^> service_role (Reveal)
    echo.
    set /p SUPABASE_URL="Enter Supabase URL: "
    set /p SUPABASE_KEY="Enter Supabase service_role key: "
    
    python scripts\import_checklist_items.py --csv "%CSV_FILE%" --tournament-id %TOURNAMENT_ID% --supabase-url "%SUPABASE_URL%" --supabase-key "%SUPABASE_KEY%"
)

echo.
echo ================================================
echo   Import completed! Check Planning tab in app.
echo ================================================
pause

