#!/usr/bin/env python3
"""Generate Hong Kong finance/trade overview PPT with side-by-side charts."""

from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Inches, Pt, Emu

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
OUT = ROOT / "香港金融贸易概览.pptx"

# Visual tokens (deep navy + soft sand — not purple/cream clichés)
NAVY = RGBColor(0x1B, 0x4F, 0x72)
NAVY_DARK = RGBColor(0x0F, 0x2C, 0x44)
GOLD = RGBColor(0xC9, 0xA2, 0x27)
SLATE = RGBColor(0x47, 0x55, 0x69)
MUTED = RGBColor(0x64, 0x74, 0x8B)
LINE = RGBColor(0xE2, 0xE8, 0xF0)
CARD_BG = RGBColor(0xF7, 0xF9, 0xFC)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
ACCENT_SOFT = RGBColor(0xD6, 0xE6, 0xF5)


def set_run(run, size, bold=False, color=NAVY, font_name="Microsoft YaHei"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font_name


def add_textbox(slide, left, top, width, height, text, size=12, bold=False, color=NAVY, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    set_run(run, size, bold=bold, color=color)
    return box


def add_rounded_rect(slide, left, top, width, height, fill, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
        shape.line.width = Pt(1)
    # tighter corners
    try:
        shape.adjustments[0] = 0.08
    except Exception:
        pass
    return shape


def kpi_card(slide, left, top, width, height, value, label, sub=None):
    add_rounded_rect(slide, left, top, width, height, CARD_BG, LINE)
    add_textbox(slide, left + Inches(0.12), top + Inches(0.12), width - Inches(0.2), Inches(0.38),
                value, size=18, bold=True, color=NAVY, align=PP_ALIGN.CENTER)
    add_textbox(slide, left + Inches(0.1), top + Inches(0.48), width - Inches(0.16), Inches(0.42),
                label, size=9, bold=False, color=SLATE, align=PP_ALIGN.CENTER)
    if sub:
        add_textbox(slide, left + Inches(0.1), top + Inches(0.82), width - Inches(0.16), Inches(0.28),
                    sub, size=8, bold=False, color=MUTED, align=PP_ALIGN.CENTER)


def chart_panel(slide, left, top, width, height, title, subtitle, image_path, note):
    # Panel background
    add_rounded_rect(slide, left, top, width, height, WHITE, LINE)

    # Title bar accent
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, Inches(0.08), height)
    bar.fill.solid()
    bar.fill.fore_color.rgb = NAVY
    bar.line.fill.background()

    add_textbox(slide, left + Inches(0.18), top + Inches(0.12), width - Inches(0.28), Inches(0.32),
                title, size=12, bold=True, color=NAVY_DARK)
    add_textbox(slide, left + Inches(0.18), top + Inches(0.42), width - Inches(0.28), Inches(0.55),
                subtitle, size=8, bold=False, color=SLATE)

    # Chart image — smaller, centered in remaining space
    img_top = top + Inches(1.05)
    img_left = left + Inches(0.18)
    img_width = width - Inches(0.36)
    img_height = height - Inches(1.55)
    slide.shapes.add_picture(str(image_path), img_left, img_top, width=img_width, height=img_height)

    add_textbox(slide, left + Inches(0.18), top + height - Inches(0.42), width - Inches(0.28), Inches(0.32),
                note, size=7.5, bold=False, color=MUTED)


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    slide = prs.slides.add_slide(prs.slide_layouts[6])  # blank

    # Soft gradient-like backdrop via layered rects
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = RGBColor(0xEE, 0xF3, 0xF8)
    bg.line.fill.background()

    header = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.95))
    header.fill.solid()
    header.fill.fore_color.rgb = NAVY_DARK
    header.line.fill.background()

    add_textbox(slide, Inches(0.4), Inches(0.18), Inches(10), Inches(0.4),
                "香港金融与贸易概览", size=24, bold=True, color=WHITE)
    add_textbox(slide, Inches(0.4), Inches(0.55), Inches(10), Inches(0.3),
                "GFCI 38（2025年9月）与商品贸易总额走势 · 双图并排对照", size=11, bold=False, color=ACCENT_SOFT)

    # KPI row
    kpis = [
        ("10.9 万亿港元", "2025 商品贸易总额", "+15.5%"),
        ("全球第 5", "WTO 商品贸易排名", "2025"),
        ("93%+", "转口占出口总值比重", "贸易枢纽特征"),
        ("约 80%", "全球离岸人民币支付", "经香港处理"),
    ]
    card_w = Inches(2.95)
    card_h = Inches(1.15)
    gap = Inches(0.18)
    start_x = Inches(0.4)
    y = Inches(1.15)
    for i, (v, lab, sub) in enumerate(kpis):
        kpi_card(slide, start_x + i * (card_w + gap), y, card_w, card_h, v, lab, sub)

    # Two charts on the SAME horizontal line (left / right), reduced size
    panel_top = Inches(2.5)
    panel_h = Inches(4.55)
    panel_w = Inches(6.15)
    left_x = Inches(0.4)
    right_x = Inches(0.4 + 6.15 + 0.23)

    chart_panel(
        slide,
        left_x,
        panel_top,
        panel_w,
        panel_h,
        "全球金融中心指数评分对比",
        "GFCI 38 · 评估 120 个中心：香港 764 分，保持全球第 3、亚太第 1；"
        "与伦敦（765）、新加坡（763）差距仅 1 分。投资管理、保险与整体行业发展全球第 1，金融科技第 4。",
        ASSETS / "gfci_chart.png",
        "来源：GFCI 38（2025年9月发布）",
    )

    chart_panel(
        slide,
        right_x,
        panel_top,
        panel_w,
        panel_h,
        "香港商品贸易总额走势",
        "单位：万亿港元。2022–2023 全球贸易调整后，2024 起强劲复苏；"
        "2026 年 1–4 月对内地双边贸易按年增长 39.5%，动能加快。",
        ASSETS / "trade_chart.png",
        "来源：香港商品贸易统计（2023–2025）",
    )

    prs.save(OUT)
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
