# AI Translation Integration for LingoLive Chat System

## Overview

This integration adds real-time text-to-text translation capabilities to the LingoLive chat system. Messages can be automatically translated between multiple languages as users chat.

## Architecture

The translation system consists of three main components:

1. **Translation API Service** (Python Flask) - Port 5001
   - Standalone AI translation microservice
   - Uses Google Translator for text translation
   - Supports 20+ languages including Indian languages

2. **Backend Integration** (Node.js/Express) - Port 5000
   - Message controller enhanced with translation support
   - Translation routes for direct API access
   - Automatic translation when targetLang is provided

3. **Message Model** (MongoDB)
   - Extended to store original and translated text
   - Tracks source and target languages
   - Maintains translation status

## Features

- ✅ Real-time text-to-text translation
- ✅ Auto-detect source language
- ✅ 20+ supported languages (including Hindi, Kannada, Telugu, Tamil, etc.)
- ✅ Batch translation support
- ✅ Translation service health monitoring
- ✅ Backward compatible (works without translation)
- ✅ Docker containerized

## Supported Languages

- English (en), Hindi (hi), Spanish (es), French (fr), German (de)
- Chinese (zh), Japanese (ja), Korean (ko), Arabic (ar)
- Portuguese (pt), Russian (ru), Italian (it)
- Indian languages: Kannada (kn), Telugu (te), Tamil (ta), Malayalam (ml), Bengali (bn), Marathi (mr), Gujarati (gu), Punjabi (pa), Odia (or), Assamese (as), Urdu (ur)

## Setup Instructions

### 1. Install Dependencies

#### Translation Service (Python)
```bash
cd "AI/AMIT WORK DSU"
pip install -r translation_requirements.txt
```

#### Backend Service (Node.js)
```bash
cd backend
npm install axios
```

### 2. Environment Configuration

Add to your backend `.env`:
```env
TRANSLATION_API_URL=http://localhost:5001
```

### 3. Start Services

#### Option A: Manual Start

**Start Translation Service:**
```bash
cd "AI/AMIT WORK DSU"
python translation_api.py
```

**Start Backend:**
```bash
cd backend
npm start
```

#### Option B: Docker Compose

```bash
docker-compose up -d
```

This will start all three services:
- Frontend (Port 80)
- Backend (Port 5000)
- Translation Service (Port 5001)

## API Endpoints

### Translation Service (Port 5001)

#### 1. Health Check
```http
GET /health
```

#### 2. Translate Text
```http
POST /api/translate
Content-Type: application/json

{
  "text": "Hello, how are you?",
  "source_lang": "en",
  "target_lang": "hi"
}
```

Response:
```json
{
  "success": true,
  "original_text": "Hello, how are you?",
  "translated_text": "नमस्ते, आप कैसे हैं?",
  "source_lang": "en",
  "target_lang": "hi"
}
```

#### 3. Batch Translation
```http
POST /api/translate/batch
Content-Type: application/json

{
  "texts": ["Hello", "How are you?"],
  "source_lang": "en",
  "target_lang": "hi"
}
```

#### 4. Get Supported Languages
```http
GET /api/languages
```

### Backend Integration (Port 5000)

#### 1. Send Message with Translation
```http
POST /api/messages
Content-Type: application/json

{
  "receiverId": "user_id_here",
  "text": "Hello, how are you?",
  "targetLang": "hi",
  "sourceLang": "en"
}
```

Response:
```json
{
  "message": "Message sent",
  "data": {
    "_id": "message_id",
    "sender": {...},
    "receiver": "receiver_id",
    "text": "Hello, how are you?",
    "translatedText": "नमस्ते, आप कैसे हैं?",
    "sourceLang": "en",
    "targetLang": "hi",
    "isTranslated": true,
    "createdAt": "2026-01-12T..."
  }
}
```

#### 2. Translation API Routes
```http
POST /api/translation/translate
POST /api/translation/translate/batch
GET /api/translation/languages
GET /api/translation/health
```

## Message Model Schema

```javascript
{
  sender: ObjectId,
  receiver: ObjectId,
  text: String,                    // Original text
  translatedText: String,          // Translated text
  sourceLang: String,              // Source language (default: 'auto')
  targetLang: String,              // Target language
  isTranslated: Boolean,           // Translation status
  image: String,
  video: String,
  audio: String,
  file: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Usage Examples

### Frontend Integration Example

```javascript
// Send message with translation
const sendMessageWithTranslation = async (text, receiverId, targetLang) => {
  const formData = new FormData();
  formData.append('receiverId', receiverId);
  formData.append('text', text);
  formData.append('targetLang', targetLang); // e.g., 'hi' for Hindi
  formData.append('sourceLang', 'auto');     // Auto-detect source
  
  const response = await fetch('http://localhost:5000/api/messages', {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  
  const data = await response.json();
  console.log('Original:', data.data.text);
  console.log('Translated:', data.data.translatedText);
};

// Direct translation API call
const translateText = async (text, targetLang) => {
  const response = await fetch('http://localhost:5000/api/translation/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: text,
      target_lang: targetLang,
      source_lang: 'auto'
    })
  });
  
  const result = await response.json();
  return result.translated_text;
};
```

### Display Messages in Chat

```javascript
// Display message with translation
const MessageBubble = ({ message }) => {
  return (
    <div className="message">
      <p className="original">{message.text}</p>
      {message.isTranslated && (
        <p className="translated">
          🌐 {message.translatedText}
          <span className="lang-badge">
            {message.sourceLang} → {message.targetLang}
          </span>
        </p>
      )}
    </div>
  );
};
```

## Testing

### Test Translation Service

```bash
# Health check
curl http://localhost:5001/health

# Translate text
curl -X POST http://localhost:5001/api/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world","target_lang":"hi"}'

# Get languages
curl http://localhost:5001/api/languages
```

### Test Backend Integration

```bash
# Check translation service health
curl http://localhost:5000/api/translation/health

# Get supported languages
curl http://localhost:5000/api/translation/languages
```

## Troubleshooting

### Translation Service Not Starting

1. Check Python version (3.10+ required)
2. Install dependencies: `pip install -r translation_requirements.txt`
3. Check port 5001 is available

### Backend Can't Connect to Translation Service

1. Verify translation service is running on port 5001
2. Check `TRANSLATION_API_URL` in backend environment
3. For Docker: ensure services are on same network

### Translation Not Working

1. Check translation service logs
2. Verify language codes are correct (use `/api/languages` endpoint)
3. Ensure message text is not empty
4. Check if translation service is healthy: `/api/translation/health`

## Performance Notes

- Translation adds ~200-500ms latency per message
- Batch translation is more efficient for multiple texts
- Translation service runs independently and doesn't block chat
- If translation service is down, messages still send without translation

## Future Enhancements

- [ ] Voice message translation
- [ ] Real-time translation toggle in UI
- [ ] User language preferences
- [ ] Translation history
- [ ] Offline translation support
- [ ] Custom translation models

## Development

### Adding New Languages

1. Add language code to `src/utils/config.py` in `SUPPORTED_LANGUAGES`
2. Add mapping in `src/utils/language_config.py` in `LANGUAGE_CODES`
3. Restart translation service

### Modifying Translation Logic

Edit `src/core/translator.py`:
- `translate_text()` - Single text translation
- `translate_batch()` - Batch translation
- Add custom preprocessing/postprocessing

## License

This integration is part of the LingoLive project.

## Support

For issues or questions, please contact the development team.
