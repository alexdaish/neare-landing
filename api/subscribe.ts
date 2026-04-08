import type { VercelRequest, VercelResponse } from '@vercel/node';

// Simple in-memory IP throttle (1 req / 5s).
// Resets per cold start — fine for casual abuse deterrence.
const lastSeen = new Map<string, number>();
const RATE_MS = 5000;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v: unknown, max = 256): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const ip =
    (req.headers['x-forwarded-for'] as string || '').split(',')[0].trim() ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';

  const now = Date.now();
  const prev = lastSeen.get(ip) || 0;
  if (now - prev < RATE_MS) {
    res.status(429).json({ error: 'rate_limited' });
    return;
  }
  lastSeen.set(ip, now);

  const body = (req.body || {}) as Record<string, unknown>;
  const email = clean(body.email, 254).trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'invalid_email' });
    return;
  }

  const variant = clean(body.variant, 8) || 'A';
  const fields = {
    Email: email,
    Variant: variant === 'B' ? 'B' : 'A',
    'UTM Source': clean(body.utm_source),
    'UTM Medium': clean(body.utm_medium),
    'UTM Campaign': clean(body.utm_campaign),
    'UTM Content': clean(body.utm_content),
    'UTM Term': clean(body.utm_term),
    Referrer: clean(body.referrer, 512),
    'User Agent': clean(req.headers['user-agent'] as string, 512),
    IP: ip,
  };

  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME = 'Waitlist',
    RESEND_API_KEY,
    RESEND_FROM = 'Neare <hello@neare.co>',
  } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable env vars');
    res.status(500).json({ error: 'server_misconfigured' });
    return;
  }

  // 1. Write to Airtable
  try {
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields }], typecast: true }),
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

  // 2. Best-effort confirmation email via Resend
  if (RESEND_API_KEY) {
    try {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: RESEND_FROM,
          to: [email],
          subject: "You're on the Neare early access list",
          text:
            "You're on the Neare early access list. We'll be in touch when we're ready to welcome the first families in.\n\n— The Neare team",
        }),
      });
      if (!resendRes.ok) {
        console.error('Resend error', resendRes.status, await resendRes.text());
      }
    } catch (e) {
      console.error('Resend fetch threw', e);
    }
  }

  res.status(200).json({ ok: true });
}
