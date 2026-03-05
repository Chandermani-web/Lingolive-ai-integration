# Windows Installation Script for Speech-to-Speech Translation System
# Run this in PowerShell

Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host "  Speech-to-Speech Translation System - Windows Installation"
Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host ""

# Check Python version
Write-Host "Checking Python version..." -ForegroundColor Cyan
$pythonVersion = python --version 2>&1
Write-Host "  $pythonVersion"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Check if we're in a virtual environment (recommended)
$inVenv = $env:VIRTUAL_ENV
if ($inVenv) {
    Write-Host "  Virtual environment detected: $inVenv" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Not in a virtual environment. Consider creating one:" -ForegroundColor Yellow
    Write-Host "    python -m venv venv" -ForegroundColor Yellow
    Write-Host "    .\venv\Scripts\Activate.ps1" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 0
    }
}

Write-Host ""
Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host "  Step 1: Install PyTorch with CUDA Support"
Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host ""

Write-Host "Select installation method:"
Write-Host "  1. CUDA 12.1 (Recommended for RTX 4050)"
Write-Host "  2. CUDA 11.8 (Older CUDA version)"
Write-Host "  3. CPU only (No GPU acceleration)"
Write-Host "  4. Skip (PyTorch already installed)"
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host "Installing PyTorch with CUDA 12.1..." -ForegroundColor Green
        python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
    }
    "2" {
        Write-Host "Installing PyTorch with CUDA 11.8..." -ForegroundColor Green
        python -m pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
    }
    "3" {
        Write-Host "Installing PyTorch (CPU only)..." -ForegroundColor Green
        python -m pip install torch torchvision torchaudio
    }
    "4" {
        Write-Host "Skipping PyTorch installation..." -ForegroundColor Yellow
    }
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

# Verify PyTorch installation
Write-Host ""
Write-Host "Verifying PyTorch installation..." -ForegroundColor Cyan
$torchCheck = python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'CUDA Version: {torch.version.cuda if torch.cuda.is_available() else \"N/A\"}')" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $torchCheck -ForegroundColor Green
    Write-Host "  PyTorch installed successfully!" -ForegroundColor Green
} else {
    Write-Host "  ERROR: PyTorch installation failed!" -ForegroundColor Red
    Write-Host "  $torchCheck" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try one of these alternatives:" -ForegroundColor Yellow
    Write-Host "  1. Use conda: conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia" -ForegroundColor Yellow
    Write-Host "  2. Visit: https://pytorch.org/get-started/locally/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host "  Step 2: Install Other Dependencies"
Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host ""

Write-Host "Installing dependencies from requirements_speech_translation.txt..." -ForegroundColor Cyan

# Upgrade pip first
Write-Host "Upgrading pip..." -ForegroundColor Cyan
python -m pip install --upgrade pip

# Install requirements
if (Test-Path "requirements_speech_translation.txt") {
    python -m pip install -r requirements_speech_translation.txt
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Dependencies installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Some dependencies failed to install." -ForegroundColor Yellow
        Write-Host "  You may need to install them manually." -ForegroundColor Yellow
    }
} else {
    Write-Host "  ERROR: requirements_speech_translation.txt not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host "  Step 3: Verify Installation"
Write-Host "=" -NoNewline; Write-Host ("=" * 78)
Write-Host ""

Write-Host "Testing imports..." -ForegroundColor Cyan

$testScript = @"
import sys
packages = {
    'torch': 'PyTorch',
    'whisper': 'OpenAI Whisper',
    'transformers': 'HuggingFace Transformers',
    'TTS': 'Coqui TTS',
    'soundfile': 'SoundFile',
    'numpy': 'NumPy',
}

all_ok = True
for pkg, name in packages.items():
    try:
        __import__(pkg)
        print(f'✓ {name}')
    except ImportError:
        print(f'✗ {name} - Not installed')
        all_ok = False

sys.exit(0 if all_ok else 1)
"@

$testScript | python -

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" -NoNewline; Write-Host ("=" * 78)
    Write-Host "  Installation Complete!" -ForegroundColor Green
    Write-Host "=" -NoNewline; Write-Host ("=" * 78)
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run tests: python test_speech_system.py" -ForegroundColor White
    Write-Host "  2. Try example: python main_speech_translation.py --help" -ForegroundColor White
    Write-Host "  3. Read docs: README_SPEECH_TRANSLATION.md" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "=" -NoNewline; Write-Host ("=" * 78)
    Write-Host "  Installation Completed with Warnings" -ForegroundColor Yellow
    Write-Host "=" -NoNewline; Write-Host ("=" * 78)
    Write-Host ""
    Write-Host "Some packages are missing. Please install them manually." -ForegroundColor Yellow
    Write-Host "Check the output above for details." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
