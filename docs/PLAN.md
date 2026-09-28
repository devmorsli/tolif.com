# Tolif — Architecture Plan & Phased Task List

> **Status:** Decisions locked — awaiting approval to begin Phase 1.

---

## 1. Repository Structure

```
tolif.com/
├── apps/
│   ├── web/                        # Next.js 15 (App Router, TypeScript)
│   └── api/                        # ASP.NET Core Web API (.NET 9 LTS)
│       ├── Tolif.Domain/           # Entities, value objects, domain events
│       ├── Tolif.Application/      # Use cases, interfaces, DTOs, validators
│       ├── Tolif.Infrastructure/   # EF Core, S3, AI providers, email, print
│       └── Tolif.API/              # Controllers, middleware, Hangfire, health
├── docker/
│   ├── caddy/                      # Caddyfile reverse proxy
│   └── minio/                      # MinIO init script
├── docs/
│   └── PLAN.md                     # This file
├── .env.example
├── docker-compose.yml
├── docker-compose.prod.yml
└── README.md
```

---

## 2. Architecture Overview

### Frontend (`apps/web`)
- **Next.js 15**, App Router, TypeScript, React 19
- **Tailwind CSS v4** + **shadcn/ui** (Radix primitives) for components
- **Motion (Framer Motion v11)** for all animations
- **Lucide** icons
- **Zustand** for client state (wizard, cart)
- **TanStack Query** for server state / polling
- **next-intl** for i18n (EN default, extensible)
- SSR/SSG for all public pages; dynamic segments pre-rendered at build for SEO
- `next-sitemap` for auto sitemap, JSON-LD injected per page

### Backend (`apps/api`)
- **ASP.NET Core Web API (.NET 9)**
- **Clean Architecture**: Domain → Application → Infrastructure → API
- **Entity Framework Core 9** + Npgsql, code-first migrations
- **Hangfire** (PostgreSQL storage) for all async jobs
- **MediatR** (CQRS) for commands/queries
- **FluentValidation** for all input
- **Serilog** → stdout (JSON) + optional Seq sink
- **ASP.NET Core Identity** for admin auth; JWT + HttpOnly refresh cookie
- **ASP.NET Core Data Protection** for encrypting secrets at rest
- Health checks: `/health/live`, `/health/ready`

### Data Storage
- **PostgreSQL 16** — primary data store
- **MinIO** (local) / **Cloudflare R2 or AWS S3** (production) — all file uploads, generated images, print files
- Files always accessed via signed, expiring URLs (never public direct links)

### AI Image Generation
```
IImageGenerationProvider
  ├── GeminiImageProvider      (default — Google AI Studio key or Vertex AI)
  ├── FalAiImageProvider       (fallback #1)
  └── OpenAiImageProvider      (fallback #2)
```
- Provider chain configured per-template (optional) or globally via Settings
- Automatic retry/fallback with provider logged per generation
- AI cost tracked per generation in `AiGenerationLogs` table

### Print-on-Demand
```
IPrintProvider
  ├── PrintfulProvider
  └── PrintifyProvider
```
- Product/variant mapping stored in DB, editable in admin
- Webhook handlers for status/tracking updates (idempotent, signature-verified)

### Background Jobs (Hangfire)
| Job | Trigger |
|-----|---------|
| GeneratePreviewJob | On upload completion |
| GenerateHighResJob | On payment confirmation |
| SubmitPrintOrderJob | On high-res ready |
| SendOrderEmailJob | On order state change |
| DeleteExpiredPhotosJob | Nightly scheduled |
| CleanupOrphanedUploadsJob | Nightly scheduled |

---

## 3. Database Schema (key tables)

```
Templates          — id, slug, name, category, template_image_key, prompt,
                     upload_slots (jsonb), ai_provider_override?, active, sort_order,
                     seo_title, seo_description, og_image_key

Orders             — id, customer_email, status (enum), stripe_payment_intent_id,
                     stripe_session_id, total_amount, currency, discount_code_id?,
                     shipping_address (jsonb), created_at

OrderItems         — id, order_id, product_variant_id, quantity, unit_price,
                     portrait_session_id

PortraitSessions   — id, order_item_id?, template_id, status (enum), preview_count,
                     upload_slots (jsonb → { slot_name: s3_key }), watermarked_key?,
                     final_key?, created_at

AiGenerationLogs   — id, portrait_session_id, provider, model, prompt, status,
                     cost_usd, duration_ms, created_at

Products           — id, name, type (digital|poster|framed|canvas), active
ProductVariants    — id, product_id, size, price, currency, printful_variant_id?,
                     printify_variant_id?

PrintOrders        — id, order_id, provider, provider_order_id, status, tracking_url,
                     submitted_at

DiscountCodes      — id, code, stripe_coupon_id, type (percent|fixed), value,
                     max_uses, uses, expires_at, active

Customers          — id, email, name, stripe_customer_id, created_at, gdpr_deleted_at?
AdminUsers         — ASP.NET Identity tables (AdminUser extends IdentityUser)

Settings           — id, key, value (encrypted), updated_at
AnalyticsEvents    — id, event_type, session_id, data (jsonb), created_at
```

---

## 4. Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo vs split repos | Monorepo | Easier local dev, single docker-compose |
| Admin auth | ASP.NET Identity + cookie | Simpler than JWT for admin SPA, works with 2FA |
| Customer auth | None (session/token per order) | No account required → lower friction |
| Checkout | Stripe Checkout hosted | PCI compliance handled by Stripe |
| AI cost tracking | Per-generation log row | Enables per-provider ROI in analytics |
| Secrets encryption | ASP.NET Data Protection | Built-in, no extra infra |
| File URLs | Signed S3 pre-signed URLs (15 min) | Never expose raw S3 paths |
| Print file upload | After payment, before print submit | Avoid wasted uploads on unpaid orders |
| Preview watermark | Server-side via ImageSharp | Clean image never reaches browser |
| Abuse protection | Cloudflare Turnstile + IP rate limit | Low cost, no CAPTCHA UX friction |
| i18n default | EN; auto-detect locale from IP (next-intl + IP geolocation) | Admin can add languages; customers can override in UI |
| Currency | Auto-detect from IP (ipapi.co or similar), customer can switch | Admin manages supported currencies; prices stored per currency in DB |
| Regeneration limit | 5 "Try again" per session, default; ON/OFF + count editable in admin | Prevents AI cost overruns while being generous |
| Photo retention | 30 days (paid orders); 7 days (abandoned); both configurable in admin | GDPR + cost balance |
| Deployment | Digital Ocean VPS (Docker + Caddy ACME TLS) | Single droplet for start, scale to managed DB/spaces later |
| Print provider default | Printful primary, Printify fallback | Printful has wider product range; can be swapped in admin |

---

## 5. Phased Task List

### Phase 1 — Foundation (repo, Docker, DB schema, seed)
- [ ] Init monorepo structure, `.gitignore`, `.env.example`
- [ ] `docker-compose.yml`: `postgres`, `minio`, `api`, `web`, `caddy`
- [ ] ASP.NET Core solution: Domain / Application / Infrastructure / API projects
- [ ] EF Core DbContext, all entities, initial migration, seed (6 templates, products, admin user)
- [ ] MinIO bucket init script; S3 interface + MinIO implementation
- [ ] Health check endpoints
- [ ] Next.js app scaffolding (TypeScript, Tailwind, shadcn init)
- [ ] Confirm everything runs: `docker compose up`

### Phase 2 — API core (uploads, AI generation, watermark)
- [ ] Template CRUD API + upload slots model
- [ ] Secure signed upload endpoint (presigned S3 PUT)
- [ ] `PortraitSession` creation flow
- [ ] `IImageGenerationProvider` interface + Gemini implementation (REST, Vertex AI support)
- [ ] fal.ai implementation (FLUX / Seedream)
- [ ] OpenAI gpt-image implementation
- [ ] Provider fallback chain logic + cost logging
- [ ] Hangfire: `GeneratePreviewJob` (low-res, watermark via ImageSharp)
- [ ] SSE or polling endpoint for job status
- [ ] Preview rate limiting per IP/session
- [ ] Per-template provider override support
- [ ] Safety-filter refusal handling

### Phase 3 — Public frontend (design system, home, catalog, SEO)
- [ ] Design system: fonts, colors (light/dark tokens), motion presets
- [ ] Layout: header (nav, cart icon), footer
- [ ] Home page: animated hero, how-it-works, best-selling templates, reviews, FAQ, trust badges
- [ ] Template catalog (`/portraits`) with filter + sort + hover animations
- [ ] Template product page (`/portraits/[slug]`): SSG, JSON-LD, Open Graph
- [ ] Legal pages (privacy, terms, refund)
- [ ] Cookie consent banner (GDPR)
- [ ] `next-sitemap` config

### Phase 4 — Creation wizard
- [ ] Wizard state machine (Zustand) + URL-based step routing
- [ ] Step 1: template selector (pre-select from product page)
- [ ] Step 2: photo upload (drag-and-drop, mobile camera, compression, GDPR checkbox)
- [ ] Step 3: generation loading screen (paw animation, fun messages, SSE/poll)
- [ ] Step 4: watermarked preview, variation selector, "Try again" (limited)
- [ ] Step 5: product & size selector with live wall mockup
- [ ] Animated step transitions (Motion layout animations)

### Phase 5 — Checkout, payments, orders, emails
- [ ] Stripe Checkout session creation API (digital + physical, discount codes)
- [ ] Stripe webhook handler (idempotent, signature-verified): `payment_intent.succeeded`, `checkout.session.completed`
- [ ] Order state machine: `pending → paid → generating_hires → ready → shipped`
- [ ] Hangfire: `GenerateHighResJob`, `SendOrderEmailJob`
- [ ] Secure expiring download link (HMAC-signed, 48 h default, configurable)
- [ ] Order status page (`/orders/[token]`)
- [ ] Transactional emails (confirmation, ready, shipped) via SMTP or Resend
- [ ] Discount code validation endpoint (synced with Stripe)

### Phase 6 — Print-on-demand
- [ ] `IPrintProvider` interface + Printful implementation
- [ ] Printify implementation
- [ ] Admin: product/variant mapping UI
- [ ] Hangfire: `SubmitPrintOrderJob` (upload file, create order)
- [ ] Webhook handlers: Printful + Printify (status, tracking)
- [ ] "Retry submission" admin action
- [ ] Provider switching in Settings

### Phase 7 — Admin panel
- [ ] ASP.NET Identity setup (AdminUser, roles: Admin / Staff, optional TOTP 2FA)
- [ ] Next.js `/admin` layout (separate auth context, sidebar nav, Recharts)
- [ ] Dashboard: revenue cards, charts, conversion funnel
- [ ] Orders list + detail + actions (refund, resend email, regenerate, resubmit, notes)
- [ ] Templates CRUD + test-generation button
- [ ] Products & pricing management
- [ ] Customers list + GDPR export/delete
- [ ] Discount codes management
- [ ] Settings page — all sections encrypted, secrets masked, each with "Test connection":
  - AI: Gemini key/Vertex config, fal.ai key, OpenAI key, active provider, fallback order, model names, preview regen limit (count + enabled toggle)
  - Print: active provider, Printful/Printify keys, store IDs, webhook secrets
  - Stripe: keys, webhook secret, test/live toggle
  - Store: name, logo, default & supported currencies, shipping countries
  - GDPR: photo retention days (paid), photo retention days (abandoned)
  - Email: SMTP/Resend config, from address
  - Localisation: default language, supported languages, IP geolocation API key

### Phase 8 — Analytics & event tracking
- [ ] `AnalyticsEvents` write path (API endpoint + Next.js client helper)
- [ ] Funnel events: `page_view`, `template_viewed`, `upload_started`, `preview_generated`, `checkout_started`, `order_paid`
- [ ] Admin analytics dashboard: revenue over time, best templates, AI cost vs revenue per provider
- [ ] Optional GA4 / Meta Pixel script injection (configurable IDs in Settings)

### Phase 9 — Hardening, tests, README, production config
- [ ] Hangfire: `DeleteExpiredPhotosJob` (GDPR, configurable retention days)
- [ ] xUnit tests: pricing, order state machine, AI fallback logic, provider adapters (mocked HTTP)
- [ ] Playwright E2E: home → catalog → wizard → (mock Stripe) → order page
- [ ] Security: CORS, security headers (CSP, HSTS), input validation review, webhook sig verification audit
- [ ] Rate limiting (ASP.NET Core middleware), Cloudflare Turnstile integration
- [ ] Structured logging review (no PII in logs)
- [ ] `docker-compose.prod.yml` (resource limits, no MinIO → R2/S3, Caddy ACME TLS)
- [ ] `.env.example` complete with all vars + README setup guide
- [ ] README: setup, all API key acquisition steps (Gemini/Vertex, fal.ai, OpenAI, Stripe, Printful, Printify), deploy guide

---

## 6. Confirmed Decisions

| # | Topic | Decision |
|---|-------|----------|
| 1 | Deployment | Digital Ocean VPS — Docker Compose + Caddy ACME TLS |
| 2 | Print provider | Printful primary, Printify fallback; switchable in admin |
| 3 | Currency | Auto-detect from customer IP; customer can change manually; admin manages available currencies |
| 4 | Customer accounts | No login — orders tracked by email + signed token |
| 5 | Regeneration limit | **5 per session** default; admin can change the number or disable the limit entirely |
| 6 | Photo retention | **30 days** for paid orders, **7 days** for abandoned sessions; both configurable in admin |
| 7 | Languages | English default; auto-detect locale from customer IP; admin can enable additional languages; customers can override |
| 8 | AI provider | **Gemini primary** (Google AI Studio key); fal.ai and OpenAI as fallback; all keys and model names editable in admin |

## 7. Settings Managed in Admin Panel

All of the following are stored encrypted in `Settings` table (never only in env files):

- **AI:** Gemini API key / Vertex AI config, fal.ai key, OpenAI key; active provider; fallback order; model names per provider; preview regeneration limit (count + enabled toggle)
- **Print:** active provider (Printful/Printify); API keys; store IDs; webhook secrets; product/variant mappings
- **Stripe:** publishable key, secret key, webhook secret; test/live mode toggle
- **Store:** name, logo, default currency, supported currencies list, shipping countries
- **GDPR:** photo retention days (paid orders), photo retention days (abandoned sessions)
- **Email:** provider (SMTP / Resend), connection details, from name/address
- **Localisation:** default language; supported languages list; IP geolocation API key (for auto-detect)
