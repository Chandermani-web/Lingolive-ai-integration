# Real-time Multilingual Speech-to-Speech Translation System

A production-ready speech-to-speech translation system optimized for RTX 4050 GPU (6GB VRAM), supporting 10+ Indian languages with state-of-the-art models.

## 🌟 Features

- **Automatic Speech Recognition (ASR)**: Whisper (small model) for accurate speech-to-text
- **Neural Machine Translation**: IndicTrans2 for high-quality multilingual translation
- **Text-to-Speech (TTS)**: Coqui TTS (XTTS v2) for natural voice synthesis
- **GPU Optimization**: Float16 inference, CUDA support, optimized for 6GB VRAM
- **10+ Indian Languages**: Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu, and more
- **Clean Architecture**: Modular design with ASRModule, TranslationModule, TTSModule, and SpeechToSpeechPipeline
- **Production Ready**: Singleton pattern, error handling, performance monitoring, logging

## 📋 System Requirements

### Hardware
- **GPU**: NVIDIA RTX 4050 (6GB VRAM) or better
- **RAM**: 16GB+ recommended
- **Storage**: 10GB+ for models

### Software
- Python 3.8+ (**Python 3.9-3.11** recommended for full Coqui TTS support)
- CUDA 11.8 or 12.1
- Windows/Linux
- **HuggingFace Account** (required for IndicTrans2 model access)

## 🚀 Installation

### ⚠️ CRITICAL: HuggingFace Authentication Required

**Before installing, you MUST authenticate with HuggingFace** to access the IndicTrans2 translation models.

📖 **[See Complete Setup Guide: HUGGINGFACE_SETUP.md](HUGGINGFACE_SETUP.md)**

**Quick Setup:**
1. Create account: [https://huggingface.co/join](https://huggingface.co/join)
2. Request access to models:
   - [ai4bharat/indictrans2-en-indic-1B](https://huggingface.co/ai4bharat/indictrans2-en-indic-1B)
   - [ai4bharat/indictrans2-indic-en-1B](https://huggingface.co/ai4bharat/indictrans2-indic-en-1B)
3. Create access token: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
4. Login: `huggingface-cli login` (paste your token)

### Step 1: Install PyTorch with CUDA Support

```bash
# For CUDA 11.8
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# For CUDA 12.1 (recommended)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

### Step 2: Install Dependencies

```bash
pip install -r requirements_speech_translation.txt
```

### Step 3: Verify Installation

```python
import torch
print(f"CUDA Available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0)}")
```

## 📖 Quick Start

### Basic Usage

```python
from ai import translate_speech

# Translate speech from English to Hindi
translate_speech(
    input_audio="english_speech.wav",
    output_audio="hindi_speech.wav",
    source_language="english",
    target_language="hindi"
)
```

### Complete Pipeline

```python
from ai import SpeechToSpeechPipeline

# Initialize pipeline
pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="tamil"
)

# Process audio with intermediate results
result = pipeline.process(
    input_audio="input.wav",
    output_path="output.wav",
    return_intermediate=True
)

print(f"Transcription: {result['transcription']}")
print(f"Translation: {result['translation']}")
print(f"Total time: {result['timings']['total']:.2f}s")
```

### Command Line Interface

```bash
# Basic translation
python main_speech_translation.py input.wav -s english -t hindi -o output.wav

# With verbose output
python main_speech_translation.py input.wav -s english -t tamil -o output.wav -v

# List supported languages
python main_speech_translation.py --list-languages
```

## 🏗️ Architecture

### System Design

```
Input Audio → ASRModule (Whisper) → TranslationModule (IndicTrans2) → TTSModule (Coqui TTS) → Output Audio
```

### Core Components

#### 1. ASRModule (asr_module.py)
- **Model**: Whisper (small)
- **Features**: Speech-to-text with language detection
- **Optimization**: Float16 inference, GPU acceleration
- **Usage**:
```python
from ai import ASRModule

asr = ASRModule()
result = asr.transcribe_file("audio.wav", language="en")
print(result['text'])
```

#### 2. TranslationModule (translation_module.py)
- **Model**: IndicTrans2 (1B parameters)
- **Features**: English ↔ Indian languages, Indian ↔ Indian languages
- **Optimization**: Float16, batching support
- **Usage**:
```python
from ai import TranslationModule

translator = TranslationModule()
translation = translator.translate(
    "Hello, how are you?",
    source_lang="english",
    target_lang="hindi"
)
print(translation)
```

#### 3. TTSModule (tts_module.py)
- **Model**: Coqui TTS XTTS v2
- **Features**: Multilingual synthesis, voice cloning support
- **Optimization**: GPU acceleration
- **Usage**:
```python
from ai import TTSModule

tts = TTSModule()
audio = tts.synthesize("नमस्ते", language="hindi")
tts.synthesize_to_file("नमस्ते", "output.wav", language="hindi")
```

#### 4. SpeechToSpeechPipeline (speech_pipeline.py)
- **Integration**: Combines all three modules
- **Features**: End-to-end processing, batch support, performance monitoring
- **Usage**: See Quick Start section

## 🌍 Supported Languages

| Language   | Code      | ASR | Translation | TTS |
|-----------|-----------|-----|-------------|-----|
| English   | eng_Latn  | ✅  | ✅          | ✅  |
| Hindi     | hin_Deva  | ✅  | ✅          | ✅  |
| Bengali   | ben_Beng  | ✅  | ✅          | ✅  |
| Tamil     | tam_Tamil | ✅  | ✅          | ✅  |
| Telugu    | tel_Telu  | ✅  | ✅          | ✅  |
| Marathi   | mar_Deva  | ✅  | ✅          | ✅  |
| Gujarati  | guj_Gujr  | ✅  | ✅          | ✅  |
| Kannada   | kan_Knda  | ✅  | ✅          | ✅  |
| Malayalam | mal_Mlym  | ✅  | ✅          | ✅  |
| Punjabi   | pan_Guru  | ✅  | ✅          | ✅  |
| Urdu      | urd_Arab  | ✅  | ✅          | ❌  |
| Odia      | ory_Orya  | ✅  | ✅          | ❌  |
| Assamese  | asm_Beng  | ✅  | ✅          | ❌  |
| Sanskrit  | san_Deva  | ✅  | ✅          | ❌  |

## 💡 Usage Examples

### Example 1: Individual Modules

```python
from ai import ASRModule, TranslationModule, TTSModule

# Step 1: Speech to Text
asr = ASRModule()
text = asr.transcribe_file("english_speech.wav")['text']
print(f"Transcription: {text}")

# Step 2: Translate
translator = TranslationModule()
translated = translator.translate(text, "english", "hindi")
print(f"Translation: {translated}")

# Step 3: Text to Speech
tts = TTSModule()
tts.synthesize_to_file(translated, "hindi_speech.wav", "hindi")
```

### Example 2: Batch Processing

```python
from ai import SpeechToSpeechPipeline

pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi"
)

# Process multiple files
results = pipeline.process_batch(
    input_files=["audio1.wav", "audio2.wav", "audio3.wav"],
    output_dir="translated_output"
)

# Print statistics
pipeline.print_performance_stats()
```

### Example 3: Multiple Target Languages

```python
from ai import SpeechToSpeechPipeline

input_audio = "english_speech.wav"
target_languages = ["hindi", "tamil", "bengali", "telugu"]

for target in target_languages:
    pipeline = SpeechToSpeechPipeline(
        source_language="english",
        target_language=target
    )
    
    pipeline.process(
        input_audio,
        output_path=f"output_{target}.wav"
    )
```

### Example 4: Streaming/Chunk Processing

```python
from ai import SpeechToSpeechPipeline
import numpy as np

pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi"
)

# Process audio chunk (e.g., from microphone)
audio_chunk = np.random.randn(16000 * 3)  # 3 seconds of audio
output_audio = pipeline.process_chunk(audio_chunk, is_final=False)

if output_audio is not None:
    # Play or save output_audio
    pass
```

## ⚙️ Configuration

Configuration is defined in [config.py](ai/config.py):

```python
from ai.config import config

# View current configuration
print(f"Device: {config.device}")
print(f"Whisper Model: {config.whisper_model_size}")
print(f"Sample Rate: {config.audio_sample_rate}")

# Modify configuration (before initializing modules)
config.whisper_model_size = "medium"  # For better accuracy
config.audio_chunk_duration = 5.0     # Longer chunks
```

### Key Configuration Options

- `device`: "cuda" or "cpu"
- `dtype`: torch.float16 (GPU) or torch.float32 (CPU)
- `whisper_model_size`: "tiny", "base", "small", "medium", "large"
- `audio_sample_rate`: 16000 (default for Whisper)
- `audio_chunk_duration`: Duration of audio chunks in seconds
- `indictrans_batch_size`: Batch size for translation
- `tts_sample_rate`: Output audio sample rate

## 🎯 Performance Optimization

### Memory Optimization (RTX 4050 6GB VRAM)

1. **Float16 Inference**: All models use float16 on GPU
2. **Singleton Pattern**: Models loaded once and reused
3. **Chunk Processing**: Audio processed in manageable chunks
4. **Cache Management**: Automatic CUDA cache clearing

### Performance Tips

```python
from ai import SpeechToSpeechPipeline

pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi",
    load_both_translation_directions=False  # Save memory
)

# Clear cache after processing
pipeline.clear_cache()

# Get system info
info = pipeline.get_system_info()
print(info)
```

### Expected Performance (RTX 4050)

- **ASR**: ~0.5-2s for 10s audio
- **Translation**: ~0.2-1s per sentence
- **TTS**: ~1-3s for 20 words
- **Total**: ~2-6s for 10s audio (real-time factor: 0.2-0.6x)

## 📊 Monitoring and Logging

```python
from ai import SpeechToSpeechPipeline

pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi"
)

# Process with detailed results
result = pipeline.process(
    "input.wav",
    return_intermediate=True
)

# Check timings
print(f"ASR: {result['timings']['asr']:.2f}s")
print(f"Translation: {result['timings']['translation']:.2f}s")
print(f"TTS: {result['timings']['tts']:.2f}s")

# Get performance statistics
stats = pipeline.get_performance_stats()
print(f"Average processing time: {stats['avg_total_time']:.2f}s")

# Print detailed stats
pipeline.print_performance_stats()
```

## 🐛 Troubleshooting

### CUDA Out of Memory

```python
# Solution 1: Use smaller model
from ai.config import config
config.whisper_model_size = "base"  # Instead of "small"

# Solution 2: Clear cache frequently
pipeline.clear_cache()

# Solution 3: Load only one translation direction
pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi",
    load_both_translation_directions=False
)
```

### Model Download Issues

Models are automatically downloaded on first use. If you have issues:

```bash
# Manually download models
python -c "import whisper; whisper.load_model('small')"
python -c "from TTS.api import TTS; TTS('tts_models/multilingual/multi-dataset/xtts_v2')"
```

### Audio Format Issues

```bash
# Convert audio to correct format
pip install ffmpeg-python
ffmpeg -i input.mp3 -ar 16000 -ac 1 output.wav
```

## 📁 Project Structure

```
AI/lingolive_realtime/
├── ai/
│   ├── __init__.py              # Package initialization
│   ├── config.py                # Configuration settings
│   ├── asr_module.py            # ASR (Whisper)
│   ├── translation_module.py   # Translation (IndicTrans2)
│   ├── tts_module.py            # TTS (Coqui TTS)
│   └── speech_pipeline.py      # End-to-end pipeline
├── main_speech_translation.py  # Example usage and CLI
├── requirements_speech_translation.txt  # Dependencies
└── README_SPEECH_TRANSLATION.md  # This file
```

## 🔧 Advanced Usage

### Custom TTS Voice

```python
from ai import TTSModule

tts = TTSModule()

# Use reference audio for voice cloning
audio = tts.synthesize(
    text="Your text here",
    language="hindi",
    speaker_wav="reference_voice.wav"  # Clone this voice
)
```

### Batch Translation

```python
from ai import TranslationModule

translator = TranslationModule()

texts = ["Hello", "How are you?", "Good morning"]
translations = translator.translate_batch(
    texts,
    source_lang="english",
    target_lang="hindi",
    batch_size=4
)
```

### Language Detection

```python
from ai import ASRModule

asr = ASRModule()

# Auto-detect language
result = asr.transcribe_file("audio.wav", language=None)
print(f"Detected language: {result['language']}")
```

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Add more language models
- Optimize memory usage further
- Implement streaming support
- Add web API interface
- Improve error handling
- Add unit tests

## 📝 License

This project is for educational and research purposes.

## 🙏 Acknowledgments

- **OpenAI Whisper**: https://github.com/openai/whisper
- **IndicTrans2**: https://github.com/AI4Bharat/IndicTrans2
- **Coqui TTS**: https://github.com/coqui-ai/TTS

## 📧 Contact

For questions and support, please open an issue on GitHub.

---

**Built with ❤️ for multilingual communication**
