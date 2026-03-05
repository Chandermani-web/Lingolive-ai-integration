"""
Setup and Installation Script for Speech-to-Speech Translation System
"""
import subprocess
import sys
import platform
import torch


def print_header(text):
    """Print formatted header"""
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80 + "\n")


def check_python_version():
    """Check if Python version is compatible"""
    print_header("Checking Python Version")
    
    version = sys.version_info
    print(f"Python Version: {version.major}.{version.minor}.{version.micro}")
    
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python 3.8+ required!")
        return False
    
    print("✅ Python version OK")
    return True


def check_cuda():
    """Check CUDA availability"""
    print_header("Checking CUDA")
    
    if not torch.cuda.is_available():
        print("⚠️  CUDA not available. Will use CPU (slower)")
        return False
    
    print("✅ CUDA Available")
    print(f"   PyTorch Version: {torch.__version__}")
    print(f"   CUDA Version: {torch.version.cuda}")
    print(f"   GPU Device: {torch.cuda.get_device_name(0)}")
    
    props = torch.cuda.get_device_properties(0)
    vram_gb = props.total_memory / 1024**3
    print(f"   GPU Memory: {vram_gb:.2f} GB")
    
    if vram_gb < 6:
        print(f"⚠️  Warning: GPU has {vram_gb:.2f}GB VRAM. 6GB+ recommended")
    
    return True


def install_pytorch():
    """Guide user to install PyTorch with CUDA support"""
    print_header("PyTorch Installation")
    
    try:
        import torch
        print(f"✅ PyTorch already installed: {torch.__version__}")
        return True
    except ImportError:
        print("❌ PyTorch not found")
        print("\nPlease install PyTorch with CUDA support:")
        print("\nFor CUDA 11.8:")
        print("  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118")
        print("\nFor CUDA 12.1:")
        print("  pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121")
        print("\nAfter installation, run this script again.")
        return False


def install_requirements():
    """Install requirements from requirements file"""
    print_header("Installing Requirements")
    
    requirements_file = "requirements_speech_translation.txt"
    
    try:
        print(f"Installing from {requirements_file}...")
        subprocess.check_call([
            sys.executable, "-m", "pip", "install", "-r", requirements_file
        ])
        print("✅ Requirements installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install requirements: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ Requirements file not found: {requirements_file}")
        return False


def test_imports():
    """Test if all required packages can be imported"""
    print_header("Testing Imports")
    
    packages = [
        ("torch", "PyTorch"),
        ("whisper", "OpenAI Whisper"),
        ("transformers", "HuggingFace Transformers"),
        ("TTS", "Coqui TTS"),
        ("soundfile", "SoundFile"),
        ("numpy", "NumPy"),
    ]
    
    all_ok = True
    for package, name in packages:
        try:
            __import__(package)
            print(f"✅ {name}")
        except ImportError:
            print(f"❌ {name} - Not installed")
            all_ok = False
    
    return all_ok


def download_models():
    """Download required models"""
    print_header("Downloading Models")
    
    print("This will download ~5-10GB of models. Continue? (y/n): ", end="")
    response = input().lower()
    
    if response != 'y':
        print("Skipping model download. Models will be downloaded on first use.")
        return True
    
    try:
        print("\n1. Downloading Whisper model...")
        import whisper
        whisper.load_model("small")
        print("✅ Whisper model downloaded")
        
        print("\n2. Downloading IndicTrans2 models...")
        from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
        
        print("   - English to Indic...")
        AutoTokenizer.from_pretrained("ai4bharat/indictrans2-en-indic-1B", trust_remote_code=True)
        AutoModelForSeq2SeqLM.from_pretrained("ai4bharat/indictrans2-en-indic-1B", trust_remote_code=True)
        
        print("   - Indic to English...")
        AutoTokenizer.from_pretrained("ai4bharat/indictrans2-indic-en-1B", trust_remote_code=True)
        AutoModelForSeq2SeqLM.from_pretrained("ai4bharat/indictrans2-indic-en-1B", trust_remote_code=True)
        
        print("✅ IndicTrans2 models downloaded")
        
        print("\n3. Downloading TTS model...")
        from TTS.api import TTS
        TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=True, gpu=False)
        print("✅ TTS model downloaded")
        
        return True
        
    except Exception as e:
        print(f"⚠️  Error downloading models: {e}")
        print("Models will be downloaded automatically on first use.")
        return False


def verify_installation():
    """Verify the installation by running a quick test"""
    print_header("Verifying Installation")
    
    try:
        print("Testing module imports...")
        from ai import ASRModule, TranslationModule, TTSModule, SpeechToSpeechPipeline
        print("✅ All modules imported successfully")
        
        print("\nChecking GPU availability...")
        import torch
        if torch.cuda.is_available():
            print(f"✅ GPU available: {torch.cuda.get_device_name(0)}")
        else:
            print("⚠️  GPU not available, will use CPU")
        
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False


def main():
    """Main setup function"""
    
    print("""
╔════════════════════════════════════════════════════════════════════════════╗
║                                                                            ║
║           Speech-to-Speech Translation System - Setup Script              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
    """)
    
    print(f"Platform: {platform.system()} {platform.release()}")
    print(f"Python: {sys.version}")
    
    # Step 1: Check Python version
    if not check_python_version():
        sys.exit(1)
    
    # Step 2: Check/Install PyTorch
    if not install_pytorch():
        sys.exit(1)
    
    # Step 3: Check CUDA
    has_cuda = check_cuda()
    
    # Step 4: Install requirements
    print("\nInstall requirements? (y/n): ", end="")
    if input().lower() == 'y':
        if not install_requirements():
            print("\n⚠️  Some packages failed to install. Please install manually.")
    
    # Step 5: Test imports
    if not test_imports():
        print("\n⚠️  Some packages are missing. Please install them manually.")
        sys.exit(1)
    
    # Step 6: Download models (optional)
    download_models()
    
    # Step 7: Verify installation
    verify_installation()
    
    # Final message
    print_header("Setup Complete!")
    
    print("""
✅ Installation completed successfully!

Next steps:
1. Run example: python main_speech_translation.py --help
2. Test system: python test_system.py
3. Read documentation: README_SPEECH_TRANSLATION.md

Quick test:
    python main_speech_translation.py input.wav -s english -t hindi -o output.wav

""")
    
    if not has_cuda:
        print("⚠️  NOTE: CUDA not available. System will run on CPU (significantly slower).")
        print("    For GPU acceleration, install CUDA and reinstall PyTorch with CUDA support.\n")


if __name__ == "__main__":
    main()
