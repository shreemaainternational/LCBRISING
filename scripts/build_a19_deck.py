"""Generate the A-19 District IT Chairperson 6-page 16:9 PDF deck.

Run:  python3 scripts/build_a19_deck.py
Output: docs/A19_IT_CHAIRPERSON_DECK.pdf
"""
from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.pagesizes import landscape
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# 16:9 page (13.33" x 7.5" — standard widescreen slide)
PAGE_W, PAGE_H = 13.333 * inch, 7.5 * inch
LIONS_BLUE = HexColor("#003F87")
LIONS_GOLD = HexColor("#FFC72C")
LIGHT_GREY = HexColor("#F4F6FA")
DARK_GREY = HexColor("#2B2B2B")

OUT = Path(__file__).resolve().parent.parent / "docs" / "A19_IT_CHAIRPERSON_DECK.pdf"

SLIDES = [
    {
        "title": "A-19 District IT Chairperson",
        "subtitle": "Lions International · District 3232F1 · 2025–26",
        "bullets": [
            "District 3232F1 — A-19 Awards Submission",
            "Theme: Digital Lionism — We Serve, We Connect",
            "Driving transparency, reach, and impact through technology",
            "Built for clubs, zones, regions, and the District",
            "Aligned with LCI Global Action Team priorities",
            "We Serve — Powered by Technology",
        ],
        "gallery": [
            "Activity", "Event", "Training",
            "Website Screenshot", "Social Media", "Media Coverage",
        ],
    },
    {
        "title": "Roles, Responsibilities & Knowledge",
        "subtitle": "Governance · Systems · Brand · Compliance",
        "bullets": [
            "Governance: digital policy, data privacy, brand standards",
            "Systems: MyLion · MyLCI · Lion Portal · District website",
            "Knowledge: Lions Learning Center, digital ecosystem",
            "Club support: onboarding, training, helpdesk for all clubs",
            "Security: RLS, backups, HMAC webhooks, DPDP Act 2023",
            "Innovation: AI, automation, multi-language outreach",
        ],
        "gallery": [
            "Activity", "Event", "Training",
            "Website Screenshot", "Social Media", "Media Coverage",
        ],
    },
    {
        "title": "District IT Goals & Digital Development",
        "subtitle": "Plan · Execute · Monitor",
        "bullets": [
            "Annual IT roadmap aligned to DG's theme",
            "Quarterly milestones with club-level targets",
            "E-Directory: searchable, role-aware, mobile-ready",
            "E-Club House: virtual meets, RSVPs, QR check-ins",
            "Multimedia hub: Club · Zone · Region · District",
            "100% MMR compliance across every club",
        ],
        "gallery": [
            "Activity", "Event", "Training",
            "Website Screenshot", "Social Media", "Media Coverage",
        ],
    },
    {
        "title": "Website, Social Media & Branding of Lionism",
        "subtitle": "Identity · Reach · Storytelling",
        "bullets": [
            "District website + 50+ club micro-sites — unified brand",
            "SEO, WCAG 2.1 AA, mobile-first, fast LCP",
            "Platforms: Facebook, Instagram, LinkedIn, YouTube, X",
            "10K+ followers — +180% YoY growth",
            "Brand guardrails: Lions Blue · Gold · We Serve voice",
            "Bilingual content — English + regional language",
        ],
        "gallery": [
            "Activity", "Event", "Training",
            "Website Screenshot", "Social Media", "Media Coverage",
        ],
    },
    {
        "title": "Achievements & Benefits",
        "subtitle": "Impact at District & Club Levels",
        "bullets": [
            "100% MMR compliance for 8 consecutive months",
            "₹50L+ donations processed online — full audit trail",
            "5,000+ service hours digitally logged on MyLion",
            "District: transparency, faster comms, central data",
            "Club: visibility, easy reporting, donor confidence",
            "Recognised at MD 3232 IT Forum",
        ],
        "gallery": [
            "Activity", "Event", "Training",
            "Website Screenshot", "Social Media", "Media Coverage",
        ],
    },
    {
        "title": "Future Vision & Conclusion",
        "subtitle": "We Serve through Technology",
        "bullets": [
            "AI donor insights & impact forecasting",
            "End-to-end automation: dues, receipts, reminders",
            "Mobile-first ecosystem — native member app",
            "Predictive analytics for membership retention",
            "Open data API for inter-district collaboration",
            "Every Lion empowered, every club connected",
        ],
        "gallery": [
            "Activity", "Event", "Training",
            "Website Screenshot", "Social Media", "Media Coverage",
        ],
    },
]


def draw_header(c: canvas.Canvas) -> None:
    # Top blue bar
    c.setFillColor(LIONS_BLUE)
    c.rect(0, PAGE_H - 0.55 * inch, PAGE_W, 0.55 * inch, fill=1, stroke=0)
    # Gold accent line
    c.setFillColor(LIONS_GOLD)
    c.rect(0, PAGE_H - 0.62 * inch, PAGE_W, 0.07 * inch, fill=1, stroke=0)

    # Left: District 3232F1 logo placeholder
    c.setStrokeColor(white)
    c.setFillColor(LIONS_GOLD)
    c.circle(0.5 * inch, PAGE_H - 0.275 * inch, 0.2 * inch, fill=1, stroke=0)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(0.5 * inch, PAGE_H - 0.30 * inch, "3232F1")

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(0.85 * inch, PAGE_H - 0.32 * inch, "DISTRICT 3232F1")

    # Right: Lions International logo placeholder
    c.setFillColor(LIONS_GOLD)
    c.circle(PAGE_W - 0.5 * inch, PAGE_H - 0.275 * inch, 0.2 * inch, fill=1, stroke=0)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(PAGE_W - 0.5 * inch, PAGE_H - 0.30 * inch, "LCI")

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawRightString(PAGE_W - 0.85 * inch, PAGE_H - 0.32 * inch, "LIONS INTERNATIONAL")


def draw_footer(c: canvas.Canvas, page_num: int, total: int) -> None:
    c.setFillColor(LIONS_BLUE)
    c.rect(0, 0, PAGE_W, 0.4 * inch, fill=1, stroke=0)
    c.setFillColor(LIONS_GOLD)
    c.rect(0, 0.4 * inch, PAGE_W, 0.05 * inch, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(PAGE_W / 2, 0.14 * inch, "We Serve — Powered by Technology")
    c.setFont("Helvetica", 9)
    c.drawRightString(PAGE_W - 0.3 * inch, 0.14 * inch, f"{page_num} / {total}")
    c.drawString(0.3 * inch, 0.14 * inch, "A-19 · District IT Chairperson")


def draw_content(c: canvas.Canvas, slide: dict) -> None:
    # Content area: y from 0.55 to PAGE_H - 0.7
    top = PAGE_H - 0.85 * inch
    bottom = 0.55 * inch
    content_w = PAGE_W * 0.40
    gallery_x = PAGE_W * 0.42
    gallery_w = PAGE_W - gallery_x - 0.4 * inch

    # Title
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 24)
    c.drawString(0.4 * inch, top - 0.05 * inch, slide["title"])

    # Subtitle
    c.setFillColor(LIONS_GOLD)
    c.rect(0.4 * inch, top - 0.45 * inch, 0.6 * inch, 0.04 * inch, fill=1, stroke=0)
    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Oblique", 12)
    c.drawString(0.4 * inch, top - 0.7 * inch, slide["subtitle"])

    # Bullets
    c.setFillColor(black)
    c.setFont("Helvetica", 12)
    by = top - 1.1 * inch
    for bullet in slide["bullets"]:
        # bullet marker
        c.setFillColor(LIONS_GOLD)
        c.circle(0.5 * inch, by + 0.04 * inch, 0.05 * inch, fill=1, stroke=0)
        c.setFillColor(DARK_GREY)
        c.setFont("Helvetica", 12)
        # wrap if too long
        text = bullet
        max_chars = 58
        if len(text) > max_chars:
            # split at last space before max
            cut = text.rfind(" ", 0, max_chars)
            if cut == -1:
                cut = max_chars
            line1 = text[:cut]
            line2 = text[cut:].strip()
            c.drawString(0.7 * inch, by, line1)
            by -= 0.22 * inch
            c.drawString(0.7 * inch, by, line2)
        else:
            c.drawString(0.7 * inch, by, text)
        by -= 0.42 * inch

    # Gallery 2x3 (6 images, right 60%)
    gallery_top = top - 0.05 * inch
    gallery_bottom = bottom + 0.1 * inch
    gallery_h = gallery_top - gallery_bottom
    cols, rows = 3, 2
    cell_pad = 0.12 * inch
    cell_w = (gallery_w - cell_pad * (cols - 1)) / cols
    cell_h = (gallery_h - cell_pad * (rows - 1)) / rows

    for i, label in enumerate(slide["gallery"]):
        r = i // cols
        col = i % cols
        x = gallery_x + col * (cell_w + cell_pad)
        y = gallery_top - (r + 1) * cell_h - r * cell_pad

        # frame
        c.setFillColor(LIGHT_GREY)
        c.setStrokeColor(LIONS_BLUE)
        c.setLineWidth(1.2)
        c.rect(x, y, cell_w, cell_h, fill=1, stroke=1)

        # gold corner accent
        c.setFillColor(LIONS_GOLD)
        c.rect(x, y + cell_h - 0.18 * inch, 0.6 * inch, 0.18 * inch, fill=1, stroke=0)
        c.setFillColor(LIONS_BLUE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 0.08 * inch, y + cell_h - 0.13 * inch, f"IMG {i + 1}")

        # placeholder icon (camera-like rectangle)
        cx = x + cell_w / 2
        cy = y + cell_h / 2 + 0.05 * inch
        c.setStrokeColor(LIONS_BLUE)
        c.setFillColor(white)
        c.setLineWidth(1.5)
        c.rect(cx - 0.5 * inch, cy - 0.3 * inch, 1.0 * inch, 0.55 * inch, fill=1, stroke=1)
        c.circle(cx, cy - 0.02 * inch, 0.18 * inch, fill=0, stroke=1)

        # label
        c.setFillColor(DARK_GREY)
        c.setFont("Helvetica-Bold", 10)
        c.drawCentredString(cx, y + 0.18 * inch, label)


def build() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H))
    c.setTitle("A-19 District IT Chairperson — District 3232F1")
    c.setAuthor("Lions International · District 3232F1")
    c.setSubject("A-19 Awards Submission")

    total = len(SLIDES)
    for i, slide in enumerate(SLIDES, start=1):
        # background
        c.setFillColor(white)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # subtle side band
        c.setFillColor(LIGHT_GREY)
        c.rect(0, 0.45 * inch, PAGE_W * 0.41, PAGE_H - 1.05 * inch, fill=1, stroke=0)

        draw_header(c)
        draw_content(c, slide)
        draw_footer(c, i, total)
        c.showPage()

    c.save()
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
