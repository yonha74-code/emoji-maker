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

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    let data;
    const text = await r.text();
    try { data = JSON.parse(text); }
    catch(e) { return res.status(500).json({ error: 'Claude non-JSON: ' + text.slice(0,200) }); }

    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || JSON.stringify(data).slice(0,200) });

    const resultText = (data.content || []).map(c => c.text || '').join('');
    const match = resultText.match(/<svg[\s\S]*?<\/svg>/i);

    res.status(200).json({ svg: match ? match[0] : null });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
