import sounddevice as sd
import numpy as np
import queue
import threading
import time
from pydub import AudioSegment
from pydub.silence import split_on_silence
import io
import wave

from src.utils.config import Config

class AudioProcessor:
    def __init__(self):
        self.config = Config()
        self.audio_queue = queue.Queue()
        self.is_recording = False
        self.audio_buffer = []
        self.sample_rate = self.config.SAMPLE_RATE
        self.chunk_size = self.config.CHUNK_SIZE
        
    def audio_callback(self, indata, frames, time, status):
        """Callback function for sounddevice to capture audio"""
        if status:
            print(f"Audio status: {status}")
        if self.is_recording:
            self.audio_queue.put(indata.copy())
    
    def detect_silence(self, audio_data, threshold=None):
        """Detect if audio data is below silence threshold"""
        if threshold is None:
            threshold = self.config.SILENCE_THRESHOLD
        return np.max(np.abs(audio_data)) < threshold
    
    def process_audio_chunk(self, audio_data):
        """Process audio chunk for voice activity detection"""
        # Convert to numpy array if needed
        if isinstance(audio_data, list):
            audio_data = np.concatenate(audio_data, axis=0)
        
        audio_data = audio_data.flatten().astype(np.float32)
        
        # Check if audio contains voice activity
        if not self.detect_silence(audio_data):
            return audio_data
        return None
    
    def record_audio(self, duration=None):
        """Capture audio from microphone for specified duration or until stopped"""
        print("Starting audio recording...")
        self.is_recording = True
        self.audio_buffer = []
        
        try:
            with sd.InputStream(samplerate=self.sample_rate,
                              channels=1,
                              blocksize=self.chunk_size,
                              callback=self.audio_callback):
                start_time = time.time()
                while self.is_recording:
                    if duration and (time.time() - start_time) >= duration:
                        break
                    try:
                        # Get audio data from queue
                        data = self.audio_queue.get(timeout=0.1)
                        self.audio_buffer.append(data)
                    except queue.Empty:
                        continue
        except Exception as e:
            print(f"Error in audio recording: {e}")
        finally:
            self.is_recording = False
            
        # Return concatenated audio data
        if self.audio_buffer:
            return np.concatenate(self.audio_buffer, axis=0)
        return None
    
    def save_audio_to_wav(self, audio_data, filename):
        """Save audio data to WAV file"""
        try:
            # Normalize audio data
            audio_data = (audio_data * 32767).astype(np.int16)
            
            with wave.open(filename, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(self.sample_rate)
                wf.writeframes(audio_data.tobytes())
            print(f"Audio saved to {filename}")
        except Exception as e:
            print(f"Error saving audio: {e}")
    
    def play_audio(self, audio_data):
        """Play audio data through speakers"""
        try:
            sd.play(audio_data, samplerate=self.sample_rate)
            sd.wait()
        except Exception as e:
            print(f"Error playing audio: {e}")

# Singleton instance
audio_processor = AudioProcessor()