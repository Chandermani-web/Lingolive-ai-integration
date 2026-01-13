from flask import Flask, request, jsonify
from flask_cors import CORS
from src.core.audio_processor import audio_processor
from src.core.translator import translator
from src.core.voice_cloner import voice_cloner
from src.utils.config import Config

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

config = Config()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'LingoLive API'})

@app.route('/api/languages', methods=['GET'])
def get_languages():
    return jsonify(config.SUPPORTED_LANGUAGES)

@app.route('/api/voices', methods=['GET'])
def get_voices():
    return jsonify(list(voice_cloner.voices.keys()))

@app.route('/api/translate', methods=['POST'])
def translate_text():
    data = request.json
    text = data.get('text', '')
    source_lang = data.get('source_lang', 'auto')
    target_lang = data.get('target_lang', 'en')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    translated_text = translator.translate_text(text, source_lang, target_lang)
    return jsonify({
        'original_text': text,
        'translated_text': translated_text,
        'source_lang': source_lang,
        'target_lang': target_lang
    })

@app.route('/api/synthesize', methods=['POST'])
def synthesize_speech():
    data = request.json
    text = data.get('text', '')
    voice_id = data.get('voice_id', 'rachel')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    audio_data = voice_cloner.generate_speech(text, voice_id)
    if audio_data:
        # Save to temporary file and return URL
        filename = f"temp_{hash(text)}.mp3"
        voice_cloner.save_speech(audio_data, filename)
        return jsonify({
            'audio_url': f"/audio/{filename}",
            'text': text,
            'voice_id': voice_id
        })
    else:
        return jsonify({'error': 'Failed to generate speech'}), 500

@app.route('/api/record', methods=['POST'])
def record_audio():
    duration = request.json.get('duration', 5.0)
    audio_data = audio_processor.record_audio(duration)
    
    if audio_data is not None:
        filename = "recorded_audio.wav"
        audio_processor.save_audio_to_wav(audio_data, filename)
        return jsonify({
            'audio_file': filename,
            'duration': duration,
            'message': 'Audio recorded successfully'
        })
    else:
        return jsonify({'error': 'Failed to record audio'}), 500

if __name__ == '__main__':
    app.run(host=config.HOST, port=config.PORT, debug=(config.FLASK_ENV == 'development'))