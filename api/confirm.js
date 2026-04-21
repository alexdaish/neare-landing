export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  const token = (req.query.token || '').trim();
  if (!token || token.length < 20) {
    res.status(400).send(errorPage('Ungültiger Bestätigungslink.'));
    return;
  }

  const {
    AIRTABLE_API_KEY,
    AIRTABLE_BASE_ID,
    AIRTABLE_TABLE_NAME = 'Waitlist',
  } = process.env;

  if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
    res.status(500).send(errorPage('Serverfehler. Bitte versuche es später erneut.'));
    return;
  }

  try {
    const searchRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?filterByFormula=${encodeURIComponent(`{Confirm Token}="${token}"`)}`,
      {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      }
    );

    if (!searchRes.ok) {
      res.status(500).send(errorPage('Serverfehler. Bitte versuche es später erneut.'));
      return;
    }

    const data = await searchRes.json();
    if (!data.records || data.records.length === 0) {
      res.status(404).send(errorPage('Dieser Bestätigungslink ist ungültig oder wurde bereits verwendet.'));
      return;
    }

    const record = data.records[0];

    const updateRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}/${record.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            Status: 'confirmed',
            'Confirmed At': new Date().toISOString(),
          },
          typecast: true,
        }),
      }
    );

    if (!updateRes.ok) {
      res.status(500).send(errorPage('Serverfehler. Bitte versuche es später erneut.'));
      return;
    }

    res.status(200).send(successPage());
  } catch (e) {
    console.error('Confirm error', e);
    res.status(500).send(errorPage('Serverfehler. Bitte versuche es später erneut.'));
  }
}

function successPage() {
  return page(
    'Bestätigt!',
    'Danke — deine E-Mail-Adresse ist bestätigt. Du stehst jetzt auf der Neare-Warteliste. Wir melden uns, sobald der Frühzugang in Deutschland verfügbar ist.'
  );
}

function errorPage(msg) {
  return page('Fehler', msg);
}

function page(title, body) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — Neare</title>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap" rel="stylesheet">
<style>
  body { margin:0; font:17px/1.65 "DM Sans",sans-serif; background:#F5F0E8; color:#1F2A36; display:flex; align-items:center; justify-content:center; min-height:100vh; padding:24px; }
  .card { background:#EDE5D6; border-radius:20px; padding:48px 40px; max-width:480px; text-align:center; }
  h1 { color:#2C3E50; font-size:28px; font-weight:500; margin:0 0 16px; }
  p { color:#4A5E73; margin:0 0 24px; }
  a { display:inline-block; background:#C87A5C; color:#fff; padding:14px 28px; border-radius:12px; text-decoration:none; font-weight:600; }
  a:hover { background:#A85F42; }
</style>
</head>
<body>
<div class="card">
  <h1>${title}</h1>
  <p>${body}</p>
  <a href="/de">Zurück zur Startseite</a>
</div>
</body>
</html>`;
}
