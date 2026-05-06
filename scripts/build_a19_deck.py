"""Generate the A-19 District IT Chairperson 6-page 16:9 PDF deck.

Page 1 (cover): topic 1 content, 4 logos in header, 4 governor photo
placeholders. Pages 2-6: topics 2-6, each with a 2x3 image gallery.

Run:  python3 scripts/build_a19_deck.py
Output: docs/A19_IT_CHAIRPERSON_DECK.pdf
"""
from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# 16:9 widescreen page
PAGE_W, PAGE_H = 13.333 * inch, 7.5 * inch
LIONS_BLUE = HexColor("#003F87")
LIONS_GOLD = HexColor("#FFC72C")
LIGHT_GREY = HexColor("#F4F6FA")
DARK_GREY = HexColor("#2B2B2B")

OUT = Path(__file__).resolve().parent.parent / "docs" / "A19_IT_CHAIRPERSON_DECK.pdf"

# Four logo labels for the cover page header
COVER_LOGOS = ["LCI", "MD 3232", "DIST 3232F1", "A-19"]

# Four governor photo labels for the cover page
GOVERNORS = [
    ("Int'l President", "Lions International"),
    ("Council Chair", "Multiple District 3232"),
    ("District Governor", "District 3232F1"),
    ("IPDG / VDG", "District 3232F1"),
]

SLIDES = [
    {
        "kind": "cover",
        "page_label": "PAGE 1 · TOPIC 1",
        "title": "Roles & Responsibilities",
        "subtitle": "District Information Technology Chairperson · 3232F1",
        "lead": (
            "Lions International IT Chairperson — Job Duties, "
            "Responsibilities & Benefits. Branding Lionism for impact at "
            "District and Club levels."
        ),
        "bullets": [
            "Digital leader for the District Cabinet & 100+ clubs",
            "Governance: digital policy, data privacy, brand standards",
            "Systems: MyLion · MyLCI · Lion Portal · District website",
            "Club support: onboarding, training, helpdesk for every club",
            "Security: RLS, backups, HMAC webhooks, DPDP Act 2023",
            "Reporting: monthly MMR · dashboards · Annual Activity Report",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 2 · TOPIC 2",
        "title": "Knowledge of Lionism, Website, Portal & LLC",
        "subtitle": "Lion Portal · Website · Lions Learning Center · Digital Ecosystem",
        "bullets": [
            "Lionism — 'We Serve' · 5 Global Causes · 1.4M+ Lions",
            "Lion Portal — SSO, officer reporting, dues, MMR",
            "Website — Next.js, SEO, WCAG 2.1 AA, mobile-first",
            "Lions Learning Center — courses for every officer",
            "MyLion / MyLCI — service activities & membership",
            "Brand: Lions Blue #003F87 · Gold #FFC72C · We Serve voice",
        ],
        "gallery": [
            "Lion Portal", "Lionism", "LLC Course",
            "District Website", "MyLion App", "Brand Kit",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 3 · TOPIC 3",
        "title": "Preparation & Implementation of District IT Goals",
        "subtitle": "Plan · Execute · Monitor",
        "bullets": [
            "Annual IT roadmap aligned to DG's theme",
            "Quarterly milestones with club-level targets",
            "100% MMR compliance across every club",
            "Every club onboarded with website + social presence",
            "Real-time dashboards for the Cabinet",
            "Zero data incidents — security & backups audited",
        ],
        "gallery": [
            "Cabinet Meet", "IT Goals Chart", "Roadmap",
            "Dashboard", "Quarterly Review", "Audit Report",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 4 · TOPIC 4",
        "title": "E-Directory · Website · E-Club House · Multimedia",
        "subtitle": "Club · Zone · Region · District Level",
        "bullets": [
            "E-Directory — searchable, role-aware, mobile-ready",
            "Website — district + 50+ club micro-sites, unified brand",
            "E-Club House — virtual meets, RSVPs, QR check-ins",
            "Multimedia — photo & video archive at every level",
            "Brand-safe templates: posters, certificates, social cards",
            "Self-service publishing: clubs go live in minutes",
        ],
        "gallery": [
            "E-Directory", "Club Website", "E-Club House",
            "Photo Archive", "Video Reel", "Template Pack",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 5 · TOPIC 5",
        "title": "Social Media Promotion at Digital Platforms",
        "subtitle": "Reach · Engagement · Branding of Lionism",
        "bullets": [
            "Platforms: Facebook · Instagram · LinkedIn · YouTube · X",
            "10,000+ combined followers — +180% YoY growth",
            "Weekly campaign: #WeServeWednesday",
            "Reels & shorts for every major activity",
            "Live coverage of District Convention",
            "Bilingual content — English + regional language",
        ],
        "gallery": [
            "Instagram", "Facebook", "LinkedIn",
            "YouTube Reel", "Convention Live", "Hashtag Campaign",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 6 · TOPIC 6",
        "title": "Achievements During the Year",
        "subtitle": "Impact · Growth · Recognition",
        "bullets": [
            "100% MMR compliance for 8 consecutive months",
            "50+ club websites launched under district umbrella",
            "₹50L+ donations processed online — full audit trail",
            "5,000+ service hours digitally logged on MyLion",
            "Recognised at MD 3232 IT Forum",
            "District benefits: transparency · faster comms · trust",
        ],
        "gallery": [
            "Award Moment", "Convention Stage", "Certificate",
            "Metrics Dashboard", "Milestone Post", "Press Feature",
        ],
    },
]


def draw_logo_badge(c: canvas.Canvas, cx: float, cy: float, r: float, label: str) -> None:
    c.setFillColor(LIONS_GOLD)
    c.circle(cx, cy, r, fill=1, stroke=0)
    c.setStrokeColor(LIONS_BLUE)
    c.setLineWidth(1.2)
    c.circle(cx, cy, r, fill=0, stroke=1)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 7 if len(label) > 5 else 8)
    c.drawCentredString(cx, cy - 0.04 * inch, label)


def draw_header(c: canvas.Canvas, logos: list[str]) -> None:
    # Top blue bar
    c.setFillColor(LIONS_BLUE)
    c.rect(0, PAGE_H - 0.7 * inch, PAGE_W, 0.7 * inch, fill=1, stroke=0)
    # Gold accent line
    c.setFillColor(LIONS_GOLD)
    c.rect(0, PAGE_H - 0.78 * inch, PAGE_W, 0.07 * inch, fill=1, stroke=0)

    n = len(logos)
    if n == 2:
        positions = [0.55 * inch, PAGE_W - 0.55 * inch]
    elif n == 4:
        positions = [
            0.55 * inch,
            1.55 * inch,
            PAGE_W - 1.55 * inch,
            PAGE_W - 0.55 * inch,
        ]
    else:
        gap = PAGE_W / (n + 1)
        positions = [(i + 1) * gap for i in range(n)]

    for x, label in zip(positions, logos):
        draw_logo_badge(c, x, PAGE_H - 0.35 * inch, 0.25 * inch, label)

    # Center title strip
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 0.32 * inch, "LIONS INTERNATIONAL · DISTRICT 3232F1")
    c.setFont("Helvetica", 9)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 0.5 * inch, "A-19 District Information Technology Chairperson")


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
    c.drawString(0.3 * inch, 0.14 * inch, "A-19 · District IT Chairperson · 2025–26")


def draw_bullets(c: canvas.Canvas, bullets: list[str], x0: float, y_top: float,
                 max_width: float, line_h: float = 0.22 * inch,
                 bullet_gap: float = 0.42 * inch, font_size: int = 12) -> None:
    by = y_top
    c.setFont("Helvetica", font_size)
    for bullet in bullets:
        c.setFillColor(LIONS_GOLD)
        c.circle(x0 + 0.05 * inch, by + 0.045 * inch, 0.05 * inch, fill=1, stroke=0)
        c.setFillColor(DARK_GREY)
        # rough wrap by char count for the available width
        char_w = font_size * 0.52
        max_chars = max(20, int(max_width / char_w))
        text = bullet
        if len(text) <= max_chars:
            c.drawString(x0 + 0.25 * inch, by, text)
            by -= bullet_gap
        else:
            cut = text.rfind(" ", 0, max_chars)
            if cut == -1:
                cut = max_chars
            c.drawString(x0 + 0.25 * inch, by, text[:cut])
            by -= line_h
            c.drawString(x0 + 0.25 * inch, by, text[cut:].strip())
            by -= bullet_gap


def draw_image_placeholder(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                           label: str, index_label: str | None = None) -> None:
    c.setFillColor(LIGHT_GREY)
    c.setStrokeColor(LIONS_BLUE)
    c.setLineWidth(1.3)
    c.rect(x, y, w, h, fill=1, stroke=1)

    if index_label:
        c.setFillColor(LIONS_GOLD)
        c.rect(x, y + h - 0.20 * inch, 0.7 * inch, 0.20 * inch, fill=1, stroke=0)
        c.setFillColor(LIONS_BLUE)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(x + 0.08 * inch, y + h - 0.14 * inch, index_label)

    # camera glyph
    cx = x + w / 2
    cy = y + h / 2 + 0.05 * inch
    glyph_w = min(1.0 * inch, w * 0.55)
    glyph_h = min(0.55 * inch, h * 0.4)
    c.setStrokeColor(LIONS_BLUE)
    c.setFillColor(white)
    c.setLineWidth(1.4)
    c.rect(cx - glyph_w / 2, cy - glyph_h / 2, glyph_w, glyph_h, fill=1, stroke=1)
    c.circle(cx, cy, min(0.18 * inch, glyph_h * 0.35), fill=0, stroke=1)

    # label band
    c.setFillColor(LIONS_BLUE)
    c.rect(x, y, w, 0.32 * inch, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(cx, y + 0.11 * inch, label)


def draw_cover(c: canvas.Canvas, slide: dict) -> None:
    top = PAGE_H - 1.0 * inch
    bottom = 0.55 * inch

    # Page label badge
    c.setFillColor(LIONS_GOLD)
    c.rect(0.4 * inch, top - 0.1 * inch, 1.6 * inch, 0.28 * inch, fill=1, stroke=0)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(1.2 * inch, top - 0.02 * inch, slide["page_label"])

    # Title
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 30)
    c.drawString(0.4 * inch, top - 0.55 * inch, slide["title"])

    # Subtitle
    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Oblique", 13)
    c.drawString(0.4 * inch, top - 0.85 * inch, slide["subtitle"])

    # Lead paragraph (small box)
    c.setFillColor(LIGHT_GREY)
    c.rect(0.4 * inch, top - 1.7 * inch, PAGE_W - 0.8 * inch, 0.7 * inch, fill=1, stroke=0)
    c.setFillColor(LIONS_GOLD)
    c.rect(0.4 * inch, top - 1.7 * inch, 0.08 * inch, 0.7 * inch, fill=1, stroke=0)
    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica", 11)
    lead = slide["lead"]
    # naive wrap to 2 lines
    words = lead.split()
    half = len(words) // 2
    line1 = " ".join(words[:half])
    line2 = " ".join(words[half:])
    c.drawString(0.6 * inch, top - 1.25 * inch, line1)
    c.drawString(0.6 * inch, top - 1.5 * inch, line2)

    # Bullets — left column
    bullets_top = top - 2.0 * inch
    draw_bullets(
        c,
        slide["bullets"],
        x0=0.45 * inch,
        y_top=bullets_top,
        max_width=PAGE_W * 0.50 - 0.6 * inch,
        font_size=11,
        bullet_gap=0.36 * inch,
    )

    # 4 governor photos — right column, 2x2 grid
    gx0 = PAGE_W * 0.55
    gy_top = top - 1.95 * inch
    gw_total = PAGE_W - gx0 - 0.4 * inch
    gh_total = gy_top - bottom - 0.3 * inch
    cell_pad = 0.15 * inch
    cell_w = (gw_total - cell_pad) / 2
    cell_h = (gh_total - cell_pad) / 2

    # Section heading for governors
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(gx0, gy_top + 0.15 * inch, "Leadership · 2025–26")

    for i, (role, scope) in enumerate(GOVERNORS):
        r = i // 2
        col = i % 2
        x = gx0 + col * (cell_w + cell_pad)
        y = gy_top - (r + 1) * cell_h - r * cell_pad
        draw_image_placeholder(c, x, y, cell_w, cell_h, role, index_label=f"GOV {i + 1}")
        # scope caption below the label band
        c.setFillColor(DARK_GREY)
        c.setFont("Helvetica-Oblique", 8)
        c.drawCentredString(x + cell_w / 2, y - 0.14 * inch, scope)


def draw_content(c: canvas.Canvas, slide: dict) -> None:
    top = PAGE_H - 1.0 * inch
    bottom = 0.55 * inch
    content_w = PAGE_W * 0.40
    gallery_x = PAGE_W * 0.42
    gallery_w = PAGE_W - gallery_x - 0.4 * inch

    # Page label badge
    c.setFillColor(LIONS_GOLD)
    c.rect(0.4 * inch, top - 0.1 * inch, 1.6 * inch, 0.28 * inch, fill=1, stroke=0)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(1.2 * inch, top - 0.02 * inch, slide["page_label"])

    # Title
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(0.4 * inch, top - 0.55 * inch, slide["title"])

    # Subtitle accent
    c.setFillColor(LIONS_GOLD)
    c.rect(0.4 * inch, top - 0.72 * inch, 0.6 * inch, 0.04 * inch, fill=1, stroke=0)
    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Oblique", 11)
    c.drawString(0.4 * inch, top - 0.95 * inch, slide["subtitle"])

    # Bullets
    draw_bullets(
        c,
        slide["bullets"],
        x0=0.45 * inch,
        y_top=top - 1.35 * inch,
        max_width=content_w - 0.4 * inch,
        font_size=11,
        bullet_gap=0.40 * inch,
    )

    # 2x3 gallery
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
        draw_image_placeholder(c, x, y, cell_w, cell_h, label, index_label=f"IMG {i + 1}")


def build() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H))
    c.setTitle("A-19 District IT Chairperson — District 3232F1")
    c.setAuthor("Lions International · District 3232F1")
    c.setSubject("A-19 Awards Submission · 6-page deck")

    total = len(SLIDES)
    for i, slide in enumerate(SLIDES, start=1):
        # background
        c.setFillColor(white)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
        # subtle side band on left for content area
        c.setFillColor(LIGHT_GREY)
        c.rect(0, 0.45 * inch, PAGE_W * 0.41, PAGE_H - 1.25 * inch, fill=1, stroke=0)

        logos = COVER_LOGOS if slide["kind"] == "cover" else ["DIST 3232F1", "LCI"]
        draw_header(c, logos)

        if slide["kind"] == "cover":
            draw_cover(c, slide)
        else:
            draw_content(c, slide)

        draw_footer(c, i, total)
        c.showPage()

    c.save()
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
