"""Generate the A-19 District IT Chairperson 6-page A4 PORTRAIT PDF deck.

Premium layout: full-page themed background with blue overlay & gradient,
4 centred logos + gold divider header, glass-effect content panel,
bottom image strip. Page 1 carries 4 governor photos in a horizontal
row plus a centred IT Chairperson photo.

Run:  python3 scripts/build_a19_deck.py
Output: docs/A19_IT_CHAIRPERSON_DECK.pdf
"""
from __future__ import annotations

import math
from pathlib import Path

from reportlab.lib.colors import HexColor, white, black, Color
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

# A4 portrait
PAGE_W, PAGE_H = 8.27 * inch, 11.69 * inch

LIONS_BLUE = HexColor("#003F87")
LIONS_BLUE_DARK = HexColor("#011E47")
LIONS_GOLD = HexColor("#FFC72C")
LIGHT_GREY = HexColor("#F4F6FA")
DARK_GREY = HexColor("#2B2B2B")

OUT = Path(__file__).resolve().parent.parent / "docs" / "A19_IT_CHAIRPERSON_DECK.pdf"

HEADER_LOGOS = [
    "LIONS\nINT'L",
    "MULTIPLE\nDISTRICT 3232",
    "LCIF\nFOUNDATION",
    "DISTRICT\n3232F1",
]

GOVERNORS = [
    ("Int'l President", "Lions International"),
    ("Council Chair", "Multiple District 3232"),
    ("District Governor", "District 3232F1"),
    ("IPDG / VDG", "District 3232F1"),
]

PAGES = [
    {
        "kind": "cover",
        "page_label": "PAGE 1 · TOPIC 1",
        "title": "Knowledge of Roles & Responsibilities",
        "subtitle": "District Information Technology Chairperson",
        "background_theme": "service",
        "bullets": [
            "District IT strategy & execution",
            "Website & digital platform management",
            "Lion Portal reporting & database",
            "Club IT training & support",
            "Digital leadership & innovation",
            "Communication & coordination",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 2 · TOPIC 2",
        "title": "Knowledge of Lionism, Website, Portal & LLC",
        "subtitle": "Lionism · Website · Lion Portal · Lions Learning Center",
        "background_theme": "learning",
        "bullets": [
            "Lionism mission & structure",
            "Website management",
            "Lion Portal usage",
            "Member data & reporting",
            "Lions Learning Center training",
            "Digital ecosystem understanding",
        ],
        "strip": [
            "Lion Portal", "LLC Course", "District Website",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 3 · TOPIC 3",
        "title": "Preparation & Implementation of District IT Goals",
        "subtitle": "Plan · Execute · Monitor",
        "background_theme": "strategy",
        "bullets": [
            "IT roadmap & vision",
            "Planning & execution",
            "Monitoring & reporting",
            "Standardization",
            "Performance tracking",
            "Continuous improvement",
        ],
        "strip": [
            "Cabinet Meet", "IT Roadmap", "Dashboard",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 4 · TOPIC 4",
        "title": "Efforts to Promote & Develop Digital Platforms",
        "subtitle": "E-Directory · Website · E-Club House · Multimedia",
        "background_theme": "digital",
        "bullets": [
            "E-Directory system",
            "Website development",
            "E-Club House",
            "Multimedia content",
            "Club to District integration",
            "Technology adoption",
        ],
        "strip": [
            "E-Directory", "E-Club House", "Multimedia Reel",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 5 · TOPIC 5",
        "title": "Social Media Promotion at Digital Platforms",
        "subtitle": "Reach · Engagement · Branding of Lionism",
        "background_theme": "social",
        "bullets": [
            "Facebook · Instagram · YouTube",
            "Campaign strategy",
            "Engagement growth",
            "Branding consistency",
            "Event promotions",
            "Content system",
        ],
        "strip": [
            "Instagram Grid", "YouTube Reel", "Convention Live",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 6 · TOPIC 6",
        "title": "Achievements During the Year",
        "subtitle": "Impact · Growth · Recognition",
        "background_theme": "achievement",
        "bullets": [
            "Digital growth metrics",
            "Website & portal performance",
            "Social media reach",
            "IT initiatives success",
            "Recognition & awards",
            "District & club impact",
        ],
        "strip": [
            "Award Moment", "Metrics Dashboard", "Press Feature",
        ],
    },
]


# ---------- BACKGROUND ----------

THEME_TINTS = {
    "service":     [HexColor("#0B3D7A"), HexColor("#0E5BAA"), HexColor("#FFC72C")],
    "learning":    [HexColor("#0A2F66"), HexColor("#1E5FA8"), HexColor("#7FB3E6")],
    "strategy":    [HexColor("#102A52"), HexColor("#244F8C"), HexColor("#FFC72C")],
    "digital":     [HexColor("#062B59"), HexColor("#0F4F9E"), HexColor("#7DB7F2")],
    "social":      [HexColor("#0E2D63"), HexColor("#2B6BB8"), HexColor("#FF8A3D")],
    "achievement": [HexColor("#0A1F4A"), HexColor("#1E4FA0"), HexColor("#FFC72C")],
}


def draw_background(c: canvas.Canvas, theme: str) -> None:
    tints = THEME_TINTS.get(theme, THEME_TINTS["service"])

    # Base flood
    c.setFillColor(tints[0])
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    # "Blurred" themed bands — soft horizontal gradient stripes
    n_bands = 60
    for i in range(n_bands):
        t = i / (n_bands - 1)
        # interpolate base -> mid colour
        r = tints[0].red * (1 - t) + tints[1].red * t
        g = tints[0].green * (1 - t) + tints[1].green * t
        b = tints[0].blue * (1 - t) + tints[1].blue * t
        c.setFillColorRGB(r, g, b)
        y = PAGE_H * t
        c.rect(0, y, PAGE_W, PAGE_H / n_bands + 1, fill=1, stroke=0)

    # Soft accent blobs (faux blurred shapes) — drawn with low alpha
    c.saveState()
    try:
        c.setFillAlpha(0.18)
    except AttributeError:
        pass
    c.setFillColor(tints[2])
    for cx, cy, rad in [
        (PAGE_W * 0.15, PAGE_H * 0.78, 2.3 * inch),
        (PAGE_W * 0.85, PAGE_H * 0.30, 2.0 * inch),
        (PAGE_W * 0.50, PAGE_H * 0.05, 3.0 * inch),
    ]:
        c.circle(cx, cy, rad, fill=1, stroke=0)
    c.restoreState()

    # Dark navy overlay for readability
    c.saveState()
    try:
        c.setFillAlpha(0.55)
    except AttributeError:
        pass
    c.setFillColor(LIONS_BLUE_DARK)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    c.restoreState()

    # Bottom soft gradient (dark to darker) for footer separation
    c.saveState()
    try:
        c.setFillAlpha(0.35)
    except AttributeError:
        pass
    c.setFillColor(black)
    for i in range(40):
        a = 0.025 * (40 - i) / 40
        try:
            c.setFillAlpha(a)
        except AttributeError:
            pass
        c.rect(0, i * 0.04 * inch, PAGE_W, 0.05 * inch, fill=1, stroke=0)
    c.restoreState()


# ---------- HEADER ----------

def draw_logo(c: canvas.Canvas, cx: float, cy: float, r: float, label: str) -> None:
    # outer ring
    c.setFillColor(white)
    c.circle(cx, cy, r, fill=1, stroke=0)
    c.setStrokeColor(LIONS_GOLD)
    c.setLineWidth(2)
    c.circle(cx, cy, r, fill=0, stroke=1)
    # inner gold
    c.setFillColor(LIONS_GOLD)
    c.circle(cx, cy, r * 0.7, fill=1, stroke=0)
    # text
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 6)
    lines = label.split("\n")
    if len(lines) == 1:
        c.drawCentredString(cx, cy - 0.04 * inch, lines[0])
    else:
        c.drawCentredString(cx, cy + 0.05 * inch, lines[0])
        c.drawCentredString(cx, cy - 0.07 * inch, lines[1])


def draw_header(c: canvas.Canvas) -> None:
    # transparent strip — only the gold divider visible
    n = len(HEADER_LOGOS)
    y = PAGE_H - 0.85 * inch
    spacing = PAGE_W / (n + 1)
    for i, label in enumerate(HEADER_LOGOS):
        cx = spacing * (i + 1)
        draw_logo(c, cx, y, 0.35 * inch, label)

    # Gold divider line
    c.setFillColor(LIONS_GOLD)
    c.rect(0.5 * inch, PAGE_H - 1.32 * inch, PAGE_W - 1.0 * inch, 0.04 * inch,
           fill=1, stroke=0)

    # Sub-header text
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.55 * inch,
                        "LIONS INTERNATIONAL · DISTRICT 3232F1")
    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(LIONS_GOLD)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.72 * inch,
                        "A-19 District Information Technology Chairperson · 2025–26")


# ---------- FOOTER ----------

def draw_footer(c: canvas.Canvas, page_num: int, total: int) -> None:
    c.saveState()
    try:
        c.setFillAlpha(0.85)
    except AttributeError:
        pass
    c.setFillColor(LIONS_BLUE_DARK)
    c.rect(0, 0, PAGE_W, 0.45 * inch, fill=1, stroke=0)
    c.restoreState()

    c.setFillColor(LIONS_GOLD)
    c.rect(0, 0.45 * inch, PAGE_W, 0.04 * inch, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(PAGE_W / 2, 0.18 * inch,
                        "We Serve — Powered by Technology")
    c.setFont("Helvetica", 8)
    c.drawRightString(PAGE_W - 0.4 * inch, 0.18 * inch, f"{page_num} / {total}")
    c.drawString(0.4 * inch, 0.18 * inch, "A-19 · 2025–26")


# ---------- BUILDING BLOCKS ----------

def glass_panel(c: canvas.Canvas, x: float, y: float, w: float, h: float,
                opacity: float = 0.78) -> None:
    c.saveState()
    try:
        c.setFillAlpha(opacity)
    except AttributeError:
        pass
    c.setFillColor(white)
    c.roundRect(x, y, w, h, 0.18 * inch, fill=1, stroke=0)
    c.restoreState()
    # gold accent left border
    c.setFillColor(LIONS_GOLD)
    c.rect(x, y, 0.10 * inch, h, fill=1, stroke=0)


def image_box(c: canvas.Canvas, x: float, y: float, w: float, h: float,
              label: str, index_label: str | None = None) -> None:
    c.setFillColor(white)
    c.setStrokeColor(LIONS_GOLD)
    c.setLineWidth(1.6)
    c.roundRect(x, y, w, h, 0.08 * inch, fill=1, stroke=1)

    # gold corner tag
    if index_label:
        c.setFillColor(LIONS_GOLD)
        c.rect(x, y + h - 0.20 * inch, 0.65 * inch, 0.20 * inch, fill=1, stroke=0)
        c.setFillColor(LIONS_BLUE)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x + 0.07 * inch, y + h - 0.14 * inch, index_label)

    # camera glyph
    cx = x + w / 2
    cy = y + h / 2 + 0.08 * inch
    gw = min(0.9 * inch, w * 0.55)
    gh = min(0.45 * inch, h * 0.32)
    c.setStrokeColor(LIONS_BLUE)
    c.setFillColor(LIGHT_GREY)
    c.setLineWidth(1.3)
    c.rect(cx - gw / 2, cy - gh / 2, gw, gh, fill=1, stroke=1)
    c.circle(cx, cy, min(0.14 * inch, gh * 0.4), fill=0, stroke=1)

    # bottom label band
    c.setFillColor(LIONS_BLUE)
    c.rect(x, y, w, 0.30 * inch, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(cx, y + 0.10 * inch, label)


def bullets(c: canvas.Canvas, items: list[str], x0: float, y_top: float,
            max_w: float, font_size: int = 11, gap: float = 0.32 * inch) -> None:
    by = y_top
    char_w = font_size * 0.52
    max_chars = max(20, int(max_w / char_w))
    for b in items:
        c.setFillColor(LIONS_GOLD)
        c.circle(x0 + 0.05 * inch, by + 0.045 * inch, 0.06 * inch, fill=1, stroke=0)
        c.setFillColor(LIONS_BLUE)
        c.setFont("Helvetica-Bold", font_size)
        if len(b) <= max_chars:
            c.drawString(x0 + 0.25 * inch, by, b)
            by -= gap
        else:
            cut = b.rfind(" ", 0, max_chars)
            if cut == -1:
                cut = max_chars
            c.drawString(x0 + 0.25 * inch, by, b[:cut])
            by -= 0.20 * inch
            c.drawString(x0 + 0.25 * inch, by, b[cut:].strip())
            by -= gap


def title_block(c: canvas.Canvas, page_label: str, title: str,
                subtitle: str, top: float) -> float:
    # gold pill badge
    c.setFillColor(LIONS_GOLD)
    c.roundRect(0.6 * inch, top - 0.05 * inch, 1.7 * inch, 0.28 * inch,
                0.14 * inch, fill=1, stroke=0)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(1.45 * inch, top + 0.05 * inch, page_label)

    # Title
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 17)
    # wrap if too long
    if len(title) > 40:
        cut = title.rfind(" ", 0, 40)
        c.drawString(0.6 * inch, top - 0.45 * inch, title[:cut])
        c.drawString(0.6 * inch, top - 0.72 * inch, title[cut:].strip())
        next_y = top - 1.0 * inch
    else:
        c.drawString(0.6 * inch, top - 0.45 * inch, title)
        next_y = top - 0.75 * inch

    c.setFillColor(LIONS_GOLD)
    c.setFont("Helvetica-Oblique", 11)
    c.drawString(0.6 * inch, next_y, subtitle)
    return next_y - 0.2 * inch


# ---------- PAGE TYPES ----------

def render_cover(c: canvas.Canvas, slide: dict) -> None:
    # 4 governor photos — horizontal row
    sec_top = PAGE_H - 2.0 * inch
    margin = 0.5 * inch
    pad = 0.15 * inch

    # Section heading
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(margin, sec_top, "LEADERSHIP · 2025–26")
    c.setFillColor(LIONS_GOLD)
    c.rect(margin, sec_top - 0.05 * inch, 1.4 * inch, 0.03 * inch,
           fill=1, stroke=0)

    cols = 4
    cell_w = (PAGE_W - 2 * margin - pad * (cols - 1)) / cols
    cell_h = 1.4 * inch
    row_y = sec_top - 0.2 * inch - cell_h

    for i, (role, scope) in enumerate(GOVERNORS):
        x = margin + i * (cell_w + pad)
        image_box(c, x, row_y, cell_w, cell_h, role, index_label=f"GOV {i + 1}")
        c.setFillColor(LIONS_GOLD)
        c.setFont("Helvetica-Oblique", 7)
        c.drawCentredString(x + cell_w / 2, row_y - 0.15 * inch, scope)

    # Chairperson photo — centered, slightly larger
    chair_top = row_y - 0.55 * inch
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(PAGE_W / 2, chair_top, "DISTRICT IT CHAIRPERSON · 2025–26")
    c.setFillColor(LIONS_GOLD)
    c.rect(PAGE_W / 2 - 1.2 * inch, chair_top - 0.05 * inch,
           2.4 * inch, 0.03 * inch, fill=1, stroke=0)

    chair_w = 2.4 * inch
    chair_h = 1.7 * inch
    chair_x = (PAGE_W - chair_w) / 2
    chair_y = chair_top - 0.2 * inch - chair_h
    image_box(c, chair_x, chair_y, chair_w, chair_h, "IT Chairperson",
              index_label="CHAIR")
    c.setFillColor(LIONS_GOLD)
    c.setFont("Helvetica-Oblique", 8)
    c.drawCentredString(PAGE_W / 2, chair_y - 0.18 * inch, "District 3232F1 · A-19")

    # Title + bullets in glass panel at the bottom
    panel_y = 0.65 * inch
    panel_h = chair_y - 0.45 * inch - panel_y
    panel_x = 0.5 * inch
    panel_w = PAGE_W - 1.0 * inch
    glass_panel(c, panel_x, panel_y, panel_w, panel_h, opacity=0.85)

    # Title inside the panel
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(panel_x + 0.3 * inch, panel_y + panel_h - 0.4 * inch,
                 slide["title"])
    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Oblique", 9)
    c.drawString(panel_x + 0.3 * inch, panel_y + panel_h - 0.6 * inch,
                 slide["subtitle"])

    # Bullets — two columns inside the panel
    items = slide["bullets"]
    half = (len(items) + 1) // 2
    col_w = (panel_w - 0.7 * inch) / 2
    col_y = panel_y + panel_h - 0.85 * inch
    by1 = col_y
    by2 = col_y
    char_w = 9 * 0.52
    max_chars = int(col_w / char_w)
    for j, txt in enumerate(items[:half]):
        c.setFillColor(LIONS_GOLD)
        c.circle(panel_x + 0.35 * inch, by1 + 0.04 * inch,
                 0.05 * inch, fill=1, stroke=0)
        c.setFillColor(DARK_GREY)
        c.setFont("Helvetica", 9)
        c.drawString(panel_x + 0.5 * inch, by1, txt[:max_chars])
        by1 -= 0.26 * inch
    for j, txt in enumerate(items[half:]):
        x = panel_x + 0.4 * inch + col_w + 0.2 * inch
        c.setFillColor(LIONS_GOLD)
        c.circle(x, by2 + 0.04 * inch, 0.05 * inch, fill=1, stroke=0)
        c.setFillColor(DARK_GREY)
        c.setFont("Helvetica", 9)
        c.drawString(x + 0.15 * inch, by2, txt[:max_chars])
        by2 -= 0.26 * inch


def render_content(c: canvas.Canvas, slide: dict) -> None:
    top = PAGE_H - 2.0 * inch

    # Title block (white text on dark background)
    next_y = title_block(c, slide["page_label"], slide["title"],
                         slide["subtitle"], top)

    # Glass panel with bullets
    panel_x = 0.5 * inch
    panel_w = PAGE_W - 1.0 * inch
    panel_top = next_y - 0.1 * inch
    panel_bottom = 3.4 * inch
    panel_h = panel_top - panel_bottom
    glass_panel(c, panel_x, panel_bottom, panel_w, panel_h, opacity=0.86)

    # Section header inside panel
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(panel_x + 0.35 * inch, panel_top - 0.4 * inch,
                 "Key Focus Areas")

    # Bullets
    bullets(
        c,
        slide["bullets"],
        x0=panel_x + 0.35 * inch,
        y_top=panel_top - 0.8 * inch,
        max_w=panel_w - 0.8 * inch,
        font_size=11,
        gap=0.36 * inch,
    )

    # Bottom image strip — 3 supporting images
    strip = slide.get("strip", [])
    if strip:
        margin = 0.5 * inch
        pad = 0.15 * inch
        cols = len(strip)
        sw = (PAGE_W - 2 * margin - pad * (cols - 1)) / cols
        sh = 2.2 * inch
        sy = 0.65 * inch + 0.15 * inch

        # strip heading
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, sy + sh + 0.15 * inch, "IMPACT IN ACTION")
        c.setFillColor(LIONS_GOLD)
        c.rect(margin, sy + sh + 0.10 * inch, 1.3 * inch, 0.03 * inch,
               fill=1, stroke=0)

        for i, label in enumerate(strip):
            x = margin + i * (sw + pad)
            image_box(c, x, sy, sw, sh, label, index_label=f"IMG {i + 1}")


# ---------- BUILD ----------

def build() -> Path:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=(PAGE_W, PAGE_H))
    c.setTitle("A-19 District IT Chairperson — District 3232F1")
    c.setAuthor("Lions International · District 3232F1")
    c.setSubject("A-19 Awards Submission · 6-page A4 portrait deck")

    total = len(PAGES)
    for i, slide in enumerate(PAGES, start=1):
        draw_background(c, slide.get("background_theme", "service"))
        draw_header(c)

        if slide["kind"] == "cover":
            render_cover(c, slide)
        else:
            render_content(c, slide)

        draw_footer(c, i, total)
        c.showPage()

    c.save()
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
