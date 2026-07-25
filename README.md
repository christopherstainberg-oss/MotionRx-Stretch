# MotionRx Stretch — Physical Therapy Stretching Application

**Official brand: MotionRx Stretch** — *Prescribed motion for real life*

Clinically inspired **Progressive Web App** for guided stretching and mobility: symptom-based routines, pain-scale dosing, step-by-step (kid-friendly) instructions, institutional video links, progress tracking, journal, community tips, education, secure login, Docker/Portainer deploy, and Watchtower auto-updates via **ghcr.io**.

Built from `Build.MD` requirements.

---

## Name options (official selection highlighted)

| # | Name | Tagline |
|---|------|---------|
| 1 | FlexaCare | Clinically guided flexibility, every day |
| 2 | StretchPath PT | Your path from stiffness to strength |
| 3 | Mobilify | Move better. Feel stronger. |
| 4 | RangeReady | Restore range. Stay ready. |
| 5 | TheraStretch | Therapeutic stretching, simplified |
| 6 | FlexGuide Pro | Evidence-based guidance you can trust |
| 7 | RecoveryRange | From recovery to lasting mobility |
| 8 | StretchClinic | Outpatient-quality routines at home |
| 9 | **MotionRx Stretch** ✓ **chosen** | Prescribed motion for real life |
| 10 | PT Flex Journal | Stretch, track, reflect, improve |

---

## Features

- **Separate Stretch Library** and **Exercise Library** (Build.MD: two sections)
- **Exercise catalog capacity: 1,000,000** virtual entries from clinical bases × modifiers
- **Paragraph-based intake** — write concerns; auto-detect areas, symptoms, stretch vs exercise bias
- **Hybrid plans** — suggests stretches and/or exercises; pain-scale self-adjust
- **Routine Builder** — add from either library; **rotate one item or entire routine**
- **Clinical education on every movement** — what it does, why important, outcome rationale
- **Jeffery AI coach** — clinical Q&A, open-ended questions, program adjusts from chat (optional `XAI_API_KEY` / SpaceXAI; offline coach always works)
- **Correlated Insights** — sessions + journal + pain + goals + Jeffery + rotations
- **Self-adjusting programs** after session feedback (progress / hold / modify / regress)
- **Step-by-step** kid-friendly guidance, institutional video fields
- **Journal**, **progress/goals**, **education**, **community**, **secure auth**, **PWA**
- **Docker / Portainer / Watchtower / ghcr.io**

### Library scale note

`Build.MD` requests very large catalogs. Shipping millions of unique filmed demos is not realistic as static seed data. MotionRx Stretch ships:

- Clinician-authored **stretch** and **exercise** bases with full clinical detail  
- Named **variations** and **context/dosing modifiers**  
- Exercise **virtual catalog** addressable to 1,000,000 IDs for scale architecture  

Quality and safety take priority; expand via CMS/import when ready.

---

## Quick start (local)

```bash
cd "H:\My Drive\Projects\Physical Therapy Stretching Application"
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build
npm start
```

---

## Docker Compose / Portainer

1. Copy `.env.example` → `.env` and set `AUTH_SECRET`.
2. In Portainer: **Stacks → Add stack** → paste `docker-compose.yml` (or deploy from repo).
3. Build & deploy:

```bash
docker compose build
docker compose up -d
```

Services:

| Service | Role |
|---------|------|
| `motionrx` | Next.js app (standalone), port 3000, persistent `/app/data` |
| `watchtower` | Polls registry, updates labeled containers automatically |

Health: `GET /api/health`

### ghcr.io publish

```bash
# Login
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build & push
docker build -t ghcr.io/YOUR_ORG/motionrx-stretch:latest .
docker push ghcr.io/YOUR_ORG/motionrx-stretch:latest
```

Set in `.env`:

```env
GHCR_IMAGE=ghcr.io/YOUR_ORG/motionrx-stretch:latest
```

Watchtower will pull newer tags and recreate the app container.

---

## PWA install

| Platform | How |
|----------|-----|
| Chrome / Edge desktop | Install icon in address bar |
| Android | Browser menu → Install app |
| iOS Safari | Share → Add to Home Screen |

Offline: service worker precaches core routes; localStorage backs journal/sessions when API is offline.

---

## Icon set

Documented in-app on the home page and in `src/data/icons.ts` (logo, home, library, routines, symptoms, pain scale, progress, journal, goals, community, learn, video, reminders, account, offline, favorites, variations, warm-up).

SVG install icons live in `public/icons/`.

---

## Project structure

```
src/app/           # App Router pages + API routes
src/components/    # UI shell, pain scale, cards, PWA
src/data/          # Names, icons, education, stretch library
src/lib/           # Auth, storage, routine engine, types
public/            # PWA manifest, SW, icons
Dockerfile
docker-compose.yml
Build.MD           # Product instructions (source of requirements)
```

---

## Clinical disclaimer

Educational mobility support inspired by outpatient physical therapy principles. **Not a medical device** and not a substitute for evaluation or treatment by a licensed clinician. Stop for sharp pain, progressive neurological symptoms, or red-flag signs and seek appropriate care.

---

## License

Private project — adjust as needed for your organization.
