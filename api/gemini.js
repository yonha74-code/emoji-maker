export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  try {
    const { parts, systemPrompt } = req.body;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts }]
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);

    // Extract SVG text server-side and return it directly
    const text = ((data.candidates || [])[0]?.content?.parts || [])
      .map(p => p.text || '').join('');
    const match = text.match(/<svg[\s\S]*?<\/svg>/i);
    const svg = match ? match[0] : null;

    res.status(200).json({ svg, raw: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
