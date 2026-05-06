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
MD_PURPLE = HexColor("#3B1E5E")
MD_PURPLE_DARK = HexColor("#28133F")
DIYA_ORANGE = HexColor("#E8A33D")
DIYA_DEEP = HexColor("#C77A21")
RUBY_RED = HexColor("#B8002D")
RUBY_DARK = HexColor("#6B011A")
BANNER_MAROON = HexColor("#6B1F1F")

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
            ("District IT strategy & execution",
             "Annual roadmap aligned to DG theme; quarterly milestones."),
            ("Website & digital platform management",
             "District + 100+ club sites · SEO · WCAG · uptime."),
            ("Lion Portal reporting & database",
             "MMR, officer roster, dues, service activity — 100% compliance."),
            ("Club IT training & support",
             "Onboarding, helpdesk, monthly webinars for all clubs."),
            ("Digital leadership & innovation",
             "Pilot AI, automation, multi-language outreach."),
            ("Communication & coordination",
             "Cabinet ↔ Zone ↔ Region ↔ Club — single source of truth."),
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 2 · TOPIC 2",
        "title": "Knowledge of Lionism, Website, Portal & LLC",
        "subtitle": "Lionism · Website · Lion Portal · Lions Learning Center",
        "background_theme": "learning",
        "bullets": [
            ("Lionism mission & structure",
             "We Serve · 5 Global Causes · 1.4M+ Lions worldwide."),
            ("Website management",
             "Next.js · SEO · WCAG 2.1 AA · mobile-first."),
            ("Lion Portal usage",
             "SSO · officer reporting · dues · MMR submissions."),
            ("Member data & reporting",
             "MyLion / MyLCI activity logging and analytics."),
            ("Lions Learning Center training",
             "Courses for every officer · FDI · LCI-CIP tracks."),
            ("Digital ecosystem understanding",
             "Resend · Twilio · Razorpay · Supabase integration."),
        ],
        "strip": [
            "Lion Portal", "LLC Course", "District Website",
            "MyLion App", "Brand Kit", "Officer Training",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 3 · TOPIC 3",
        "title": "Preparation & Implementation of District IT Goals",
        "subtitle": "Plan · Execute · Monitor",
        "background_theme": "strategy",
        "bullets": [
            ("IT roadmap & vision",
             "Year-long plan tied to DG theme & cabinet priorities."),
            ("Planning & execution",
             "Quarterly milestones with club-level targets."),
            ("Monitoring & reporting",
             "Real-time dashboards reviewed by the Cabinet."),
            ("Standardization",
             "Brand-safe templates, naming, taxonomy across clubs."),
            ("Performance tracking",
             "100% MMR · website uptime · social growth metrics."),
            ("Continuous improvement",
             "Retro after each quarter; backlog of upgrades."),
        ],
        "strip": [
            "Cabinet Meet", "IT Roadmap", "Dashboard",
            "Quarterly Review", "Audit Report", "Goal Tracker",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 4 · TOPIC 4",
        "title": "Efforts to Promote & Develop Digital Platforms",
        "subtitle": "E-Directory · Website · E-Club House · Multimedia",
        "background_theme": "digital",
        "bullets": [
            ("E-Directory system",
             "Searchable, role-aware, mobile-ready member directory."),
            ("Website development",
             "District + 50+ club micro-sites under unified brand."),
            ("E-Club House",
             "Virtual meets, RSVPs, QR check-ins for every event."),
            ("Multimedia content",
             "Photo & video archive at Club · Zone · Region · District."),
            ("Club to District integration",
             "One login, one brand, one dashboard for all levels."),
            ("Technology adoption",
             "Self-service publishing — clubs go live in minutes."),
        ],
        "strip": [
            "E-Directory", "E-Club House", "Multimedia Reel",
            "Club Website", "Photo Archive", "Template Pack",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 5 · TOPIC 5",
        "title": "Social Media Promotion at Digital Platforms",
        "subtitle": "Reach · Engagement · Branding of Lionism",
        "background_theme": "social",
        "bullets": [
            ("Facebook · Instagram · YouTube",
             "Plus LinkedIn and X — full omni-channel coverage."),
            ("Campaign strategy",
             "Monthly themed campaigns mapped to LCI causes."),
            ("Engagement growth",
             "10K+ followers · +180% YoY growth across platforms."),
            ("Branding consistency",
             "Lions Blue · Gold · We Serve voice on every post."),
            ("Event promotions",
             "Live coverage of conventions, drives, and rallies."),
            ("Content system",
             "Editorial calendar · reels · shorts · bilingual posts."),
        ],
        "strip": [
            "Instagram Grid", "YouTube Reel", "Convention Live",
            "Facebook Page", "LinkedIn Post", "Hashtag Campaign",
        ],
    },
    {
        "kind": "content",
        "page_label": "PAGE 6 · TOPIC 6",
        "title": "Achievements During the Year",
        "subtitle": "Impact · Growth · Recognition",
        "background_theme": "achievement",
        "bullets": [
            ("Digital growth metrics",
             "5,000+ service hours digitally logged on MyLion."),
            ("Website & portal performance",
             "50+ club websites launched under district umbrella."),
            ("Social media reach",
             "10K+ combined followers; viral campaign moments."),
            ("IT initiatives success",
             "₹50L+ donations processed online with full audit."),
            ("Recognition & awards",
             "Featured at MD 3232 IT Forum and district awards."),
            ("District & club impact",
             "100% MMR for 8 months · transparency · trust."),
        ],
        "strip": [
            "Award Moment", "Metrics Dashboard", "Press Feature",
            "Convention Stage", "Certificate", "Milestone Post",
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

def draw_lions_emblem(c: canvas.Canvas, cx: float, cy: float, r: float) -> None:
    """Vector approximation of the official Lions International emblem.

    Composition matches the public emblem: top banner reading "LIONS",
    two lion heads in profile flanking a central blue + gold disc with
    the letter L, and a bottom banner reading "INTERNATIONAL".
    """
    # ---- top banner ("LIONS") ----
    bx, by, bw, bh = cx - r * 1.05, cy + r * 0.55, r * 2.10, r * 0.55
    c.setFillColor(LIONS_GOLD)
    c.roundRect(bx, by, bw, bh, bh * 0.45, fill=1, stroke=0)
    c.setStrokeColor(LIONS_BLUE)
    c.setLineWidth(max(0.4, r * 0.06))
    c.roundRect(bx, by, bw, bh, bh * 0.45, fill=0, stroke=1)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", r * 0.55)
    c.drawCentredString(cx, by + bh * 0.30, "LIONS")

    # ---- bottom banner ("INTERNATIONAL") ----
    bx2, by2 = cx - r * 1.05, cy - r * 1.10
    bw2, bh2 = r * 2.10, r * 0.50
    c.setFillColor(LIONS_GOLD)
    c.roundRect(bx2, by2, bw2, bh2, bh2 * 0.45, fill=1, stroke=0)
    c.setStrokeColor(LIONS_BLUE)
    c.roundRect(bx2, by2, bw2, bh2, bh2 * 0.45, fill=0, stroke=1)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", r * 0.32)
    c.drawCentredString(cx, by2 + bh2 * 0.32, "INTERNATIONAL")

    # ---- side lion silhouettes (stylised, gold) ----
    c.setFillColor(LIONS_GOLD)
    c.setStrokeColor(LIONS_BLUE)
    c.setLineWidth(max(0.5, r * 0.05))

    def lion_head(side: int) -> None:
        # side: -1 = left (faces right), +1 = right (faces left)
        ox = cx + side * r * 0.92
        oy = cy
        # mane (large irregular shape made of overlapping circles)
        for dx, dy, rr in [
            (-0.15, 0.25, 0.45),
            (0.05, 0.35, 0.40),
            (-0.30, 0.10, 0.42),
            (0.10, -0.10, 0.42),
            (-0.25, -0.25, 0.40),
            (0.05, -0.35, 0.38),
        ]:
            c.circle(ox + side * dx * r, oy + dy * r, rr * r, fill=1, stroke=0)
        # face (slightly darker gold area is just gold)
        c.setFillColor(LIONS_GOLD)
        c.circle(ox + side * 0.05 * r, oy, r * 0.32, fill=1, stroke=1)
        # eye
        c.setFillColor(LIONS_BLUE)
        c.circle(ox + side * 0.18 * r, oy + 0.06 * r, r * 0.04, fill=1, stroke=0)
        # snout shading
        c.setStrokeColor(LIONS_BLUE)
        c.setLineWidth(max(0.5, r * 0.04))
        c.line(
            ox + side * 0.20 * r, oy - 0.05 * r,
            ox + side * 0.30 * r, oy - 0.10 * r,
        )
        c.line(
            ox + side * 0.20 * r, oy - 0.12 * r,
            ox + side * 0.30 * r, oy - 0.16 * r,
        )
        # ear tufts at top of mane
        c.setFillColor(LIONS_GOLD)
        c.circle(ox - side * 0.20 * r, oy + 0.42 * r, r * 0.07, fill=1, stroke=1)
        c.circle(ox + side * 0.05 * r, oy + 0.50 * r, r * 0.07, fill=1, stroke=1)
        c.setFillColor(LIONS_GOLD)

    lion_head(-1)
    lion_head(+1)

    # ---- central blue disc with gold ring ----
    c.setFillColor(LIONS_BLUE)
    c.circle(cx, cy, r * 0.55, fill=1, stroke=0)
    c.setStrokeColor(LIONS_GOLD)
    c.setLineWidth(max(0.7, r * 0.10))
    c.circle(cx, cy, r * 0.55, fill=0, stroke=1)

    # ---- central "L" ----
    c.setFillColor(LIONS_GOLD)
    c.setFont("Helvetica-Bold", r * 0.95)
    c.drawCentredString(cx, cy - r * 0.32, "L")


def _arc_text(c: canvas.Canvas, cx: float, cy: float, radius: float,
              text: str, font: str, font_size: float,
              start_deg: float, end_deg: float,
              fill, facing: str = "out") -> None:
    """Render text along a circular arc.

    facing="out" puts the baseline along the arc with letters facing
    outward (used for the top of a badge). facing="in" flips letters
    inward (used for the bottom)."""
    n = len(text)
    if n == 0:
        return
    sweep = end_deg - start_deg
    c.setFillColor(fill)
    c.setFont(font, font_size)
    for i, ch in enumerate(text):
        t = i / max(n - 1, 1)
        ang_deg = start_deg + sweep * t
        ang = math.radians(ang_deg)
        x = cx + radius * math.cos(ang)
        y = cy + radius * math.sin(ang)
        # rotation so glyph baseline is tangent to the circle
        if facing == "out":
            rot = ang_deg - 90
        else:
            rot = ang_deg + 90
        c.saveState()
        c.translate(x, y)
        c.rotate(rot)
        c.drawCentredString(0, 0, ch)
        c.restoreState()


def draw_md_emblem(c: canvas.Canvas, cx: float, cy: float, r: float) -> None:
    """Vector approximation of the Multiple District 3232 'Mission 1.5' badge.

    Purple disc · gold rim · top arc 'LEAD TO SERVE · SERVE TO LEAD',
    bottom arc 'MISSION 1.5 · 3232', central gold clover with the small
    Lions emblem.
    """
    # outer gold ring
    c.setFillColor(LIONS_GOLD)
    c.circle(cx, cy, r, fill=1, stroke=0)
    # purple body
    c.setFillColor(MD_PURPLE)
    c.circle(cx, cy, r * 0.93, fill=1, stroke=0)
    # inner gold hairline
    c.setStrokeColor(LIONS_GOLD)
    c.setLineWidth(max(0.4, r * 0.04))
    c.circle(cx, cy, r * 0.78, fill=0, stroke=1)
    c.setLineWidth(max(0.3, r * 0.02))
    c.circle(cx, cy, r * 0.74, fill=0, stroke=1)

    # decorative dot ring
    c.setFillColor(LIONS_GOLD)
    for i in range(36):
        ang = math.radians(i * 10)
        dx = cx + r * 0.84 * math.cos(ang)
        dy = cy + r * 0.84 * math.sin(ang)
        c.circle(dx, dy, r * 0.018, fill=1, stroke=0)

    # ---- arc text ----
    # top text on outer arc
    top_text = "LEAD TO SERVE  •  SERVE TO LEAD"
    _arc_text(c, cx, cy, r * 0.86, top_text, "Helvetica-Bold",
              r * 0.13, start_deg=160, end_deg=20,
              fill=LIONS_GOLD, facing="out")

    # bottom text
    bot_text = "MISSION 1.5  •  MD 3232"
    _arc_text(c, cx, cy, r * 0.86, bot_text, "Helvetica-Bold",
              r * 0.13, start_deg=200, end_deg=340,
              fill=LIONS_GOLD, facing="in")

    # ---- central gold clover (4 petals) ----
    petal_r = r * 0.30
    for ang_deg in (45, 135, 225, 315):
        ang = math.radians(ang_deg)
        px = cx + r * 0.28 * math.cos(ang)
        py = cy + r * 0.28 * math.sin(ang)
        c.setFillColor(LIONS_GOLD)
        c.circle(px, py, petal_r, fill=1, stroke=0)
        c.setStrokeColor(MD_PURPLE_DARK)
        c.setLineWidth(max(0.3, r * 0.02))
        c.circle(px, py, petal_r, fill=0, stroke=1)

    # central white-ish disc with mini Lions emblem
    c.setFillColor(LIONS_GOLD)
    c.circle(cx, cy, r * 0.30, fill=1, stroke=0)
    c.setStrokeColor(MD_PURPLE_DARK)
    c.setLineWidth(max(0.4, r * 0.03))
    c.circle(cx, cy, r * 0.30, fill=0, stroke=1)

    # mini "LIONS" cap
    c.setFillColor(MD_PURPLE_DARK)
    c.setFont("Helvetica-Bold", r * 0.10)
    c.drawCentredString(cx, cy + r * 0.16, "LIONS")
    # central L
    c.setFont("Helvetica-Bold", r * 0.32)
    c.drawCentredString(cx, cy - r * 0.10, "L")
    # mini "INTERNATIONAL"
    c.setFont("Helvetica-Bold", r * 0.06)
    c.drawCentredString(cx, cy - r * 0.20, "INTERNATIONAL")


def draw_district_emblem(c: canvas.Canvas, cx: float, cy: float, r: float) -> None:
    """Vector approximation of the District 3232 F1 'Shine For Better
    Tomorrow' diya emblem.

    Composition: lotus / scalloped orange base ring, dark maroon banner
    band carrying '3232 F1 • 2025-26' (with mini Lions emblem on top)
    and 'SHINE FOR BETTER TOMORROW' arc, gold diya bowl, ruby flame.
    """
    # ---- scalloped base (lotus petals) ----
    petal_n = 14
    base_r = r
    inner_r = r * 0.78
    c.setFillColor(DIYA_ORANGE)
    for i in range(petal_n):
        ang = math.radians(i * 360 / petal_n - 90)
        px = cx + inner_r * 0.92 * math.cos(ang)
        py = cy + inner_r * 0.92 * math.sin(ang) - r * 0.05
        c.circle(px, py, r * 0.18, fill=1, stroke=0)
    c.setStrokeColor(DIYA_DEEP)
    c.setLineWidth(max(0.4, r * 0.04))
    for i in range(petal_n):
        ang = math.radians(i * 360 / petal_n - 90)
        px = cx + inner_r * 0.92 * math.cos(ang)
        py = cy + inner_r * 0.92 * math.sin(ang) - r * 0.05
        c.circle(px, py, r * 0.18, fill=0, stroke=1)

    # ---- maroon banner disc (carries the text) ----
    c.setFillColor(BANNER_MAROON)
    c.circle(cx, cy - r * 0.05, inner_r * 0.92, fill=1, stroke=0)
    c.setStrokeColor(DIYA_ORANGE)
    c.setLineWidth(max(0.5, r * 0.05))
    c.circle(cx, cy - r * 0.05, inner_r * 0.92, fill=0, stroke=1)

    # ---- gold diya bowl (top half ellipse) ----
    bowl_w = r * 1.20
    bowl_h = r * 0.42
    c.setFillColor(DIYA_ORANGE)
    c.ellipse(cx - bowl_w / 2, cy + r * 0.05,
              cx + bowl_w / 2, cy + r * 0.05 + bowl_h,
              fill=1, stroke=1)
    c.setStrokeColor(DIYA_DEEP)
    c.setLineWidth(max(0.5, r * 0.05))
    c.ellipse(cx - bowl_w / 2, cy + r * 0.05,
              cx + bowl_w / 2, cy + r * 0.05 + bowl_h,
              fill=0, stroke=1)
    # bowl interior shadow (smaller darker ellipse on top)
    c.setFillColor(DIYA_DEEP)
    c.ellipse(cx - bowl_w * 0.45, cy + r * 0.27,
              cx + bowl_w * 0.45, cy + r * 0.40,
              fill=1, stroke=0)

    # ---- flame (red teardrop) ----
    flame_cx = cx
    flame_base_y = cy + r * 0.32
    flame_w = r * 0.55
    flame_h = r * 0.95
    # teardrop = circle + triangle pointing up
    c.setFillColor(RUBY_RED)
    c.circle(flame_cx, flame_base_y + flame_h * 0.30, flame_w * 0.55,
             fill=1, stroke=0)
    p = c.beginPath()
    p.moveTo(flame_cx - flame_w * 0.55, flame_base_y + flame_h * 0.30)
    p.lineTo(flame_cx + flame_w * 0.55, flame_base_y + flame_h * 0.30)
    p.lineTo(flame_cx, flame_base_y + flame_h)
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    # gold rim on flame
    c.setStrokeColor(DIYA_ORANGE)
    c.setLineWidth(max(0.5, r * 0.04))
    c.circle(flame_cx, flame_base_y + flame_h * 0.30, flame_w * 0.55,
             fill=0, stroke=1)
    p2 = c.beginPath()
    p2.moveTo(flame_cx - flame_w * 0.55, flame_base_y + flame_h * 0.30)
    p2.lineTo(flame_cx, flame_base_y + flame_h)
    p2.lineTo(flame_cx + flame_w * 0.55, flame_base_y + flame_h * 0.30)
    c.drawPath(p2, fill=0, stroke=1)
    # ruby gem highlight
    c.setFillColor(RUBY_DARK)
    p3 = c.beginPath()
    p3.moveTo(flame_cx - flame_w * 0.20, flame_base_y + flame_h * 0.55)
    p3.lineTo(flame_cx + flame_w * 0.20, flame_base_y + flame_h * 0.55)
    p3.lineTo(flame_cx, flame_base_y + flame_h * 0.85)
    p3.close()
    c.drawPath(p3, fill=1, stroke=0)

    # ---- mini Lions emblem badge on banner top ----
    mini_r = r * 0.20
    mini_cy = cy - r * 0.05
    c.setFillColor(LIONS_GOLD)
    c.circle(cx, mini_cy, mini_r, fill=1, stroke=0)
    c.setStrokeColor(LIONS_BLUE)
    c.setLineWidth(max(0.4, r * 0.03))
    c.circle(cx, mini_cy, mini_r, fill=0, stroke=1)
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", mini_r * 0.45)
    c.drawCentredString(cx, mini_cy + mini_r * 0.30, "LIONS")
    c.setFont("Helvetica-Bold", mini_r * 0.95)
    c.drawCentredString(cx, mini_cy - mini_r * 0.40, "L")

    # ---- arc text on banner ----
    # top arc — district + lionistic year (under the bowl)
    _arc_text(c, cx, cy - r * 0.05, inner_r * 0.78,
              "3232 F1  •  2025-26",
              "Helvetica-Bold", r * 0.14,
              start_deg=200, end_deg=340,
              fill=white, facing="in")

    # outer arc — slogan
    _arc_text(c, cx, cy - r * 0.05, inner_r * 0.92,
              "SHINE FOR BETTER TOMORROW",
              "Helvetica-Bold", r * 0.10,
              start_deg=215, end_deg=325,
              fill=LIONS_BLUE, facing="in")


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
    y = PAGE_H - 0.85 * inch

    # 1st logo — Lions International emblem anchored TOP-LEFT
    lions_r = 0.5 * inch
    lions_cx = 0.55 * inch + lions_r
    draw_lions_emblem(c, lions_cx, y, lions_r)

    # 2nd logo — Multiple District 3232 'Mission 1.5' badge
    md_r = 0.5 * inch
    md_cx = lions_cx + lions_r + 0.35 * inch + md_r
    draw_md_emblem(c, md_cx, y, md_r)

    # 4th logo — District 3232 F1 'Shine For Better Tomorrow' diya, TOP-RIGHT
    dist_r = 0.55 * inch
    dist_cx = PAGE_W - 0.55 * inch - dist_r
    draw_district_emblem(c, dist_cx, y, dist_r)

    # 3rd logo — middle slot between MD and District emblems
    mid_label = HEADER_LOGOS[2]
    mid_r = 0.35 * inch
    left_edge = md_cx + md_r
    right_edge = dist_cx - dist_r
    mid_cx = (left_edge + right_edge) / 2
    draw_logo(c, mid_cx, y, mid_r, mid_label)

    # Gold divider line
    c.setFillColor(LIONS_GOLD)
    c.rect(0.5 * inch, PAGE_H - 1.42 * inch, PAGE_W - 1.0 * inch, 0.04 * inch,
           fill=1, stroke=0)

    # Sub-header text
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.65 * inch,
                        "LIONS INTERNATIONAL · DISTRICT 3232F1")
    c.setFont("Helvetica-Oblique", 9)
    c.setFillColor(LIONS_GOLD)
    c.drawCentredString(PAGE_W / 2, PAGE_H - 1.82 * inch,
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


def _wrap(text: str, max_chars: int) -> list[str]:
    if len(text) <= max_chars:
        return [text]
    cut = text.rfind(" ", 0, max_chars)
    if cut == -1:
        cut = max_chars
    return [text[:cut], text[cut:].strip()]


def bullets(c: canvas.Canvas, items, x0: float, y_top: float,
            max_w: float, head_size: int = 12, sub_size: int = 9,
            block_h: float | None = None) -> None:
    """Render rich bullets that fill the available vertical space.

    items may be either ``str`` or ``(head, sub)`` tuples.
    block_h fixes per-bullet vertical slot; if None each block sizes itself.
    """
    by = y_top
    head_chars = max(20, int(max_w / (head_size * 0.52)))
    sub_chars = max(24, int(max_w / (sub_size * 0.50)))

    for it in items:
        if isinstance(it, tuple):
            head, sub = it
        else:
            head, sub = it, None

        slot_top = by
        # bullet marker
        c.setFillColor(LIONS_GOLD)
        c.circle(x0 + 0.05 * inch, by + 0.05 * inch,
                 0.07 * inch, fill=1, stroke=0)

        # head (bold, blue)
        c.setFillColor(LIONS_BLUE)
        c.setFont("Helvetica-Bold", head_size)
        for line in _wrap(head, head_chars):
            c.drawString(x0 + 0.28 * inch, by, line)
            by -= (head_size + 4) * 0.014 * inch

        # sub (regular grey)
        if sub:
            by -= 0.04 * inch
            c.setFillColor(DARK_GREY)
            c.setFont("Helvetica", sub_size)
            for line in _wrap(sub, sub_chars):
                c.drawString(x0 + 0.28 * inch, by, line)
                by -= (sub_size + 3) * 0.014 * inch

        if block_h is not None:
            by = slot_top - block_h
        else:
            by -= 0.16 * inch


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

    # Title + bullets in glass panel at the bottom — fills remaining space
    panel_y = 0.65 * inch
    panel_h = chair_y - 0.45 * inch - panel_y
    panel_x = 0.5 * inch
    panel_w = PAGE_W - 1.0 * inch
    glass_panel(c, panel_x, panel_y, panel_w, panel_h, opacity=0.92)

    # Title inside the panel
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 16)
    c.drawString(panel_x + 0.35 * inch, panel_y + panel_h - 0.45 * inch,
                 slide["title"])
    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Oblique", 10)
    c.drawString(panel_x + 0.35 * inch, panel_y + panel_h - 0.68 * inch,
                 slide["subtitle"])
    # gold underline accent
    c.setFillColor(LIONS_GOLD)
    c.rect(panel_x + 0.35 * inch, panel_y + panel_h - 0.78 * inch,
           1.6 * inch, 0.04 * inch, fill=1, stroke=0)

    # Bullets — two columns, fill remaining panel height equally
    items = slide["bullets"]
    half = (len(items) + 1) // 2
    col_w = (panel_w - 0.9 * inch) / 2
    bullets_top = panel_y + panel_h - 1.0 * inch
    bullets_bottom = panel_y + 0.3 * inch
    available_h = bullets_top - bullets_bottom
    block_h = available_h / max(half, 1)

    bullets(c, items[:half], x0=panel_x + 0.35 * inch, y_top=bullets_top,
            max_w=col_w, head_size=11, sub_size=9, block_h=block_h)
    bullets(c, items[half:], x0=panel_x + 0.55 * inch + col_w,
            y_top=bullets_top, max_w=col_w,
            head_size=11, sub_size=9, block_h=block_h)


def render_content(c: canvas.Canvas, slide: dict) -> None:
    top = PAGE_H - 2.0 * inch

    # Title block (white text on dark background)
    next_y = title_block(c, slide["page_label"], slide["title"],
                         slide["subtitle"], top)

    # ---- 2 x 3 image grid at the bottom (6 images) ----
    margin = 0.5 * inch
    pad = 0.13 * inch
    cols, rows = 3, 2
    grid_bottom = 0.65 * inch + 0.15 * inch
    cell_w = (PAGE_W - 2 * margin - pad * (cols - 1)) / cols
    cell_h = 1.85 * inch
    grid_h = rows * cell_h + (rows - 1) * pad
    grid_top = grid_bottom + grid_h

    # ---- glass panel with bullets fills the space between title and grid ----
    panel_x = 0.5 * inch
    panel_w = PAGE_W - 1.0 * inch
    panel_top = next_y - 0.1 * inch
    panel_bottom = grid_top + 0.4 * inch  # space above grid heading
    panel_h = panel_top - panel_bottom
    glass_panel(c, panel_x, panel_bottom, panel_w, panel_h, opacity=0.86)

    # Section header inside panel
    c.setFillColor(LIONS_BLUE)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(panel_x + 0.35 * inch, panel_top - 0.4 * inch,
                 "Key Focus Areas")
    c.setFillColor(LIONS_GOLD)
    c.rect(panel_x + 0.35 * inch, panel_top - 0.5 * inch,
           1.4 * inch, 0.04 * inch, fill=1, stroke=0)

    # Bullets fill the panel exactly
    bullets_top = panel_top - 0.7 * inch
    bullets_bottom = panel_bottom + 0.25 * inch
    available_h = bullets_top - bullets_bottom
    items = slide["bullets"]
    block_h = available_h / max(len(items), 1)

    bullets(
        c,
        items,
        x0=panel_x + 0.35 * inch,
        y_top=bullets_top,
        max_w=panel_w - 0.8 * inch,
        head_size=11,
        sub_size=9,
        block_h=block_h,
    )

    # ---- Image grid heading ----
    strip = slide.get("strip", [])
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, grid_top + 0.12 * inch, "IMPACT IN ACTION")
    c.setFillColor(LIONS_GOLD)
    c.rect(margin, grid_top + 0.07 * inch, 1.3 * inch, 0.03 * inch,
           fill=1, stroke=0)

    # ---- 6 image placeholders in 2 rows of 3 ----
    for i in range(min(6, len(strip))):
        r = i // cols
        col = i % cols
        x = margin + col * (cell_w + pad)
        y = grid_bottom + (rows - 1 - r) * (cell_h + pad)
        image_box(c, x, y, cell_w, cell_h, strip[i], index_label=f"IMG {i + 1}")


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
