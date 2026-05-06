"""Render the PDF deck pages as PNGs and embed them into a Word (.docx).

This guarantees the Word file is visually identical to the PDF (the same
4 emblems, themed backgrounds, glass panels, image strips).

Run:  python3 scripts/build_a19_docx.py
Output: docs/A19_IT_CHAIRPERSON_DECK.docx
"""
from __future__ import annotations

from pathlib import Path

import pypdfium2 as pdfium
from docx import Document
from docx.enum.section import WD_ORIENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.shared import Cm, Pt, Emu

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "docs" / "A19_IT_CHAIRPERSON_DECK.pdf"
OUT = ROOT / "docs" / "A19_IT_CHAIRPERSON_DECK.docx"
RENDER_DIR = ROOT / "docs" / "_pages"


def render_pages(pdf_path: Path, out_dir: Path, scale: float = 3.0) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = pdfium.PdfDocument(str(pdf_path))
    paths: list[Path] = []
    for i in range(len(doc)):
        page = doc[i]
        pil = page.render(scale=scale).to_pil()
        p = out_dir / f"page_{i + 1:02d}.png"
        pil.save(p, "PNG")
        paths.append(p)
    return paths


def build() -> Path:
    pages = render_pages(PDF, RENDER_DIR, scale=3.0)

    document = Document()

    # Portrait A4
    section = document.sections[0]
    section.orientation = WD_ORIENT.PORTRAIT
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(0.5)
    section.bottom_margin = Cm(0.5)
    section.left_margin = Cm(0.5)
    section.right_margin = Cm(0.5)

    # Make sure paragraph spacing doesn't push the image off the page
    style = document.styles["Normal"]
    style.paragraph_format.space_before = Pt(0)
    style.paragraph_format.space_after = Pt(0)
    style.paragraph_format.line_spacing = 1.0

    image_w = section.page_width - section.left_margin - section.right_margin

    for idx, img in enumerate(pages):
        para = document.add_paragraph()
        para.alignment = WD_ALIGN_PARAGRAPH.CENTER
        para.paragraph_format.space_before = Pt(0)
        para.paragraph_format.space_after = Pt(0)
        run = para.add_run()
        run.add_picture(str(img), width=image_w)
        if idx < len(pages) - 1:
            para.add_run().add_break(WD_BREAK.PAGE)

    document.save(str(OUT))
    return OUT


if __name__ == "__main__":
    path = build()
    print(f"Wrote {path}")
