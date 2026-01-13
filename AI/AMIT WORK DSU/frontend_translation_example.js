// Example: Translation Integration for Frontend
// Add this to your ChatPage.jsx or create a new translation service file

// Translation service utilities
export const translationService = {
  // Base URL for translation API
  baseURL: 'http://localhost:5000/api/translation',

  /**
   * Get supported languages
   */
  async getSupportedLanguages() {
    try {
      const response = await fetch(`${this.baseURL}/languages`);
      const data = await response.json();
      return data.languages || {};
    } catch (error) {
      console.error('Error fetching languages:', error);
      return {};
    }
  },

  /**
   * Translate text
   */
  async translateText(text, targetLang, sourceLang = 'auto') {
    try {
      const response = await fetch(`${this.baseURL}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLang,
          sourceLang
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Translation error:', error);
      return null;
    }
  },

  /**
   * Check if translation service is available
   */
  async isServiceHealthy() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      const data = await response.json();
      return data.success;
    } catch (error) {
      return false;
    }
  }
};

// Example: Add to ChatPage.jsx component
// 
// Add state for translation
// const [targetLanguage, setTargetLanguage] = useState('');
// const [translationEnabled, setTranslationEnabled] = useState(false);
// const [supportedLanguages, setSupportedLanguages] = useState({});
//
// useEffect(() => {
//   // Load supported languages
//   translationService.getSupportedLanguages().then(langs => {
//     setSupportedLanguages(langs);
//   });
// }, []);

// Modified sendMessage function with translation
export const sendMessageWithTranslation = async (
  text, 
  receiverId, 
  targetLang = null,
  media = {}
) => {
  const formData = new FormData();
  formData.append('receiverId', receiverId);
  
  if (text.trim()) {
    formData.append('text', text.trim());
    
    // Add translation parameters if enabled
    if (targetLang) {
      formData.append('targetLang', targetLang);
      formData.append('sourceLang', 'auto');
    }
  }
  
  // Add media files
  if (media.image) formData.append('image', media.image);
  if (media.video) formData.append('video', media.video);
  if (media.audio) formData.append('audio', media.audio);
  if (media.file) formData.append('file', media.file);
  
  const response = await fetch('http://localhost:5000/api/messages', {
    method: 'POST',
    credentials: 'include',
    body: formData
  });
  
  return await response.json();
};

// Example: Language Selector Component
export const LanguageSelector = ({ value, onChange, languages }) => {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      className="language-selector"
    >
      <option value="">No Translation</option>
      {Object.entries(languages).map(([code, name]) => (
        <option key={code} value={code}>
          {name}
        </option>
      ))}
    </select>
  );
};

// Example: Message Display with Translation
export const MessageWithTranslation = ({ message }) => {
  const [showOriginal, setShowOriginal] = useState(false);
  
  return (
    <div className="message-bubble">
      {/* Show translated text if available */}
      {message.isTranslated && !showOriginal && (
        <div className="translated-message">
          <p className="text">{message.translatedText}</p>
          <div className="translation-info">
            <span className="icon">🌐</span>
            <span className="lang-badge">
              {message.sourceLang} → {message.targetLang}
            </span>
            <button 
              onClick={() => setShowOriginal(true)}
              className="show-original-btn"
            >
              Show Original
            </button>
          </div>
        </div>
      )}
      
      {/* Show original text */}
      {(!message.isTranslated || showOriginal) && (
        <div className="original-message">
          <p className="text">{message.text}</p>
          {message.isTranslated && (
            <button 
              onClick={() => setShowOriginal(false)}
              className="show-translation-btn"
            >
              Show Translation
            </button>
          )}
        </div>
      )}
      
      {/* Media content */}
      {message.image && <img src={message.image} alt="Shared" />}
      {message.video && <video src={message.video} controls />}
      {message.audio && <audio src={message.audio} controls />}
    </div>
  );
};

// Example: Usage in ChatPage component
/*
function ChatPage({ selectedUser }) {
  const [text, setText] = useState('');
  const [targetLang, setTargetLang] = useState('');
  const [languages, setLanguages] = useState({});
  
  useEffect(() => {
    // Load languages on mount
    translationService.getSupportedLanguages().then(setLanguages);
  }, []);
  
  const handleSendMessage = async () => {
    if (!text.trim()) return;
    
    const result = await sendMessageWithTranslation(
      text,
      selectedUser._id,
      targetLang // Will be '' if translation disabled
    );
    
    if (result.message === 'Message sent') {
      setText('');
      console.log('Original:', result.data.text);
      console.log('Translated:', result.data.translatedText);
    }
  };
  
  return (
    <div className="chat-page">
      <div className="messages">
        {messages.map(msg => (
          <MessageWithTranslation key={msg._id} message={msg} />
        ))}
      </div>
      
      <div className="input-area">
        <LanguageSelector 
          value={targetLang}
          onChange={setTargetLang}
          languages={languages}
        />
        
        <input 
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
        />
        
        <button onClick={handleSendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
*/

// CSS Styles Example
/*
.message-bubble {
  max-width: 70%;
  padding: 12px;
  border-radius: 12px;
  margin-bottom: 8px;
}

.translated-message {
  position: relative;
}

.translation-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.lang-badge {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
}

.show-original-btn,
.show-translation-btn {
  background: none;
  border: none;
  color: #60a5fa;
  cursor: pointer;
  text-decoration: underline;
  font-size: 12px;
}

.language-selector {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: white;
  margin-right: 8px;
}

.language-selector option {
  background: #1f2937;
  color: white;
}
*/

export default {
  translationService,
  sendMessageWithTranslation,
  LanguageSelector,
  MessageWithTranslation
};
