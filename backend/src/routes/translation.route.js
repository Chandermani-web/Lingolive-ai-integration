import express from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { translateText, translateBatch, getSupportedLanguages, checkTranslationServiceHealth } from '../utils/translationService.js';

const router = express.Router();

// Translate single text
router.post('/translate', asyncHandler(async (req, res) => {
    const { text, targetLang, sourceLang } = req.body;

    if (!text || !targetLang) {
        return res.status(400).json({
            success: false,
            message: 'text and targetLang are required'
        });
    }

    try {
        const result = await translateText(text, targetLang, sourceLang || 'auto');
        res.status(200).json(result);
    } catch (error) {
        console.error('Translate route error:', error);
        res.status(502).json({
            success: false,
            error: error.message || 'Unable to translate text right now'
        });
    }
}));

// Translate batch of texts
router.post('/translate/batch', asyncHandler(async (req, res) => {
    const { texts, targetLang, sourceLang } = req.body;

    if (!texts || !Array.isArray(texts) || !targetLang) {
        return res.status(400).json({
            success: false,
            message: 'texts (array) and targetLang are required'
        });
    }

    try {
        const result = await translateBatch(texts, targetLang, sourceLang || 'auto');
        res.status(200).json(result);
    } catch (error) {
        console.error('Batch translate route error:', error);
        res.status(502).json({
            success: false,
            error: error.message || 'Unable to translate messages right now'
        });
    }
}));

// Get supported languages
router.get('/languages', asyncHandler(async (req, res) => {
    try {
        const result = await getSupportedLanguages();
        res.status(200).json(result);
    } catch (error) {
        console.error('Languages route error:', error);
        res.status(502).json({
            success: false,
            error: error.message || 'Unable to load supported languages'
        });
    }
}));

// Health check
router.get('/health', asyncHandler(async (req, res) => {
    const isHealthy = await checkTranslationServiceHealth();
    res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        status: isHealthy ? 'healthy' : 'unhealthy'
    });
}));

export default router;
