import Message from '../models/Message.model.js';
import { io } from '../index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { translateText } from '../utils/translationService.js';

export const sendMessage = asyncHandler(async (req, res) => {
    const senderId = req.user._id;
    const { receiverId, text, targetLang, sourceLang } = req.body;
    const files = req.files || {};

    // Validate: at least one field must exist
    if (
        (!text || !text.trim()) &&
        !files.image &&
        !files.video &&
        !files.audio &&
        !files.file
    ) {
        return res.status(400).json({ message: 'Message cannot be empty' });
    }

    // Build message object
    const messageData = {
        sender: senderId,
        receiver: receiverId,
    };

    if (text && text.trim()) {
        messageData.text = text.trim();
        
        // If targetLang is provided, translate the message
        if (targetLang) {
            try {
                const translationResult = await translateText(
                    text.trim(),
                    targetLang,
                    sourceLang || 'auto'
                );
                
                if (translationResult.success) {
                    messageData.translatedText = translationResult.translated_text;
                    messageData.sourceLang = translationResult.source_lang;
                    messageData.targetLang = translationResult.target_lang;
                    messageData.isTranslated = true;
                }
            } catch (error) {
                console.error('Translation error:', error);
                // Continue without translation if service fails
            }
        }
    }

    if (files.image)
        messageData.image = files.image[0].path || files.image[0].secure_url;
    if (files.video)
        messageData.video = files.video[0].path || files.video[0].secure_url;
    if (files.audio)
        messageData.audio = files.audio[0].path || files.audio[0].secure_url;
    if (files.file)
        messageData.file = files.file[0].path || files.file[0].secure_url;

    // Save message
    const message = await Message.create(messageData);

    // Populate sender info before sending
    const populatedMessage = await message.populate(
        'sender',
        'username profilePic'
    );

    // Emit to both sender and receiver sockets
    io.to(receiverId.toString()).emit('newMessage', populatedMessage);
    io.to(senderId.toString()).emit('newMessage', populatedMessage);

    res.status(201).json({ message: 'Message sent', data: populatedMessage });
});

export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
        return res.status(404).json({ message: 'Message not found' });
    }

    if (message.sender.toString() !== currentUserId.toString()) {
        return res
            .status(403)
            .json({ message: 'You can only delete your own messages' });
    }

    io.to(message.receiver.toString()).emit('deleteMessage', messageId);
    io.to(currentUserId.toString()).emit('deleteMessage', messageId);

    // Use deleteOne instead of remove
    await message.deleteOne();

    res.status(200).json({ message: 'Message deleted' });
});

export const getMessages = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user._id;

    const messages = await Message.find({
        $or: [
            { sender: currentUserId, receiver: userId },
            { sender: userId, receiver: currentUserId },
        ],
    })
        .populate('sender', 'username profilePic')
        .populate('receiver', 'username profilePic')
        .sort({ createdAt: 1 });

    res.status(200).json(messages);
});
