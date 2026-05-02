import { NextRequest } from 'next/server';

const WHATSAPP_PROMPT = `This is a WhatsApp chat screenshot containing one or more shop orders.
Each order block has: a shop photo (ignore it), then text with Date, Outlet Name, Area, Order items, and Value.

Extract ALL order blocks visible in the screenshot.

For each order block:
- customerName: the Outlet Name from TEXT only — ignore shop signboard images. null if blank or missing.
- customerAddress: the Area field value
- date: the Date field value
- items: parse each line under the "Order." heading.

Parsing rules:
"75GM Jelly 120/ - 2Pcs" → { "name": "75GM Jelly", "rate": 120, "qty": 2 }
"75GM Pudding 120/ - 2 Pcs" → { "name": "75GM Pudding", "rate": 120, "qty": 2 }
"25 Pcs Jelly - 00 Pcs" → { "name": "25 Pcs Jelly", "rate": 0, "qty": 0 }
"100 Pcs Jelly - 01 Pcs" → { "name": "100 Pcs Jelly", "rate": 0, "qty": 1 }
"Value -714" → this is the order TOTAL, NOT an item. Skip it entirely.

The number after the product name and before "/" is the RATE (price).
The number after "- " at the end is the QUANTITY.
If qty is 0, still include the item (caller will filter).

- notes: any other relevant text

Return ONLY raw valid JSON, absolutely no markdown, no backticks, no explanation:
{"orders":[{"customerName":"string or null","customerAddress":"string or null","date":"string or null","items":[{"name":"string","rate":0,"qty":0}],"notes":"string or null"}]}`;

export async function POST(request: NextRequest) {
  try {
    // Parse formdata
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return Response.json({ error: 'No image provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return Response.json({ error: 'Only images supported. Please screenshot your PDF.' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      console.error('GROQ_API_KEY not set in environment');
      return Response.json({ error: 'AI service not configured (missing GROQ_API_KEY)' }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        temperature: 0,
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: WHATSAPP_PROMPT },
            { type: 'image_url', image_url: { url: `data:${file.type};base64,${base64}` } }
          ]
        }]
      })
    });

    if (!groqResponse.ok) {
      let errMsg = `Groq API returned ${groqResponse.status}`;
      try {
        const err = await groqResponse.json();
        errMsg = err?.error?.message || errMsg;
        console.error('Groq API error:', err);
      } catch {}
      return Response.json({ error: errMsg }, { status: 502 });
    }

    const groqData = await groqResponse.json();
    const rawText: string = groqData.choices?.[0]?.message?.content ?? '';

    // Strip any accidental markdown fences
    const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('JSON parse failed. Raw Groq output:', cleaned);
      return Response.json({ error: 'AI returned unreadable response. Try a clearer screenshot.', raw: cleaned }, { status: 422 });
    }

    return Response.json(parsed);

  } catch (error: any) {
    console.error('Extract order error:', error);
    return Response.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
