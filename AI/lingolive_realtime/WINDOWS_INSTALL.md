# Windows Installation Guide

## ⚠️ PyTorch Installation Fix

If you're getting the error:
```
ERROR: Could not find a version that satisfies the requirement torch
```

This means the PyTorch index URL needs to be updated. Follow the steps below:

## 🚀 Quick Installation (3 Methods)

### Method 1: Automated Script (Easiest)

```powershell
cd Lingolive-ai-integration\AI\lingolive_realtime
.\install_windows.bat
```

This will automatically install everything you need.

### Method 2: Manual Installation (Step-by-step)

#### Step 1: Install PyTorch with CUDA

**Option A: CUDA 12.1 (Recommended for RTX 4050)**
```powershell
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

**Option B: CUDA 11.8 (If you have older CUDA)**
```powershell
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
```

**Option C: CPU Only (No GPU)**
```powershell
pip3 install torch torchvision torchaudio
```

#### Step 2: Verify PyTorch Installation

```powershell
python -c "import torch; print('PyTorch:', torch.__version__); print('CUDA:', torch.cuda.is_available())"
```

You should see:
```
PyTorch: 2.x.x
CUDA: True
```

#### Step 3: Install Other Dependencies

```powershell
pip install -r requirements_speech_translation.txt
```

### Method 3: Using Conda (Alternative)

If pip installation fails, try using conda:

```powershell
# Create conda environment
conda create -n speech_translation python=3.10

# Activate environment
conda activate speech_translation

# Install PyTorch with CUDA
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia

# Install other dependencies
pip install -r requirements_speech_translation.txt
```

## 🔧 Troubleshooting

### Issue 1: "Could not find a version that satisfies the requirement torch"

**Solution**: Use the CUDA 12.1 index URL or install from conda

```powershell
# Try this:
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Or use conda:
conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia
```

### Issue 2: "CUDA not available" after installation

**Check CUDA drivers**:
```powershell
nvidia-smi
```

If this fails, you need to install NVIDIA drivers:
- Download from: https://www.nvidia.com/Download/index.aspx
- Select RTX 4050 Laptop GPU
- Install drivers
- Restart computer

### Issue 3: Virtual environment issues

**Create a fresh virtual environment**:
```powershell
# Navigate to project directory
cd Lingolive-ai-integration\AI\lingolive_realtime

# Create new venv
python -m venv venv

# Activate it
.\venv\Scripts\Activate.ps1

# Install PyTorch first
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Then install other dependencies
pip install -r requirements_speech_translation.txt
```

### Issue 4: PowerShell execution policy error

If you get "cannot be loaded because running scripts is disabled":

```powershell
# Run this as Administrator:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## ✅ Verify Installation

After installation, run the test script:

```powershell
python test_speech_system.py
```

This will verify that all components are working correctly.

## 📌 Quick Reference

### Check Installed Versions
```powershell
python -c "import torch; print('PyTorch:', torch.__version__)"
python -c "import transformers; print('Transformers:', transformers.__version__)"
python -c "import TTS; print('TTS:', TTS.__version__)"
python -c "import whisper; print('Whisper installed')"
```

### Check GPU Status
```powershell
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"None\"}')"
```

## 🎯 Recommended Installation for Windows + RTX 4050

```powershell
# 1. Create virtual environment
python -m venv venv
.\venv\Scripts\Activate.ps1

# 2. Install PyTorch with CUDA 12.1
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# 3. Install other dependencies
pip install openai-whisper transformers sentencepiece TTS soundfile numpy loguru tqdm

# 4. Test
python test_speech_system.py
```

## 💡 Still Having Issues?

1. **Check Python version**: `python --version` (should be 3.8+)
2. **Update pip**: `python -m pip install --upgrade pip`
3. **Clear pip cache**: `pip cache purge`
4. **Try conda**: Switch to conda installation method
5. **Check antivirus**: Temporarily disable if blocking downloads

## 📚 Next Steps

Once installed successfully:

1. ✅ Read [QUICKSTART.md](QUICKSTART.md) for basic usage
2. ✅ Read [README_SPEECH_TRANSLATION.md](README_SPEECH_TRANSLATION.md) for full docs
3. ✅ Try examples: `python main_speech_translation.py --help`

## 🔗 Resources

- **PyTorch Windows Install**: https://pytorch.org/get-started/locally/
- **NVIDIA Drivers**: https://www.nvidia.com/Download/index.aspx
- **CUDA Toolkit**: https://developer.nvidia.com/cuda-downloads

---

**Need more help?** Open an issue with:
- Python version: `python --version`
- Pip version: `pip --version`
- CUDA status: `nvidia-smi`
- Error message
