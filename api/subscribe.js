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
  const locale = clean(body.locale, 8) || 'en';

  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME = 'Waitlist',
    RESEND_API_KEY,
    RESEND_FROM = 'Neare <hello@getneare.com>',
    FB_ACCESS_TOKEN,
    FB_PIXEL_ID = '1892352458820371',
  } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    console.error('Missing Airtable env vars');
    res.status(500).json({ error: 'server_misconfigured', detail: 'missing_airtable_env' });
    return;
  }

  const confirmToken = locale === 'de'
    ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(24)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    : '';

  // 1. Write to Airtable (native fetch, Node 18+)
  const write = await createAirtableRecord({
    apiKey: AIRTABLE_API_KEY,
    baseId: AIRTABLE_BASE_ID,
    tableName: AIRTABLE_TABLE_NAME,
    fields: {
      Email: email,
      Variant: variant,
      Locale: locale,
      Status: locale === 'de' ? 'pending' : 'confirmed',
      'Confirm Token': locale === 'de' ? confirmToken : '',
      'UTM Source': clean(body.utm_source),
      'UTM Medium': clean(body.utm_medium),
      'UTM Campaign': clean(body.utm_campaign),
      'UTM Content': clean(body.utm_content),
      'UTM Term': clean(body.utm_term),
      Referrer: clean(body.referrer),
      'User Agent': clean(req.headers['user-agent'], 512),
      IP: ip,
    },
  });

  const airtableOk = write.ok;

  // A German signup is double opt-in: without a stored Confirm Token the link in
  // the email can never be validated, so don't send a dead confirmation link.
  const confirmTokenStored = locale !== 'de' || (write.ok && !write.dropped.includes('Confirm Token'));

  // 2. Best-effort confirmation email via Resend SDK — only once we know the
  // signup was actually persisted, so a failed write never looks like a success
  // in the subscriber's inbox.
  if (RESEND_API_KEY && airtableOk && confirmTokenStored) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const siteUrl = process.env.SITE_URL || 'https://getneare.com';

      const emailContent =
        locale === 'de'
          ? {
              subject: 'Bitte bestätige deine E-Mail-Adresse — Neare',
              text:
                'Danke für dein Interesse an Neare!\n\n' +
                'Bitte bestätige deine E-Mail-Adresse, indem du auf den folgenden Link klickst:\n\n' +
                `${siteUrl}/api/confirm?token=${confirmToken}\n\n` +
                'Wir entwickeln eine neue Art, frühe Anzeichen kognitiver Veränderungen zu Hause zu erkennen — ohne Kameras, ohne Wearables, nur ein leiser Sensor und eine App, die dir sagt, wenn etwas Wichtiges passiert.\n\n' +
                'Wir melden uns, sobald der Frühzugang verfügbar ist.\n\n' +
                '— Das Neare-Team',
            }
          : {
              subject: "You're on the Neare early access list",
              text:
                "Thanks for joining the Neare waitlist.\n\n" +
                "We're building a new way for families to notice early signs of cognitive change at home — no cameras, no wearables, just a quiet sensor and an app that tells you when something matters.\n\n" +
                "We'll be in touch when early access opens.\n\n" +
                '— The Neare team',
            };

      await resend.emails.send({
        from: RESEND_FROM,
        to: [email],
        subject: emailContent.subject,
        text: emailContent.text,
      });
    } catch (e) {
      console.error('Resend error', e);
    }
  }

  // 3. Best-effort Facebook Conversions API event
  if (FB_ACCESS_TOKEN) {
    try {
      const eventId = clean(body.event_id, 64) || `lead_${Date.now()}`;
      const fbRes = await fetch(
        `https://graph.facebook.com/v22.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: [
              {
                event_name: 'Lead',
                event_time: Math.floor(Date.now() / 1000),
                event_id: eventId,
                action_source: 'website',
                event_source_url: clean(body.page_url, 2048) || 'https://getneare.com',
                user_data: {
                  em: [await sha256(email)],
                  client_ip_address: ip,
                  client_user_agent: clean(req.headers['user-agent'], 512),
                },
              },
            ],
          }),
        }
      );
      if (!fbRes.ok) {
        const text = await fbRes.text();
        console.error('FB CAPI error', fbRes.status, text);
      }
    } catch (e) {
      console.error('FB CAPI threw', e);
    }
  }

  if (airtableOk && confirmTokenStored) {
    res.status(200).json({ ok: true });
  } else if (airtableOk) {
    // Stored, but the double opt-in link can't work — surface it rather than
    // telling a German subscriber to check for an email that never went out.
    res.status(500).json({ error: 'storage_failed', detail: 'confirm_token_field_missing' });
  } else {
    res.status(500).json({
      error: 'storage_failed',
      detail: write.detail || 'airtable_write_failed',
    });
  }
}

// Airtable rejects an entire record with 422 UNKNOWN_FIELD_NAME if any single
// field doesn't exist in the table (typecast only coerces values, it does not
// create columns). Rather than silently dropping the signup, retry without the
// offending field — one at a time, since Airtable reports only the first.
const REQUIRED_FIELDS = ['Email'];

async function createAirtableRecord({ apiKey, baseId, tableName, fields }) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}`;
  const payload = { ...fields };
  const dropped = [];

  // Bounded: at most one attempt per optional field, plus the initial try.
  const maxAttempts = Object.keys(payload).length + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ records: [{ fields: payload }], typecast: true }),
      });
    } catch (e) {
      console.error('Airtable fetch threw', e);
      return { ok: false, detail: 'airtable_unreachable', dropped };
    }

    if (res.ok) {
      if (dropped.length) {
        console.error(
          `Airtable: wrote record without missing field(s): ${dropped.join(', ')}. ` +
            `Add these columns to the "${tableName}" table to stop losing this data.`
        );
      }
      return { ok: true, dropped };
    }

    const text = await res.text();
    console.error('Airtable error', res.status, text);

    const unknown = unknownFieldName(res.status, text);
    if (unknown && unknown in payload && !REQUIRED_FIELDS.includes(unknown)) {
      delete payload[unknown];
      dropped.push(unknown);
      continue;
    }

    return { ok: false, detail: `airtable_${res.status}`, dropped };
  }

  return { ok: false, detail: 'airtable_schema_mismatch', dropped };
}

function unknownFieldName(status, text) {
  if (status !== 422) return '';
  try {
    const parsed = JSON.parse(text);
    const err = parsed && parsed.error;
    if (!err || err.type !== 'UNKNOWN_FIELD_NAME') return '';
    const match = /Unknown field name:\s*"?([^"]+)"?/.exec(err.message || '');
    return match ? match[1].trim() : '';
  } catch (e) {
    return '';
  }
}

async function sha256(str) {
  const buf = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
