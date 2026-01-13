import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.core.voice_cloner import voice_cloner
from src.utils.config import Config

def preview_voices():
    """Preview all available voices"""
    config = Config()
    
    # Check API key
    if not config.ELEVENLABS_API_KEY or config.ELEVENLABS_API_KEY == "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":
        print("Please set your ElevenLabs API key in the .env file")
        return
    
    # List all available voices
    print("Available voices:")
    print("=" * 60)
    
    voices_list = list(voice_cloner.available_voices.items())
    
    if not voices_list:
        print("No voices available. Check your ElevenLabs API key.")
        return
    
    for i, (voice_name, voice_id) in enumerate(voices_list):
        print(f"{i+1:2d}. {voice_name:20s} (ID: {voice_id})")
    
    # Preview selected voices
    print("\nVoice Preview:")
    print("=" * 60)
    
    test_phrases = [
        "नमस्ते, आप कैसे हैं?",
        "मेरा नाम अमित है।",
        "यह आवाज़ परीक्षण है।",
        "मौसम आज बहुत अच्छा है।",
        "धन्यवाद इस एप्लिकेशन को टेस्ट करने के लिए।"
    ]
    
    # Preview first 5 voices or user selection
    preview_count = min(5, len(voices_list))
    
    for i in range(preview_count):
        voice_name, voice_id = voices_list[i]
        print(f"\nPreviewing voice {i+1}: {voice_name}")
        
        # Test with Hindi phrases
        for phrase in test_phrases[:2]:  # Just first 2 phrases per voice
            print(f"  Speaking: {phrase}")
            audio = voice_cloner.generate_speech(phrase, voice_name)
            if audio:
                voice_cloner.play_speech(audio)
            else:
                print("  Failed to generate audio")
                break

def find_voice_by_name(search_term):
    """Find voices that match a search term"""
    config = Config()
    
    # Check API key
    if not config.ELEVENLABS_API_KEY or config.ELEVENLABS_API_KEY == "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":
        print("Please set your ElevenLabs API key in the .env file")
        return
    
    search_term = search_term.lower()
    matching_voices = []
    
    for voice_name, voice_id in voice_cloner.available_voices.items():
        if search_term in voice_name.lower():
            matching_voices.append((voice_name, voice_id))
    
    if matching_voices:
        print(f"Voices matching '{search_term}':")
        for voice_name, voice_id in matching_voices:
            print(f"  - {voice_name} (ID: {voice_id})")
    else:
        print(f"No voices found matching '{search_term}'")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        find_voice_by_name(sys.argv[1])
    else:
        preview_voices()