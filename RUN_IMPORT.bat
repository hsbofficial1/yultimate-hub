@echo off
echo ================================================
echo   Tournament CSV Import - UDAAN 2025
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
echo Looking for CSV file...
set CSV_FILE=C:\Users\busin\Downloads\UDAAN 2025 - Hackathon Reference - Udaan 2025.csv

if not exist "%CSV_FILE%" (
    echo WARNING: CSV file not found at default location
    echo Expected: %CSV_FILE%
    echo.
    set /p CSV_FILE="Enter path to CSV file: "
)

if not exist "%CSV_FILE%" (
    echo ERROR: File does not exist: %CSV_FILE%
    pause
    exit /b 1
)

echo Found CSV file!
echo.

REM Check for environment file
if exist .env (
    echo Using .env file for credentials...
    python scripts\import_tournament_complete.py --csv "%CSV_FILE%"
) else (
    echo No .env file found.
    echo You'll need to provide Supabase credentials.
    echo.
    echo IMPORTANT: Use the service_role key (NOT the anon public key)
    echo Get it from: Supabase Dashboard -^> Settings -^> API -^> service_role (Reveal)
    echo.
    set /p SUPABASE_URL="Enter Supabase URL: "
    set /p SUPABASE_KEY="Enter Supabase service_role key: "
    
    python scripts\import_tournament_complete.py --csv "%CSV_FILE%" --supabase-url "%SUPABASE_URL%" --supabase-key "%SUPABASE_KEY%"
)

echo.
echo ================================================
echo   Import completed! Check Supabase dashboard.
echo ================================================
pause

