# Quick Start Guide - Speech-to-Speech Translation System

## ⚠️ Prerequisites

**CRITICAL:** You must authenticate with HuggingFace before using the translation models.

📖 **See: [HUGGINGFACE_SETUP.md](HUGGINGFACE_SETUP.md)** for detailed instructions.

**Quick Auth:**
```bash
# Install huggingface hub
pip install --upgrade huggingface_hub

# Login (you'll be prompted for your token)
huggingface-cli login
```

Get your token from: [https://huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

## 🚀 5-Minute Setup

### Step 1: Install PyTorch with CUDA (Required)

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

### Step 3: Run Setup Script (Optional)

```bash
python setup_speech_system.py
```

### Step 4: Test Installation

```bash
python test_speech_system.py
```

## 📝 Basic Usage

### Option 1: Command Line

```bash
# Translate English to Hindi
python main_speech_translation.py input.wav -s english -t hindi -o output.wav

# With verbose output
python main_speech_translation.py input.wav -s english -t tamil -o output.wav -v

# List all supported languages
python main_speech_translation.py --list-languages
```

### Option 2: Python Script (Simple)

```python
from ai import translate_speech

# One-line translation
translate_speech(
    input_audio="english_speech.wav",
    output_audio="hindi_speech.wav",
    source_language="english",
    target_language="hindi"
)
```

### Option 3: Python Script (Detailed)

```python
from ai import SpeechToSpeechPipeline

# Initialize pipeline
pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="tamil"
)

# Process with intermediate results
result = pipeline.process(
    input_audio="input.wav",
    output_path="output.wav",
    return_intermediate=True
)

# Print results
print(f"Transcription: {result['transcription']}")
print(f"Translation: {result['translation']}")
print(f"Total time: {result['timings']['total']:.2f}s")
```

## 🌍 Supported Languages

English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, Urdu, Odia, Assamese, Sanskrit

Run `python main_speech_translation.py --list-languages` to see all.

## 🔧 Individual Modules

### ASR Only (Speech-to-Text)

```python
from ai import ASRModule

asr = ASRModule()
result = asr.transcribe_file("audio.wav", language="en")
print(result['text'])
```

### Translation Only (Text-to-Text)

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

### TTS Only (Text-to-Speech)

```python
from ai import TTSModule

tts = TTSModule()
tts.synthesize_to_file(
    "नमस्ते",
    "output.wav",
    language="hindi"
)
```

## 📊 Performance Tips

### For RTX 4050 (6GB VRAM)

```python
from ai import SpeechToSpeechPipeline

# Use single direction translation to save memory
pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi",
    load_both_translation_directions=False  # Saves ~2GB
)

# Clear cache after processing
pipeline.clear_cache()
```

### For Better Accuracy (More VRAM)

```python
from ai.config import config

# Use larger Whisper model (requires more VRAM)
config.whisper_model_size = "medium"  # or "large"

# Then initialize pipeline
from ai import SpeechToSpeechPipeline
pipeline = SpeechToSpeechPipeline(...)
```

## 🎯 Common Use Cases

### 1. Batch Processing Multiple Files

```python
from ai import SpeechToSpeechPipeline

pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi"
)

files = ["audio1.wav", "audio2.wav", "audio3.wav"]
results = pipeline.process_batch(
    input_files=files,
    output_dir="translated_output"
)

pipeline.print_performance_stats()
```

### 2. Translate to Multiple Languages

```python
from ai import SpeechToSpeechPipeline

input_audio = "english_speech.wav"
languages = ["hindi", "tamil", "bengali", "telugu"]

for lang in languages:
    pipeline = SpeechToSpeechPipeline("english", lang)
    pipeline.process(input_audio, output_path=f"output_{lang}.wav")
```

### 3. Get Intermediate Results

```python
from ai import SpeechToSpeechPipeline

pipeline = SpeechToSpeechPipeline("english", "hindi")
result = pipeline.process(
    "input.wav",
    return_intermediate=True
)

# Access intermediate results
transcription = result['transcription']
translation = result['translation']
output_audio = result['output_audio']
timings = result['timings']
```

## 🐛 Troubleshooting

### Issue: CUDA Out of Memory

**Solution 1:** Use smaller model
```python
from ai.config import config
config.whisper_model_size = "base"  # Instead of "small"
```

**Solution 2:** Load single direction
```python
pipeline = SpeechToSpeechPipeline(
    source_language="english",
    target_language="hindi",
    load_both_translation_directions=False
)
```

**Solution 3:** Clear cache
```python
pipeline.clear_cache()
```

### Issue: Audio Format Not Supported

Convert to WAV format:
```bash
# Using ffmpeg
ffmpeg -i input.mp3 -ar 16000 -ac 1 output.wav
```

Or in Python:
```python
from pydub import AudioSegment

audio = AudioSegment.from_file("input.mp3")
audio = audio.set_frame_rate(16000).set_channels(1)
audio.export("output.wav", format="wav")
```

### Issue: Models Not Downloading

Models download automatically on first use. If having issues:

```python
# Manually download Whisper
import whisper
whisper.load_model("small")

# Manually download IndicTrans2
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
AutoTokenizer.from_pretrained("ai4bharat/indictrans2-en-indic-1B", trust_remote_code=True)
AutoModelForSeq2SeqLM.from_pretrained("ai4bharat/indictrans2-en-indic-1B", trust_remote_code=True)

# Manually download Coqui TTS
from TTS.api import TTS
TTS(model_name="tts_models/multilingual/multi-dataset/xtts_v2")
```

## 📈 Expected Performance

On RTX 4050 (6GB VRAM):
- **ASR**: 0.5-2s for 10s audio
- **Translation**: 0.2-1s per sentence
- **TTS**: 1-3s for 20 words
- **Total**: 2-6s for 10s audio

Real-time factor: **0.2-0.6x** (faster than real-time)

## 📚 More Information

- Full Documentation: [README_SPEECH_TRANSLATION.md](README_SPEECH_TRANSLATION.md)
- Setup Script: `python setup_speech_system.py`
- Test Script: `python test_speech_system.py`
- Examples: `python main_speech_translation.py`

## 💡 Tips

1. **First run is slow** - Models are downloaded and cached
2. **GPU recommended** - CPU is 10-20x slower
3. **Use float16** - Automatically enabled on GPU
4. **Batch processing** - More efficient for multiple files
5. **Clear cache** - If running low on VRAM

## 🎓 Next Steps

1. Read full documentation: `README_SPEECH_TRANSLATION.md`
2. Run test suite: `python test_speech_system.py`
3. Try examples in: `main_speech_translation.py`
4. Check configuration: `ai/config.py`

## 📱 Quick Reference

```bash
# Setup
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
pip install -r requirements_speech_translation.txt
python setup_speech_system.py

# Test
python test_speech_system.py

# Use
python main_speech_translation.py input.wav -s english -t hindi -o output.wav
```

## 🔗 Resources

- **Whisper**: https://github.com/openai/whisper
- **IndicTrans2**: https://github.com/AI4Bharat/IndicTrans2
- **Coqui TTS**: https://github.com/coqui-ai/TTS

---

**Questions?** Check the full documentation or create an issue on GitHub.
