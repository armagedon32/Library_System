@echo off
cd /d "%~dp0backend"
echo Seeding database with Python...
python seed.py
pause