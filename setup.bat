@echo off
REM MedMap Backend Setup Script
echo ===================================
echo MedMap Backend Setup
echo ===================================

REM Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo Please install Python 3.12+ from the Microsoft Store or python.org
    echo and ensure "Add to PATH" is checked.
    pause
    exit /b 1
)

echo [INFO] Python found.

REM Install dependencies
echo [INFO] Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install dependencies.
    pause
    exit /b 1
)

REM Run migrations
echo [INFO] Running database migrations...
python manage.py makemigrations users core payments
python manage.py migrate
if %errorlevel% neq 0 (
    echo [ERROR] Failed to run migrations.
    pause
    exit /b 1
)

echo [SUCCESS] Setup complete!
echo.
echo To run the server, use: run_server.bat
echo To create a superuser, run: python manage.py createsuperuser
echo.
pause
