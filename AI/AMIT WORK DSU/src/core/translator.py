import whisper
from deep_translator import GoogleTranslator
import numpy as np
import time
from threading import Lock
from src.utils.config import Config
import torch


class Translator:
    def __init__(self):
        self.config = Config()
        print("Loading Whisper model...")

        # detect device (GPU if available, else CPU)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"

        # load whisper model safely with fp32
        self.model = whisper.load_model(self.config.WHISPER_MODEL, device=self.device).to(torch.float32)

        print(f"Whisper model '{self.config.WHISPER_MODEL}' loaded successfully on {self.device} with fp32!")
        self.translation_lock = Lock()

    def transcribe_audio(self, audio_data):
        """Transcribe audio to text using Whisper"""
        try:
            if isinstance(audio_data, np.ndarray):
                if audio_data.dtype != np.float32:
                    audio_data = audio_data.astype(np.float32)
                if audio_data.ndim > 1:
                    audio_data = audio_data.flatten()

            result = self.model.transcribe(audio_data)
            return result["text"].strip()
        except Exception as e:
            print(f"Error in transcription: {e}")
            return ""

    def translate_text(self, text, source_lang="auto", target_lang="en"):
        """Translate text using Google Translate"""
        if not text:
            return ""
        try:
            with self.translation_lock:
                translated = GoogleTranslator(
                    source=source_lang, target=target_lang
                ).translate(text)
                return translated
        except Exception as e:
            print(f"Error in translation: {e}")
            return text  # fallback

    def process_audio_translation(self, audio_data, source_lang="auto", target_lang="en"):
        """Pipeline: audio → text → translated text"""
        start_time = time.time()
        text = self.transcribe_audio(audio_data)
        if not text:
            return "", ""

        transcription_time = time.time()
        print(f"Transcribed: {text} (in {transcription_time - start_time:.2f}s)")

        translated_text = self.translate_text(text, source_lang, target_lang)
        translation_time = time.time()
        print(f"Translated: {translated_text} (in {translation_time - transcription_time:.2f}s)")

        return text, translated_text


# Singleton instance
translator = Translator()
