@echo off
cd /d "%~dp0dist"
start "" "http://127.0.0.1:8765"
python -m http.server 8765
