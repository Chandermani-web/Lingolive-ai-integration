@echo off
REM Windows Batch Installation Script for Speech-to-Speech Translation System
REM Simple version - just runs the commands

echo ============================================================================
echo   Speech-to-Speech Translation System - Quick Install
echo ============================================================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+ first.
    pause
    exit /b 1
)

echo Detected Python version:
python --version
echo.

echo ============================================================================
echo   Step 1: Install PyTorch with CUDA 12.1
echo ============================================================================
echo.
echo Installing PyTorch... This may take a few minutes...
echo.

python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

if errorlevel 1 (
    echo.
    echo WARNING: PyTorch installation with CUDA 12.1 failed.
    echo Trying CPU-only version...
    python -m pip install torch torchvision torchaudio
)

echo.
echo Verifying PyTorch installation...
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA Available:', torch.cuda.is_available())"

if errorlevel 1 (
    echo.
    echo ERROR: PyTorch installation failed!
    echo Please install manually from: https://pytorch.org/get-started/locally/
    pause
    exit /b 1
)

echo.
echo ============================================================================
echo   Step 2: Install Other Dependencies
echo ============================================================================
echo.

if not exist "requirements_speech_translation.txt" (
    echo ERROR: requirements_speech_translation.txt not found!
    pause
    exit /b 1
)

echo Upgrading pip...
python -m pip install --upgrade pip

echo.
echo Installing dependencies...
python -m pip install -r requirements_speech_translation.txt

echo.
echo ============================================================================
echo   Installation Complete!
echo ============================================================================
echo.
echo Next steps:
echo   1. Run: python test_speech_system.py
echo   2. Try: python main_speech_translation.py --help
echo   3. Read: README_SPEECH_TRANSLATION.md
echo.
pause
