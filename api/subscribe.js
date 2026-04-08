import { Resend } from 'resend';

// Simple in-memory IP throttle (1 req / 5s per IP). Resets on cold start.
const lastSeen = new Map();
const RATE_MS = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v, max = 256) {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';

  const now = Date.now();
  const prev = lastSeen.get(ip) || 0;
  if (now - prev < RATE_MS) {
    res.status(429).json({ error: 'rate_limited' });
    return;
  }
  lastSeen.set(ip, now);

  const body = req.body || {};
  const email = clean(body.email, 254).trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  const variant = clean(body.variant, 8) === 'B' ? 'B' : 'A';

  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME = 'Waitlist',
    RESEND_API_KEY,
    RESEND_FROM = 'Neare <hello@getneare.com>',
  } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable env vars');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  // 1. Write to Airtable (native fetch, Node 18+)
  try {
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [
            {
              fields: {
                Email: email,
                'Signed Up': new Date().toISOString(),
                Variant: variant,
                'UTM Source': clean(body.utm_source),
                'UTM Medium': clean(body.utm_medium),
                'UTM Campaign': clean(body.utm_campaign),
              },
            },
          ],
          typecast: true,
        }),
      }
    );
    if (!airtableRes.ok) {
      const text = await airtableRes.text();
      console.error('Airtable error', airtableRes.status, text);
      res.status(500).json({ error: 'storage_failed' });
      return;
    }
  } catch (e) {
    console.error('Airtable fetch threw', e);
    res.status(500).json({ error: 'storage_failed' });
    return;
  }

  // 2. Best-effort confirmation email via Resend SDK
  if (RESEND_API_KEY) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      await resend.emails.send({
        from: RESEND_FROM,
        to: [email],
        subject: "You're on the Neare early access list",
        text:
          "Thanks for joining the Neare waitlist.\n\n" +
          "We're building a new way for families to notice early signs of cognitive change at home — no cameras, no wearables, just a quiet sensor and an app that tells you when something matters.\n\n" +
          "We'll be in touch when early access opens.\n\n" +
          '— The Neare team',
      });
    } catch (e) {
      console.error('Resend error', e);
      // Lead is already captured — confirmation email is best-effort.
    }
  }

  res.status(200).json({ ok: true });
}
