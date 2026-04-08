# Neare — Image Brief

Five images, ranked by priority. **#1 is the single highest-leverage thing you can create** — without it the page is abstract.

The overall aesthetic: **warm, lived-in, honest, British.** Morning light through net curtains, not golden hour in a Copenhagen showroom. No "happy elderly couple" stock. No clinical white backgrounds. No phones held dramatically in front of concerned faces. The product is not lifestyle marketing — it's furniture.

Palette reference (match throughout):
- Warm stone `#F5F1EA` backgrounds
- Muted sage `#8FA68E` as the only saturated accent
- Soft navy `#2C3E50` for tech/device surfaces
- Avoid: cool greys, pure white, bright primaries, purple

---

## 1. Hero product shot — REPLACES `/assets/sensor-hero.svg`

**Filename:** `assets/hero.jpg` (or `.webp`)
**Dimensions:** 1040 × 1040 square (will render max 520px on page)
**What it shows:** The Neare sensor sitting on a side table in a real home. One clear, warm object shot — product + minimal context. A folded newspaper, a cup of tea, a framed photo of family blurred in the background. Morning light from the left.
**Mood:** "This thing belongs here." Not hero-lit. Not floating. On a surface, in a home, being unremarkable.
**Product shape to render:** A small white ceramic-matte rectangle about the size of a paperback, rounded corners (16px), one subtle sage-green indicator dot on the front, a discreet cable running off the back of the table. Think Apple HomePod mini × Muji alarm clock.
**What to avoid:** Glossy plastic, LEDs, screens, any visible camera lens, anything that looks surveillance-y.

## 2. Product showcase — REPLACES `/assets/product-showcase.svg`

**Filename:** `assets/product-showcase.jpg`
**Dimensions:** 1920 × 1120 (16:9-ish)
**What it shows:** Wider interior scene. The sensor on the same side table, but now you can see more of the room — a soft armchair, a bookshelf with worn paperbacks, a houseplant, a framed photo. A phone rests beside the sensor showing a gentle notification on its lock screen.
**Mood:** Lived-in, warm, British sitting room. Think "my mum's house on a Sunday afternoon." Not styled, not sparse, not minimalist. Real cushions, real clutter, real light.
**Phone content:** Lock screen showing a single Neare notification: *"Mum slept well last night. Routine looks steady this week."* Small sage-green app icon. Time: 08:14.

## 3. How It Works — step icons/illustrations (optional but high impact)

**Filenames:** `assets/step-1.svg`, `assets/step-2.svg`, `assets/step-3.svg`
**Dimensions:** 320 × 200 each, landscape
**Style:** Flat, warm, two-colour (sage + navy on stone background). Line-drawn rather than filled. Think *Monocle magazine* infographic. Not 3D, not glossy, no gradients, no drop shadows.
**Content:**
- **Step 1 — "Place the sensor":** A hand placing the sensor on a shelf next to a framed photo. Show scale.
- **Step 2 — "Learns their rhythm":** A simple 7-day timeline with gentle wave shapes — sleep, movement, routine — settling into a pattern. Abstract, not a dashboard.
- **Step 3 — "You get guidance":** A phone with a single, clear message bubble and a small "Share with GP" button. Not a dashboard. One sentence.

## 4. Final CTA ambient photo (optional)

**Filename:** `assets/final-ambient.jpg`
**Dimensions:** 2400 × 900 (very wide)
**What it shows:** A hand holding a phone at a kitchen table in soft morning light. Tea, toast crumbs, a newspaper, a house key. The phone screen is angled away — you can't read it. The feeling is: *a quiet moment of reassurance before the day starts.*
**Mood:** Not staged. Not a model. Honest hands — someone who has lived a life. Warmth and stillness.
**Use:** Full-bleed background behind the final CTA section, with heavy overlay.

## 5. Optional: sensor size reference

**Filename:** `assets/sensor-scale.jpg`
**Dimensions:** 1200 × 800
**What it shows:** The sensor next to a common object for scale — a paperback book, a mug, a TV remote. Shot from above, on a wooden surface, even light.
**Purpose:** Kills the "is this a big intrusive thing?" objection in one glance. Could sit next to "Meet the sensor" copy or inside the first How It Works card.

---

## Technical notes

- **Format:** JPG for photos (quality 82), SVG for illustrations, WebP is even better if you can export it
- **Max file size:** 200 KB per image (the page needs to stay fast)
- **Colour profile:** sRGB
- **Where to drop them:** `/assets/` folder. Use the exact filenames above and they'll slot in automatically — no code changes needed for #1 and #2. For #3 I'll wire in the step-card images once you have them.
- **Licensing:** Whatever you create needs to be yours. If you use Midjourney/DALL-E, review the commercial licence terms and keep the generation records.
