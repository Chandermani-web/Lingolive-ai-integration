import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # API Keys
    ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # Server Configuration
    HOST = os.getenv('HOST', 'localhost')
    PORT = int(os.getenv('PORT', 5000))
    WEBSOCKET_PORT = int(os.getenv('WEBSOCKET_PORT', 8765))
    
    # Audio Configuration
    SAMPLE_RATE = int(os.getenv('SAMPLE_RATE', 16000))
    CHUNK_SIZE = int(os.getenv('CHUNK_SIZE', 1024))
    SILENCE_THRESHOLD = int(os.getenv('SILENCE_THRESHOLD', 500))
    MIN_AUDIO_LENGTH = 2.0  # seconds
    MAX_AUDIO_LENGTH = 100.0  # seconds
    
    # Model Configuration
    WHISPER_MODEL = "tiny"  # "tiny", "base", "small", "medium", "large"
    
    # Supported Languages
    SUPPORTED_LANGUAGES = {
        'en': 'English',
        'hi': 'Hindi',
        'es': 'Spanish',
        'fr': 'French',
        'de': 'German',
        'zh': 'Chinese',
        'ja': 'Japanese',
        'ko': 'Korean',
        'ar': 'Arabic',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'it': 'Italian',
        "kn": "Kannada",
        "te": "Telugu",
        "ta": "Tamil",
        "ml": "Malayalam",
        "bn": "Bengali",
        "mr": "Marathi",
        "gu": "Gujarati",
        "pa": "Punjabi",
        "or": "Odia",
        "as": "Assamese",
        "ur": "Urdu",
        "ne": "Nepali",
        "si": "Sinhala"
    }