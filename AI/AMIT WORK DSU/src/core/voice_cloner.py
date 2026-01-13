from elevenlabs import generate, play, set_api_key, save, voices
import io
import time
from threading import Lock
import requests

from src.utils.config import Config

class VoiceCloner:
    def __init__(self):
        self.config = Config()
        self.api_key = self.config.ELEVENLABS_API_KEY
        self.available_voices = {}
        
        if self.api_key and self.api_key != "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":
            set_api_key(self.api_key)
            self.load_available_voices()
        else:
            print("Warning: ElevenLabs API key not found or not configured. Voice cloning will not work.")
        
        self.voice_lock = Lock()
        
    def load_available_voices(self):
        """Load available voices from ElevenLabs API"""
        try:
            # Get available voices
            all_voices = voices()
            for voice in all_voices:
                self.available_voices[voice.name.lower()] = voice.voice_id
                # Also add by ID for backward compatibility
                self.available_voices[voice.voice_id] = voice.voice_id
            
            print(f"Loaded {len(self.available_voices)} available voices from ElevenLabs")
            print("Available voices:", list(self.available_voices.keys()))
            
        except Exception as e:
            print(f"Error loading voices from ElevenLabs: {e}")
            # Fallback to some known voice IDs
            self.available_voices = {
                "rachel": "21m00Tcm4TlvDq8ikWAM",
                "domi": "AZnzlk1XvdvUeBnXmlld",
                "bella": "EXAVITQu4vr4xnSDxMaL",
                "antoni": "ErXwobaYiN019PkySvjV",
                "elli": "MF3mGyEYCl7XYWbV9V6O",
                "josh": "TxGEqnHWrfWFTfGW9XjX",
                "arnold": "VR6AewLTigWG4xSOukaG",
                "adam": "pNInz6obpgDQGcFmaJgB",
                "sam": "yoZ06aMxZJJ28mfd3POQ"
            }
    
    def get_voice_id(self, voice_name):
        """Get voice ID from voice name"""
        voice_name = voice_name.lower()
        if voice_name in self.available_voices:
            return self.available_voices[voice_name]
        
        # Try partial matching
        for available_name in self.available_voices.keys():
            if voice_name in available_name or available_name in voice_name:
                return self.available_voices[available_name]
        
        # Return default voice if not found
        print(f"Voice '{voice_name}' not found. Using default voice.")
        return list(self.available_voices.values())[0] if self.available_voices else None
    
    def generate_speech(self, text, voice_name="adam", model="eleven_turbo_v2"):
        """Generate speech from text using ElevenLabs voice cloning"""
        if not self.api_key or self.api_key == "your_elevenlabs_api_key_here" or not text:
            print("API key missing or empty text")
            return None
        
        try:
            voice_id = self.get_voice_id(voice_name)
            if not voice_id:
                print("No valid voice ID found")
                return None
            
            with self.voice_lock:
                audio = generate(
                    text=text,
                    voice=voice_id,
                    model=model
                )
                return audio
        except Exception as e:
            print(f"Error generating speech: {e}")
            return None
    
    def play_speech(self, audio_data):
        """Play generated speech"""
        if audio_data:
            try:
                play(audio_data)
            except Exception as e:
                print(f"Error playing speech: {e}")
    
    def save_speech(self, audio_data, filename):
        """Save generated speech to file"""
        if audio_data:
            try:
                save(audio_data, filename)
                print(f"Speech saved to {filename}")
            except Exception as e:
                print(f"Error saving speech: {e}")

# Singleton instance
voice_cloner = VoiceCloner()