import axios from 'axios';

const TRANSLATION_API_URL = process.env.TRANSLATION_API_URL || 'http://localhost:5001';

const FALLBACK_LANGUAGES = Object.freeze({
    en: 'English',
    hi: 'Hindi',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    it: 'Italian',
    pt: 'Portuguese',
    ru: 'Russian',
    zh: 'Chinese (Simplified)',
    ja: 'Japanese',
    ko: 'Korean',
    ar: 'Arabic',
    bn: 'Bengali',
    ta: 'Tamil',
    te: 'Telugu',
    mr: 'Marathi',
    ur: 'Urdu',
    pa: 'Punjabi',
    gu: 'Gujarati'
});

/**
 * Translate text using the AI translation service
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code (e.g., 'hi', 'en', 'es')
 * @param {string} sourceLang - Source language code (default: 'auto')
 * @returns {Promise<Object>} Translation result
 */
export const translateText = async (text, targetLang, sourceLang = 'auto') => {
    try {
        const response = await axios.post(`${TRANSLATION_API_URL}/api/translate`, {
            text,
            source_lang: sourceLang,
            target_lang: targetLang
        });
        
        return response.data;
    } catch (error) {
        console.error('Translation error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Translation failed');
    }
};

/**
 * Translate multiple texts at once
 * @param {string[]} texts - Array of texts to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (default: 'auto')
 * @returns {Promise<Object>} Batch translation result
 */
export const translateBatch = async (texts, targetLang, sourceLang = 'auto') => {
    try {
        const response = await axios.post(`${TRANSLATION_API_URL}/api/translate/batch`, {
            texts,
            source_lang: sourceLang,
            target_lang: targetLang
        });
        
        return response.data;
    } catch (error) {
        console.error('Batch translation error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || 'Batch translation failed');
    }
};

/**
 * Get list of supported languages
 * @returns {Promise<Object>} Supported languages
 */
export const getSupportedLanguages = async () => {
    try {
        const response = await axios.get(`${TRANSLATION_API_URL}/api/languages`);
        const data = response.data;
        if (data?.languages) {
            return data;
        }
        throw new Error('Invalid languages payload');
    } catch (error) {
        console.error('Error fetching languages:', error.response?.data || error.message);
        return {
            success: true,
            fallback: true,
            languages: FALLBACK_LANGUAGES
        };
    }
};

/**
 * Check if translation service is healthy
 * @returns {Promise<boolean>} Service health status
 */
export const checkTranslationServiceHealth = async () => {
    try {
        const response = await axios.get(`${TRANSLATION_API_URL}/health`);
        return response.data.status === 'healthy';
    } catch (error) {
        console.error('Translation service health check failed:', error.message);
        return false;
    }
};
