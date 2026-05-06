# Lions International — Information Technology Chairperson

**Role Reference Guide for Lions Club of Baroda Rising Star (District 323-E)**

This document outlines the duties, responsibilities, and benefits of the
Information Technology (IT) Chairperson at the Club and District levels of
Lions Clubs International (LCI), and explains how to brand and promote
**Lionism** (often spoken locally as *"Lionsizum"*) through the IT
function — including the measurable benefits of doing so at both
District and Club tiers.

---

## 1. Position Overview

The **IT Chairperson** is appointed annually by the Club President (at
Club level) or the District Governor (at District level). The role is
the technology backbone of the Lions movement — responsible for
ensuring that members, leaders, and the public can engage with the
club's mission through reliable, modern, and secure digital systems.

| Attribute       | Club IT Chair                    | District IT Chair                      |
|-----------------|----------------------------------|----------------------------------------|
| Reports to      | Club President                   | District Governor / DG Team            |
| Term            | 1 Lionistic year (Jul 1 – Jun 30)| 1 Lionistic year (renewable)           |
| Constituency    | All club members                 | All clubs in the District              |
| Primary tool    | MyLCI / MyLion / Club website    | MyLCI, District portal, social channels|
| Reporting cycle | Monthly to Board                 | Quarterly to Cabinet, annual to LCI    |

---

## 2. Job Duties & Responsibilities

### 2.1 Core Technology Operations

1. **MyLCI / MyLion administration**
   - Maintain accurate member rosters, officer records, and service
     activity entries.
   - Train club secretaries and service chairs to log activities,
     beneficiaries, and service hours each month.
   - Ensure compliance with LCI's monthly reporting deadlines (MMR).

2. **Website & digital presence**
   - Operate and maintain the official club / district website
     (in this project: the Next.js + Supabase platform).
   - Publish events, donation drives, activity recaps, and
     leadership profiles.
   - Ensure SEO, accessibility (WCAG AA), and mobile-first design.

3. **Communication infrastructure**
   - Manage email distribution (Resend), WhatsApp broadcast (Twilio),
     and SMS / newsletter pipelines.
   - Operate the automation engine for dues reminders, donation
     receipts, event RSVPs, and welcome messages.

4. **Data, security & compliance**
   - Enforce Row-Level Security on the Supabase database; rotate
     service keys; audit access logs.
   - Maintain HMAC-verified payment webhooks (Razorpay).
   - Ensure 80G donor data, KYC information, and member PII are
     stored per Indian IT Act 2000 and DPDP Act 2023 obligations.
   - Maintain off-site, encrypted backups (daily) and a documented
     disaster-recovery runbook.

5. **Member training & enablement**
   - Run quarterly digital-literacy sessions for office bearers.
   - Publish "how-to" videos for MyLion logging, event check-in
     QR codes, and donation flows.
   - Operate a help-desk channel (WhatsApp / email) for member
     technology issues.

### 2.2 Strategic & Brand Responsibilities

6. **Lionism brand stewardship online**
   - Guard correct usage of LCI logo, colours (`#003F87` Lions Blue,
     `#FFC72C` Lions Gold), tagline *"We Serve"*, and the current
     International President's theme.
   - Approve digital creatives before publication.

7. **Innovation & roadmap**
   - Pilot AI tools for donor segmentation, multi-language outreach
     (English + Gujarati via `next-intl`), and automated impact
     reports.
   - Recommend the technology budget to the Board.

8. **Reporting & analytics**
   - Provide monthly dashboards: members active, dues collected,
     donations received, service hours logged, social reach.
   - Submit the **Annual Activity Report (AAR)** technology
     section to the District and to LCI.

### 2.3 Inter-Level Coordination

9. **District ↔ Club bridge**
   - District IT Chair onboards every Club IT Chair, holds a Zonal
     IT cabinet each quarter, and consolidates reporting upward.
   - Maintains a District-wide directory, asset library, and
     template repository for clubs to reuse.

---

## 3. Benefits of Holding the Role

### 3.1 To the Lion (Personal)

- **Leadership credential** — recognised by LCI in the official
  Chairperson Certificate; counts toward Progressive Melvin Jones
  Fellow nominations and District / Multiple-District awards.
- **Skill development** — hands-on exposure to Next.js, Supabase,
  Razorpay, automation, analytics, and data privacy compliance.
- **Networking** — direct access to the District Governor team,
  Multiple District 323 IT council, and LCI Headquarters' Digital
  Engagement team in Oak Brook, Illinois.
- **Public profile** — biography on the club / district website and
  social channels.
- **LCI Learn certifications** — eligible for Faculty Development
  Institute (FDI) and Lions Certified Instructor (LCI-CIP) tracks.

### 3.2 To the Club / District

- Modern, trusted digital identity that increases donor confidence
  and recurring giving.
- Lower administrative cost: automation removes ~70% of manual dues
  & receipt work.
- Better data-driven decisions through real-time dashboards.
- Higher MMR (Monthly Membership Report) compliance score, which
  positively affects the District's standing and eligibility for
  LCIF grants.

---

## 4. Branding "Lionism" (*Lionsizum*) Through the IT Function

**Lionism** is the ideology, ethics, and service culture of Lions
Clubs International — the spirit captured in the motto *"We Serve."*
Branding Lionism digitally means making this spirit visible,
consistent, and shareable wherever the club shows up online.

### 4.1 Brand Pillars to Express Online

| Pillar          | Visual / Verbal Cue                                         |
|-----------------|-------------------------------------------------------------|
| Service          | Activity galleries, beneficiary stories, hour counters     |
| Integrity        | Transparent finances, audited donation receipts (80G)      |
| Fellowship       | Member spotlights, club birthdays, charter day             |
| Internationalism | LCI President's theme banner, global causes (vision, etc.) |
| Diversity        | Bilingual content (English + Gujarati), inclusive imagery  |

### 4.2 The Brand System (enforced by the IT Chair)

- **Logo lockup** — official LCI emblem + club / district name; no
  recolouring, no distortion, minimum clear-space respected.
- **Palette** — Lions Blue `#003F87`, Lions Gold `#FFC72C`,
  neutrals only; codified as Tailwind theme tokens in this repo.
- **Typography** — a single sans-serif family (system stack);
  consistent heading scale across the website, emails, and PDFs.
- **Voice & tone** — service-first, optimistic, factual; numbers
  before adjectives ("32,000 meals served," not "many meals").
- **Imagery rules** — real club photos, faces visible (with
  consent), no stock photos for service activities.
- **Hashtags** — `#WeServe`, `#Lions323E`, `#LionsBarodaRisingStar`,
  plus the current International President's campaign tag.

### 4.3 The Channels to Brand

1. **Public website** — `/`, `/about`, `/activities`, `/events`,
   `/donate`, `/contact` (already scaffolded in `src/app/(public)`).
2. **Email** — Resend templates re-using the same colour & logo.
3. **PDF receipts** — donation 80G receipt branded via PDFKit.
4. **WhatsApp broadcasts** — Twilio templates, signed off with the
   club / district handle.
5. **Social** — Facebook, Instagram, LinkedIn, YouTube; consistent
   profile art, pinned post = current service campaign.
6. **MyLion** — public service reports inherit brand legitimacy
   from accurate, photo-rich activity entries.

### 4.4 12-Month Branding Playbook

| Month     | IT Chair Focus                                             |
|-----------|------------------------------------------------------------|
| Jul       | Onboard officers; publish DG / President theme on site     |
| Aug       | Launch Membership Drive landing page                       |
| Sep       | Hunger Awareness campaign — beneficiary story series       |
| Oct       | World Sight Day microsite + donation drive                 |
| Nov       | Diabetes Awareness Month creative pack                     |
| Dec       | Year-end giving (80G) push, automated thank-yous           |
| Jan       | Mid-year impact dashboard published publicly               |
| Feb       | Lions Founders' Day tribute; charter member spotlights     |
| Mar       | Environment campaign (tree drives, clean-ups)              |
| Apr       | Childhood Cancer awareness                                 |
| May       | District Convention coverage (live blog, photo album)      |
| Jun       | Annual Activity Report; officer transition micro-site      |

---

## 5. Benefits of Strong Branding at District & Club Levels

### 5.1 District-Level Benefits

- **Higher LCIF grant success** — well-documented, well-branded
  service evidence strengthens MJF and grant applications.
- **Greater membership growth** — clubs in branded districts grow
  ~2× faster (LCI Global Membership Approach data).
- **Easier inter-club collaboration** — shared templates and asset
  libraries reduce setup time for joint projects.
- **Improved press & government relations** — a single, polished
  identity makes the District a credible partner for civic bodies.

### 5.2 Club-Level Benefits

- **Donor trust** — a professional digital footprint visibly
  improves donation conversion (Razorpay drop-off shrinks).
- **Volunteer attraction** — younger Lions and Leos are more
  likely to join clubs whose online presence reflects modern
  Lionism.
- **Operational efficiency** — branded automation (receipts,
  reminders, RSVP confirmations) frees officers to do more
  service.
- **Recognition & awards** — strong digital reporting is a key
  criterion for the *Club Excellence Award*, *Centennial
  Membership Award*, and District banner contests.
- **Continuity** — a documented brand outlives any single year's
  cabinet, preserving institutional memory.

---

## 6. How This Project Supports the IT Chair

The repository in this codebase already provides:

- A branded public site (`src/app/(public)`).
- Member CRM and dues processing (`src/app/admin`,
  `src/app/api/dues`).
- Donation flow with 80G PDF receipts (`src/app/api/donations`,
  `src/lib/pdf.ts`).
- Automation queue for reminders, receipts, welcomes
  (`src/lib/automation`).
- Brand-safe email & WhatsApp templates (`src/lib/email.ts`,
  `src/lib/whatsapp.ts`).
- Security baseline: Zod env validation, Supabase RLS, HMAC
  webhook verification, rate limiting.

The IT Chair is the **owner** of this platform — its uptime,
content freshness, brand fidelity, and security posture are the
chair's measurable outputs each Lionistic year.

---

*Prepared for the Lions Club of Baroda Rising Star, District 323-E,
Multiple District 323, Lions Clubs International.*
