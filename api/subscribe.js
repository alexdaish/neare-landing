import { Resend } from 'resend';

// Simple in-memory IP throttle (1 req / 5s per IP). Resets on cold start.
const lastSeen = new Map();
const RATE_MS = 5000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Welcome email for English signups. Image srcs must be absolute: an inbox has
// no base URL, so relative paths render as broken images.
const WELCOME_HTML = `<!DOCTYPE html>
<html lang="en-GB" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>You're on the Neare waitlist. Thank you.</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap" rel="stylesheet">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { color: #A85F42; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; font-size: inherit !important; font-family: inherit !important; font-weight: inherit !important; line-height: inherit !important; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .hero-img { border-radius: 0 !important; }
      .h1 { font-size: 25px !important; line-height: 1.25 !important; }
      .cta-td { padding-left: 24px !important; padding-right: 24px !important; }
      .cta-a { display: block !important; }
    }
    @media (prefers-color-scheme: dark) {
      body, .bg { background-color: #F5F0E8 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F5F0E8; -webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#F5F0E8; opacity:0;">
    You're on the Neare waitlist. 30 minutes for a $25 Amazon gift card?
    &#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;
  </div>

  <table role="presentation" class="bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F0E8;">
    <tr>
      <td align="center" style="padding:24px 12px 36px 12px;">

        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FBF8F2; border-radius:20px; border:1px solid rgba(44,62,80,0.10); overflow:hidden;">

          <!-- Header / wordmark -->
          <tr>
            <td class="px" align="left" style="padding:22px 40px 4px 40px;">
              <span style="font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:22px; font-weight:700; letter-spacing:-0.02em; color:#2C3E50;">neare</span>
            </td>
          </tr>

          <!-- Hero image -->
          <tr>
            <td class="px" style="padding:10px 40px 2px 40px;">
              <img class="hero-img" src="https://getneare.com/assets/hero-bg-800.jpg" width="520" alt="The Neare sensor, a small matte-white domed device, on a wooden sideboard in a warmly lit home, with an older woman holding a mug in the sunlit room behind." style="display:block; width:100%; max-width:520px; height:auto; border-radius:16px;">
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td class="px" align="left" style="padding:18px 40px 0 40px;">
              <h1 class="h1" style="margin:0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:28px; line-height:1.22; font-weight:500; letter-spacing:-0.02em; color:#1F2A36;">You're on the list. Now, a small favour?</h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="px" align="left" style="padding:12px 40px 0 40px;">
              <p style="margin:0 0 16px 0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#2C3E50;">Thanks for joining the Neare waitlist. You&rsquo;re one of the first people who raised their hand, and that genuinely means a lot.</p>
              <p style="margin:0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#2C3E50;">We&rsquo;re still early, and we&rsquo;d rather build the right thing than the fast thing. So we&rsquo;re speaking with a few early supporters one to one, to understand what&rsquo;s hard right now and whether Neare would genuinely help. Would you be open to a relaxed 30-minute call? No pitch, nothing to prepare, just your honest take. Even &lsquo;this isn&rsquo;t for me&rsquo; is exactly what we need to hear.</p>
            </td>
          </tr>

          <!-- Gift card strip (Amazon logo + offer) -->
          <tr>
            <td class="px" align="left" style="padding:16px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E4ECE2; border:1px solid rgba(110,138,109,0.30); border-radius:14px;">
                <tr>
                  <td valign="middle" width="72" style="padding:12px 0 12px 16px;">
                    <img src="https://getneare.com/assets/amazon-card-logo.png" width="64" alt="Amazon" style="display:block; width:64px; height:auto;">
                  </td>
                  <td valign="middle" style="padding:12px 16px 12px 12px;">
                    <p style="margin:0 0 3px 0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:11px; line-height:1.3; font-weight:600; letter-spacing:0.09em; text-transform:uppercase; color:#6E8A6D;">Our thank-you for your time</p>
                    <p style="margin:0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.45; color:#2C3E50;"><span style="font-weight:600;">A $25 Amazon gift card</span> for your 30 minutes, sent straight after the call.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA button (bulletproof) -->
          <tr>
            <td class="cta-td" align="left" style="padding:18px 40px 4px 40px;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="https://calendly.com/looi-getneare/30min" style="height:56px;v-text-anchor:middle;width:340px;" arcsize="25%" strokecolor="#A85F42" fillcolor="#C87A5C">
                <w:anchorlock/>
                <center style="color:#FFFFFF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:17px;font-weight:600;">Book a 30-minute chat</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-- -->
              <a class="cta-a" href="https://calendly.com/looi-getneare/30min" target="_blank" style="background-color:#C87A5C; border-radius:14px; color:#FFFFFF; display:inline-block; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; font-weight:600; line-height:56px; text-align:center; text-decoration:none; width:340px; -webkit-text-size-adjust:none; box-shadow:0 6px 18px rgba(168,95,66,0.28);">Book a 30-minute chat</a>
              <!--<![endif]-->
            </td>
          </tr>

          <!-- Line below button -->
          <tr>
            <td class="px" align="left" style="padding:12px 40px 0 40px;">
              <p style="margin:0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:15px; line-height:1.6; color:#6B7A88;">Pick whatever time suits you, it takes about a minute. If now isn&rsquo;t a good time, no worries at all, we&rsquo;ll keep you posted either way.</p>
            </td>
          </tr>

          <!-- Sign-off -->
          <tr>
            <td class="px" align="left" style="padding:22px 40px 4px 40px;">
              <p style="margin:0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.6; color:#2C3E50;">The Neare team</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td class="px" style="padding:22px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid rgba(44,62,80,0.10); font-size:0; line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="px" align="left" style="padding:16px 40px 28px 40px;">
              <p style="margin:0 0 10px 0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#6B7A88;">We may record calls for internal notes only. Just let us know if you&rsquo;d prefer we don&rsquo;t.</p>
              <p style="margin:0 0 10px 0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#6B7A88;">You&rsquo;re receiving this because you joined the Neare waitlist. Reply to <a href="mailto:hello@getneare.com?subject=unsubscribe" style="color:#6B7A88; text-decoration:underline;">hello@getneare.com</a> and we&rsquo;ll take you off the list.</p>
              <p style="margin:0; font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.6; color:#8A94A0;">Neare, 2 Arundel St, Temple, London WC2R 3DA, United Kingdom</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

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

  // 2. Best-effort confirmation email via Resend SDK - only once we know the
  // signup was actually persisted, so a failed write never looks like a success
  // in the subscriber's inbox.
  if (RESEND_API_KEY && airtableOk && confirmTokenStored) {
    try {
      const resend = new Resend(RESEND_API_KEY);
      const siteUrl = process.env.SITE_URL || 'https://getneare.com';

      const emailContent =
        locale === 'de'
          ? {
              subject: 'Bitte bestätige deine E-Mail-Adresse für Neare',
              text:
                'Danke für dein Interesse an Neare!\n\n' +
                'Bitte bestätige deine E-Mail-Adresse, indem du auf den folgenden Link klickst:\n\n' +
                `${siteUrl}/api/confirm?token=${confirmToken}\n\n` +
                'Wir entwickeln eine neue Art, frühe Anzeichen kognitiver Veränderungen zu Hause zu erkennen: ohne Kameras, ohne Wearables, nur ein leiser Sensor und eine App, die dir sagt, wenn etwas Wichtiges passiert.\n\n' +
                'Wir melden uns, sobald der Frühzugang verfügbar ist.\n\n' +
                'Das Neare-Team',
            }
          : {
              subject: "You're on the Neare early access list",
              // Plain-text alternative. Sent alongside the HTML for clients that
              // block it, and it helps deliverability.
              text:
                "Thanks for joining the Neare waitlist. You're one of the first people who raised their hand, and that genuinely means a lot.\n\n" +
                "We're still early, and we'd rather build the right thing than the fast thing. So we're speaking with a few early supporters one to one, to understand what's hard right now and whether Neare would genuinely help.\n\n" +
                "Would you be open to a relaxed 30-minute call? No pitch, nothing to prepare, just your honest take. Even 'this isn't for me' is exactly what we need to hear.\n\n" +
                "As a thank-you for your time, we'll send you a $25 Amazon gift card straight after the call.\n\n" +
                "Book a time that suits you: https://calendly.com/looi-getneare/30min\n\n" +
                "If now isn't a good time, no worries at all, we'll keep you posted either way.\n\n" +
                'The Neare team\n\n' +
                '---\n' +
                'We may record calls for internal notes only. Just let us know if you would prefer we did not.\n' +
                "You're receiving this because you joined the Neare waitlist. Reply to hello@getneare.com and we'll take you off the list.\n" +
                'Neare, 2 Arundel St, Temple, London WC2R 3DA, United Kingdom',
              html: WELCOME_HTML,
            };

      const message = {
        from: RESEND_FROM,
        to: [email],
        subject: emailContent.subject,
        text: emailContent.text,
        headers: {
          'List-Unsubscribe': '<mailto:hello@getneare.com?subject=unsubscribe>',
        },
      };
      if (emailContent.html) message.html = emailContent.html;
      await resend.emails.send(message);
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
    // Stored, but the double opt-in link can't work - surface it rather than
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
// offending field - one at a time, since Airtable reports only the first.
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
