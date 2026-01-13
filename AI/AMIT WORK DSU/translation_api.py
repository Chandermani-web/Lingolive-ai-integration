from flask import Flask, request, jsonify
from flask_cors import CORS
from src.core.translator import translator
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5000", "http://localhost:5173"]}})

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "translation-api"}), 200

@app.route('/api/translate', methods=['POST'])
def translate():
    """
    Translate text from source language to target language
    
    Request body:
    {
        "text": "Hello, how are you?",
        "source_lang": "en",  # optional, default: "auto"
        "target_lang": "hi"   # required
    }
    
    Response:
    {
        "original_text": "Hello, how are you?",
        "translated_text": "नमस्ते, आप कैसे हैं?",
        "source_lang": "en",
        "target_lang": "hi",
        "success": true
    }
    """
    try:
        data = request.get_json()
        
        # Validate request
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        text = data.get('text')
        if not text or not text.strip():
            return jsonify({
                "success": False,
                "error": "Text is required"
            }), 400
        
        target_lang = data.get('target_lang')
        if not target_lang:
            return jsonify({
                "success": False,
                "error": "target_lang is required"
            }), 400
        
        source_lang = data.get('source_lang', 'auto')
        
        logger.info(f"Translating text from {source_lang} to {target_lang}")
        
        # Perform translation
        translated_text = translator.translate_text(
            text=text.strip(),
            source_lang=source_lang,
            target_lang=target_lang
        )
        
        return jsonify({
            "success": True,
            "original_text": text,
            "translated_text": translated_text,
            "source_lang": source_lang,
            "target_lang": target_lang
        }), 200
        
    except Exception as e:
        logger.error(f"Translation error: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/translate/batch', methods=['POST'])
def translate_batch():
    """
    Translate multiple texts at once
    
    Request body:
    {
        "texts": ["Hello", "How are you?"],
        "source_lang": "en",  # optional, default: "auto"
        "target_lang": "hi"   # required
    }
    
    Response:
    {
        "translations": [
            {
                "original": "Hello",
                "translated": "नमस्ते"
            },
            {
                "original": "How are you?",
                "translated": "आप कैसे हैं?"
            }
        ],
        "source_lang": "en",
        "target_lang": "hi",
        "success": true
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        texts = data.get('texts', [])
        if not texts or not isinstance(texts, list):
            return jsonify({
                "success": False,
                "error": "texts must be a non-empty array"
            }), 400
        
        target_lang = data.get('target_lang')
        if not target_lang:
            return jsonify({
                "success": False,
                "error": "target_lang is required"
            }), 400
        
        source_lang = data.get('source_lang', 'auto')
        
        logger.info(f"Batch translating {len(texts)} texts from {source_lang} to {target_lang}")
        
        # Translate all texts
        translations = []
        for text in texts:
            if text and text.strip():
                translated = translator.translate_text(
                    text=text.strip(),
                    source_lang=source_lang,
                    target_lang=target_lang
                )
                translations.append({
                    "original": text,
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
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/languages', methods=['GET'])
def get_supported_languages():
    """
    Get list of supported languages
    
    Response:
    {
        "languages": {
            "en": "English",
            "hi": "Hindi",
            ...
        },
        "success": true
    }
    """
    from src.utils.config import Config
    
    try:
        config = Config()
        return jsonify({
            "success": True,
            "languages": config.SUPPORTED_LANGUAGES
        }), 200
    except Exception as e:
        logger.error(f"Error fetching languages: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500

if __name__ == '__main__':
    logger.info("Starting Translation API Server...")
    logger.info("Translation service initialized successfully")
    
    # Run the Flask app
    app.run(
        host='0.0.0.0',
        port=5001,
        debug=True
    )
