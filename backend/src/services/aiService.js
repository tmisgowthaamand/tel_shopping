const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../utils/logger');

class AIService {
    constructor() {
        if (config.groq.apiKey) {
            this.client = new Groq({
                apiKey: config.groq.apiKey
            });
        } else {
            logger.warn('GROQ_API_KEY is not defined. AI features will be disabled.');
        }
    }

    /**
     * Transcribe audio file to text
     */
    async transcribeAudio(audioPath) {
        if (!this.client) throw new Error('AI Service not initialized');

        try {
            const transcription = await this.client.audio.transcriptions.create({
                file: fs.createReadStream(audioPath),
                model: 'whisper-large-v3',
                response_format: 'text',
            });
            return transcription;
        } catch (error) {
            logger.error('Transcription error:', error);
            throw error;
        }
    }

    /**
     * Process user message and return intent and response
     */
    async processMessage(user, message, context = {}) {
        if (!this.client) return { intent: 'error', response: 'AI features are currently unavailable.' };

        try {
            const systemPrompt = `
You are an AI Shopping Assistant for "ATZ Store", a premium food and grocery delivery platform.
Your goal is to help users browse menu, add items to cart, check order status, and answer general questions.

User Details:
- Name: ${user.getFullName()}
- Current State: ${user.currentState}
- Cart Items: ${context.cartCount || 0}
- Active Orders: ${context.activeOrdersCount || 0}

Available Product Categories: ${context.categories ? context.categories.join(', ') : 'All categories'}

Rules:
1. Always be polite, helpful, and professional.
2. Support 9 languages: English, Hindi, Telugu, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati. Respond in the same language as the user.
3. If the user wants to order something, detect the product name and quantity.
4. If the user asks about an order, check if they have active orders.
5. If you are unsure, ask clarifying questions.
6. Keep responses concise and friendly, suitable for a chat bot.

IMPORTANT: You must return your response in JSON format with two fields:
- "intent": One of ["browse", "search", "add_to_cart", "view_cart", "checkout", "track_order", "cancel_order", "help", "general"]
- "response": The natural language response to the user.
- "data": (Optional) Any specific data extracted (e.g., product name, quantity, order ID).

Example JSON:
{
  "intent": "add_to_cart",
  "response": "Sure! I've added 2 Large Pizzas to your cart. Anything else?",
  "data": { "product": "pizza", "quantity": 2 }
}
            `;

            const chatCompletion = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                model: config.groq.model,
                response_format: { type: 'json_object' }
            });

            const result = JSON.parse(chatCompletion.choices[0].message.content);
            return result;
        } catch (error) {
            logger.error('AI Process error:', error);
            return {
                intent: 'general',
                response: 'I heard you, but I had a bit of trouble processing that. How can I help you today?'
            };
        }
    }

    /**
     * Generate product description using AI
     */
    async generateProductDescription(productName, categoryName) {
        if (!this.client) throw new Error('AI Service not initialized');

        try {
            const prompt = `Generate a compelling, professional, and SEO-friendly product description for a product named "${productName}" in the category "${categoryName}". 
            Keep it between 100-150 words. Focus on benefits, quality, and use cases. Use a premium and helpful tone.
            Return ONLY the description text, no preamble or extra commentary.`;

            const chatCompletion = await this.client.chat.completions.create({
                messages: [
                    { role: 'system', content: 'You are a professional e-commerce copywriter.' },
                    { role: 'user', content: prompt }
                ],
                model: config.groq.model,
            });

            return chatCompletion.choices[0].message.content.trim();
        } catch (error) {
            logger.error('AI description generation error:', error);
            throw error;
        }
    }
}

module.exports = new AIService();
