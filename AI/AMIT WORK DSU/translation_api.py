from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from googletrans import Translator, LANGUAGES

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5000", "http://localhost:5173"]}})

translator = Translator()

def build_language_map():
    try:
        return {code: name.title() for code, name in LANGUAGES.items()}
    except Exception as exc:
        logger.error("Failed to build language map: %s", exc)
        return {
            "en": "English",
            "hi": "Hindi",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "ja": "Japanese",
            "zh-cn": "Chinese (Simplified)",
        }

SUPPORTED_LANGUAGES = build_language_map()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "translation-api"}), 200

@app.route('/api/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"success": False, "error": "No data provided"}), 400
        
        text = data.get('text')
        if not text or not text.strip():
            return jsonify({"success": False, "error": "Text is required"}), 400
        
        target_lang = data.get('target_lang')
        if not target_lang:
            return jsonify({"success": False, "error": "target_lang is required"}), 400
        
        source_lang = data.get('source_lang', 'auto')
        
        logger.info(f"Translating from {source_lang} to {target_lang}")
        
        # Use the translator package - it returns synchronously
        result = translator.translate(text.strip(), dest=target_lang, src=source_lang)
        translated_text = result.text
        
        return jsonify({
            "success": True,
            "original_text": text,
            "translated_text": translated_text,
            "source_lang": source_lang,
            "target_lang": target_lang
        }), 200
        
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/translate/batch', methods=['POST'])
def translate_batch():
    try:
        data = request.get_json() or {}
        texts = data.get('texts')
        target_lang = data.get('target_lang')
        source_lang = data.get('source_lang', 'auto')

        if not texts or not isinstance(texts, list):
            return jsonify({"success": False, "error": "texts must be a non-empty list"}), 400
        if not target_lang:
            return jsonify({"success": False, "error": "target_lang is required"}), 400

        translations = []
        for item in texts:
            if not item or not str(item).strip():
                continue
            result = translator.translate(str(item).strip(), dest=target_lang, src=source_lang)
            translated = result.text
            translations.append({
                "original": item,
                "translated": translated
            })

        return jsonify({
            "success": True,
            "translations": translations,
            "source_lang": source_lang,
            "target_lang": target_lang
        }), 200

    except Exception as e:
        logger.error(f"Batch translation error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/languages', methods=['GET'])
def get_languages():
    try:
        return jsonify({
            "success": True,
            "languages": SUPPORTED_LANGUAGES
        }), 200
    except Exception as e:
        logger.error(f"Languages error: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Translation API Server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=True)