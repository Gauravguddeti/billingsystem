// Vercel Serverless Function to handle Groq API calls
// This keeps the API key secure on the server side

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { messages, context } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Get API key from environment variable (set in Vercel dashboard)
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
        }

        // Call Groq API
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'mixtral-8x7b-32768',
                messages: [
                    {
                        role: 'system',
                        content: `You are a helpful business assistant for a GST billing system. ${context || ''}`
                    },
                    ...messages
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Groq API error:', error);
            console.error('Request body:', JSON.stringify({ messages: [{ role: 'system', content: 'System message' }, ...messages], model: 'mixtral-8x7b-32768' }));
            return res.status(response.status).json({ error: 'Failed to get AI response', details: error });
        }

        const data = await response.json();
        return res.status(200).json(data);

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
