# MotionRx Stretch — Physical Therapy Stretching Application

**Official brand: MotionRx Stretch** — *Prescribed motion for real life*

Clinically inspired **Progressive Web App** for guided stretching and mobility: symptom-based routines, pain-scale dosing, step-by-step (kid-friendly) instructions, institutional video links, progress tracking, journal, community tips, education, secure login, Docker/Portainer deploy, and Watchtower auto-updates from **[ghcr.io](https://ghcr.io)** (GitHub Container Registry).

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
- **Docker / Portainer / Watchtower / [ghcr.io](https://ghcr.io)**

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

`docker-compose.yml` is **image-only** (no `build:`) so Portainer does not hit:

```text
compose build operation failed: mkdir /.docker: permission denied
```

Deploy conditions (validated for Portainer stacks):

| Condition | How it is satisfied |
|-----------|---------------------|
| No compose `build:` | Image pull only from ghcr.io |
| Registry auth | Portainer registry + `GHCR_IO_USER` / `GHCR_IO_TOKEN` (private package) |
| App readiness | Healthcheck on `GET /api/health` |
| Watchtower start | `depends_on` → `condition: service_healthy` |
| Fresh images on update | `pull_policy: always` |

### Portainer deploy

1. **Registries → Add registry**
   - Name: `ghcr.io`
   - Registry URL: `ghcr.io`
   - Username: GitHub username  
   - Password: PAT with **`read:packages`**  
   - Required while the `motionrx-stretch` package is **private**
2. **Stacks → Add stack → Web editor** → paste `docker-compose.yml`
3. Stack **environment variables** (see `portainer.stack.env.example`):
   - `AUTH_SECRET` — strong secret (`openssl rand -base64 32`)
   - `APP_PORT` — optional, default `3000`
   - `GHCR_IO_USER` / `GHCR_IO_TOKEN` — same as registry (for Watchtower pulls)
4. Deploy (**do not** enable Build, and **do not** use `docker-compose.build.yml`)

If the stack already failed, **Editor** the stack, replace the YAML with the current `docker-compose.yml` (no `build:` block), ensure the registry is configured, then **Update the stack**.

### CLI

```bash
cp .env.example .env   # set AUTH_SECRET (+ GHCR_IO_USER / GHCR_IO_TOKEN if private)
docker compose pull
docker compose up -d
```

Build from source (not for Portainer paste):

```bash
docker compose -f docker-compose.build.yml build
docker compose -f docker-compose.build.yml up -d
```

Services:

| Service | Role |
|---------|------|
| `motionrx` | Next.js app (standalone), port 3000, persistent `/app/data` |
| `watchtower` | Starts after app is healthy; polls registry and updates labeled containers |

Health: `GET /api/health`

### Publish & pull from ghcr.io

Images are published to **ghcr.io** (not a short “GHCR” alias—always use the full host):

```text
ghcr.io/<owner>/<image>:<tag>
```

Example for this repo:

```text
ghcr.io/christopherstainberg-oss/motionrx-stretch:latest
```

```bash
# Login to ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Build & push (image names must be lowercase on ghcr.io)
docker build -t ghcr.io/christopherstainberg-oss/motionrx-stretch:latest .
docker push ghcr.io/christopherstainberg-oss/motionrx-stretch:latest

# Pull & run via Compose
export GHCR_IO_IMAGE=ghcr.io/christopherstainberg-oss/motionrx-stretch:latest
docker compose pull
docker compose up -d
```

Set in `.env` (see `.env.example`):

```env
GHCR_IO_IMAGE=ghcr.io/christopherstainberg-oss/motionrx-stretch:latest
```

CI workflow **Build & Publish (ghcr.io)** pushes `latest` and commit SHA tags on every `main` push. Watchtower polls **ghcr.io** and recreates the app container when a new tag is available.

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
