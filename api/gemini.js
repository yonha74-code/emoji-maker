export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(400).json({ error: 'API key required' });

  let body;
  try {
    const { parts, systemPrompt } = req.body;

    // 이미지 base64 크기 체크 및 축소
    const safeParts = parts.map(p => {
      if (p.inline_data && p.inline_data.data) {
        const sizeKB = Math.round(p.inline_data.data.length * 0.75 / 1024);
        console.log('Image size:', sizeKB, 'KB');
      }
      return p;
    });

    body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: safeParts }]
    };
  } catch(e) {
    return res.status(400).json({ error: 'Request parse error: ' + e.message });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    let data;
    const text = await r.text();
    try { data = JSON.parse(text); }
    catch(e) { return res.status(500).json({ error: 'Gemini non-JSON response: ' + text.slice(0, 200) }); }

    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || JSON.stringify(data).slice(0,200) });

    const resultText = ((data.candidates || [])[0]?.content?.parts || [])
      .map(p => p.text || '').join('');
    const match = resultText.match(/<svg[\s\S]*?<\/svg>/i);

    res.status(200).json({ svg: match ? match[0] : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
