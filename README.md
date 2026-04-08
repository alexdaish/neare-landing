# Neare landing

Static landing page + one Vercel serverless function. No build step.

## Pages
- `/` → `index.html` (Variant A — peace of mind)
- `/b` → `variant-b.html` (Variant B — early warning)

Only the `<h1>` and subhead differ between the two. Point Meta ads 50/50 at `/` and `/b`.

## Email capture
`POST /api/subscribe` → writes to Airtable, then sends a confirmation via Resend.

## Env vars (set in Vercel project)
See `.env.example`:
- `AIRTABLE_API_KEY` — personal access token, scoped to one base
- `AIRTABLE_BASE_ID`
- `AIRTABLE_TABLE_NAME` (default `Waitlist`)
- `RESEND_API_KEY`
- `RESEND_FROM` (verified sender, e.g. `Neare <hello@neare.co>`)

## Airtable schema (`Waitlist` table)
| Field         | Type              |
|---------------|-------------------|
| Email         | Single line text  |
| Created       | Created time      |
| Variant       | Single select (A, B) |
| UTM Source    | Single line text  |
| UTM Medium    | Single line text  |
| UTM Campaign  | Single line text  |
| UTM Content   | Single line text  |
| UTM Term      | Single line text  |
| Referrer      | Single line text  |
| User Agent    | Long text         |
| IP            | Single line text  |

## Local dev
```
npm install
vercel dev
```

## Deploy
```
vercel --prod
```
