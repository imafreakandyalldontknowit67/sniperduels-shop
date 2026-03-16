# SEO Strategy: sniperduels.shop

**Business Type:** Niche e-commerce (Roblox game item marketplace)
**Target Audience:** Roblox Sniper Duels players, ages 13-25
**Domain:** sniperduels.shop (new domain, no authority)
**Date:** 2026-03-16

---

## Current State Assessment

| Metric | Score | Target (6mo) |
|--------|-------|---------------|
| Content Quality | 42/100 | 75/100 |
| E-E-A-T | 33/100 | 65/100 |
| AI Citation Readiness | 18/100 | 60/100 |
| Trust Signals | 35/100 | 70/100 |
| Keyword Optimization | 25/100 | 70/100 |
| Technical SEO | 40/100 | 85/100 |
| Schema Coverage | 0/100 | 80/100 |

### Critical Issues
1. **Zero structured data** — no JSON-LD, no schema markup anywhere
2. **No sitemap.xml** — Google can't discover pages efficiently
3. **No robots.txt** — no crawl guidance
4. **Critically thin content** — homepage has ~80 words (should be 500+)
5. **Meta title is just "sniperduels.shop"** — misses all keyword opportunities
6. **H1 doesn't contain "Sniper Duels"** — the most important keyword is absent from the most important heading
7. **No About page** — operator "Sleuth" is unverifiable
8. **TrustSection component exists but isn't rendered** on homepage
9. **No individual product pages** — items only in a grid
10. **No blog/content hub** — zero informational content

---

## Competitive Landscape

**Direct competitors** (Roblox item trading):
- rolimons.com — item values, trading, large authority
- rblx.trade — trade ads, item database
- bloxflip.com — Roblox gambling/trading
- rbxflip.com — similar
- Various Discord-based sellers (no SEO presence)

**Keyword opportunity:** "Sniper Duels" is a niche game — there's almost zero competition for game-specific keywords. This is a massive advantage. We can rank #1 for virtually any "Sniper Duels" query with proper optimization.

**Target keywords:**
| Keyword | Est. Difficulty | Priority |
|---------|----------------|----------|
| sniper duels shop | Very Low | P0 |
| buy sniper duels items | Very Low | P0 |
| sniper duels gems | Very Low | P0 |
| sniper duels item values | Very Low | P1 |
| sniper duels rarity guide | Very Low | P1 |
| sniper duels crates | Very Low | P1 |
| sniper duels auto shop | Very Low | P0 |
| sniper duels marketplace | Low | P1 |
| roblox sniper duels trading | Low | P2 |

---

## Implementation Roadmap

### Phase 1 — Foundation (Week 1-2) — IMMEDIATE

#### 1.1 Technical Fixes
- [ ] Add `robots.txt` to `public/` directory
- [ ] Add `sitemap.xml` (or generate via Next.js metadata API)
- [ ] Add JSON-LD schema to all pages (Organization, WebSite, FAQPage, Product, BreadcrumbList)
- [ ] Fix meta title: "Sniper Duels Auto Shop — Buy Gems, Items & Crates | Automatic Delivery"
- [ ] Add unique meta titles per page (`/shop`, `/gems`, `/faq`)
- [ ] Fix homepage H1 to include "Sniper Duels"
- [ ] Add canonical URLs to all pages
- [ ] Add the TrustSection component to homepage (it exists but isn't rendered)

#### 1.2 Content Additions
- [ ] Create `/about` page — who runs this, how long operating, community presence, Discord member count
- [ ] Expand homepage text content to 400+ words
- [ ] Add 200-300 words of intro content on `/shop` page
- [ ] Add 150-200 words on `/gems` page explaining what gems do
- [ ] Expand FAQ to 20+ questions

#### 1.3 Schema Implementation
- Global: `Organization` + `WebSite` in `layout.tsx`
- `/faq`: `FAQPage` schema
- `/gems`: `Product` with `AggregateOffer`
- `/shop`: Dynamic `Product` schemas per item
- All pages: `BreadcrumbList`

### Phase 2 — Content Expansion (Week 3-6)

#### 2.1 New Pages
- [ ] `/guide/item-values` — Sniper Duels item value guide (rarity tiers, price ranges)
- [ ] `/guide/rarities` — Rarity system explained (Collectible, Secret, Epic, Legendary, etc.)
- [ ] `/guide/getting-started` — New player buying guide
- [ ] `/contact` — Proper contact page with Discord + email

#### 2.2 Blog Launch
- [ ] `/blog` — News and updates section
- [ ] "New Stock Alert" post template
- [ ] "Game Update Impact on Item Values" post template
- [ ] "How Our Automated Delivery Works" — with screenshots/video of the bot trade process

#### 2.3 Trust Building
- [ ] Add customer testimonials (from Discord)
- [ ] Add "items delivered" counter to homepage
- [ ] Add delivery time stats ("average delivery: 47 seconds")
- [ ] Add payment processor logos/badges

### Phase 3 — Scale (Week 7-12)

#### 3.1 Individual Product Pages
- [ ] `/shop/[slug]` — Individual pages for each item
- [ ] Each with: description, rarity info, FX/Fragtrak details, price history, related items
- [ ] Full `Product` schema per page

#### 3.2 Advanced Content
- [ ] Rarity tier comparison pages
- [ ] "Is Sniper Duels Auto Shop legit?" — preemptive trust content
- [ ] Video content: delivery demo, unboxing crates
- [ ] Discord community highlights

#### 3.3 Link Building
- [ ] Submit to Roblox game directories
- [ ] Get listed on Roblox trading communities
- [ ] Reddit /r/roblox, /r/RobloxTrading engagement
- [ ] YouTube Sniper Duels content creators outreach

### Phase 4 — Authority (Month 4-6)

#### 4.1 GEO (Generative Engine Optimization)
- [ ] Optimize all content for AI citation (quotable facts, specific numbers)
- [ ] Add `llms.txt` for AI crawler guidance
- [ ] Ensure all key claims have supporting data
- [ ] Structure content in Q&A format where possible

#### 4.2 Advanced Schema
- [ ] `Review` and `AggregateRating` once reviews exist
- [ ] `VideoObject` for delivery demo videos
- [ ] `HowTo` removal (deprecated by Google) — ensure not accidentally added

---

## Site Architecture (Target)

```
sniperduels.shop/
├── / (homepage)
├── /shop (item listing)
│   └── /shop/[slug] (individual items — Phase 3)
├── /gems (gem shop)
├── /faq (FAQ — with FAQPage schema)
├── /about (NEW — Phase 1)
├── /contact (NEW — Phase 2)
├── /guide/
│   ├── /guide/item-values (NEW — Phase 2)
│   ├── /guide/rarities (NEW — Phase 2)
│   └── /guide/getting-started (NEW — Phase 2)
├── /blog/ (NEW — Phase 2)
│   └── /blog/[slug] (individual posts)
├── /privacy
├── /terms
├── /refunds
├── /dashboard/ (authenticated, noindex)
└── /admin/ (authenticated, noindex)
```

---

## Meta Title Strategy

| Page | Current | Recommended |
|------|---------|-------------|
| Home | sniperduels.shop | Sniper Duels Auto Shop — Buy Gems, Items & Crates \| Automatic Delivery |
| Shop | sniperduels.shop | Buy Sniper Duels Items — Snipers, Knives & Crates \| sniperduels.shop |
| Gems | sniperduels.shop | Buy Sniper Duels Gems — Bulk Pricing from $2.65/k \| sniperduels.shop |
| FAQ | sniperduels.shop | FAQ — Sniper Duels Auto Shop \| How It Works, Payments & Delivery |
| About | (doesn't exist) | About Sniper Duels Auto Shop — Trusted Automated Delivery Since 2026 |

---

## KPI Targets

| Metric | Now | 3 Month | 6 Month | 12 Month |
|--------|-----|---------|---------|----------|
| Organic Traffic | 0 | 200/mo | 1,000/mo | 5,000/mo |
| Indexed Pages | ~7 | 15 | 30+ | 50+ |
| #1 Rankings | 0 | 5 | 15 | 25+ |
| Schema Types | 0 | 5 | 7 | 8+ |
| Content Pages | 7 | 12 | 20 | 35+ |
| Backlinks | 0 | 5 | 15 | 30+ |
| Core Web Vitals | Unknown | All Green | All Green | All Green |

---

## Quick Wins (Can Do Today)

1. Add `robots.txt` and `sitemap.xml`
2. Fix meta title
3. Fix H1 to include "Sniper Duels"
4. Add JSON-LD schema (Organization, WebSite, FAQPage, Product, Breadcrumbs)
5. Render the existing TrustSection on homepage
6. Add unique page titles for /shop, /gems, /faq
7. Add canonical URLs
8. Submit to Google Search Console
