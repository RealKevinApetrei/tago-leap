#!/usr/bin/env python3
"""
TAGO Leap Hackathon Pitch Deck Generator
Creates a world-class PowerPoint presentation with full branding
"""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import os

# Brand Colors
BLACK = RGBColor(0, 0, 0)
WHITE = RGBColor(255, 255, 255)
YELLOW = RGBColor(255, 214, 51)  # #FFD633
GRAY = RGBColor(128, 128, 128)
DARK_GRAY = RGBColor(40, 40, 40)

def set_slide_background(slide, color=BLACK):
    """Set slide background color"""
    background = slide.background
    fill = background.fill
    fill.solid()
    fill.fore_color.rgb = color

def add_text_box(slide, left, top, width, height, text, font_size=18,
                 font_color=WHITE, bold=False, italic=False, align=PP_ALIGN.LEFT,
                 font_name="Arial"):
    """Add a text box with styling"""
    txBox = slide.shapes.add_textbox(Inches(left), Inches(top),
                                      Inches(width), Inches(height))
    tf = txBox.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(font_size)
    p.font.color.rgb = font_color
    p.font.bold = bold
    p.font.italic = italic
    p.font.name = font_name
    p.alignment = align
    return txBox

def add_bullet_points(slide, left, top, width, height, points, font_size=16,
                      font_color=WHITE, bullet_color=YELLOW):
    """Add bullet points"""
    txBox = slide.shapes.add_textbox(Inches(left), Inches(top),
                                      Inches(width), Inches(height))
    tf = txBox.text_frame
    tf.word_wrap = True

    for i, point in enumerate(points):
        if i == 0:
            p = tf.paragraphs[0]
        else:
            p = tf.add_paragraph()
        p.text = f"• {point}"
        p.font.size = Pt(font_size)
        p.font.color.rgb = font_color
        p.font.name = "Arial"
        p.space_before = Pt(8)
        p.space_after = Pt(4)
    return txBox

def add_yellow_accent_box(slide, left, top, width, height, text, subtitle=""):
    """Add a yellow accent box for key stats"""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                    Inches(left), Inches(top),
                                    Inches(width), Inches(height))
    shape.fill.solid()
    shape.fill.fore_color.rgb = YELLOW
    shape.line.fill.background()

    # Add text
    tf = shape.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = text
    p.font.size = Pt(24)
    p.font.color.rgb = BLACK
    p.font.bold = True
    p.font.name = "Arial"
    p.alignment = PP_ALIGN.CENTER

    if subtitle:
        p2 = tf.add_paragraph()
        p2.text = subtitle
        p2.font.size = Pt(12)
        p2.font.color.rgb = BLACK
        p2.font.name = "Arial"
        p2.alignment = PP_ALIGN.CENTER

    return shape

def add_bounty_badge(slide, left, top, bounty_name, color=YELLOW):
    """Add a bounty badge"""
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                    Inches(left), Inches(top),
                                    Inches(1.2), Inches(0.4))
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()

    tf = shape.text_frame
    p = tf.paragraphs[0]
    p.text = bounty_name
    p.font.size = Pt(12)
    p.font.color.rgb = BLACK
    p.font.bold = True
    p.font.name = "Arial"
    p.alignment = PP_ALIGN.CENTER
    return shape

def create_presentation():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # =========================================================================
    # SLIDE 1: Title Slide
    # =========================================================================
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])  # Blank layout
    set_slide_background(slide1)

    # Yellow border frame (top)
    top_border = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                          Inches(0.5), Inches(0.3),
                                          Inches(12.333), Inches(0.05))
    top_border.fill.solid()
    top_border.fill.fore_color.rgb = YELLOW
    top_border.line.fill.background()

    # Logo text - TAGO
    add_text_box(slide1, 0.5, 0.8, 12.333, 1.5, "TAGO",
                 font_size=96, font_color=WHITE, bold=True,
                 align=PP_ALIGN.CENTER)

    # LEAP with yellow accent
    add_text_box(slide1, 0.5, 2.2, 12.333, 1, "LEAP",
                 font_size=72, font_color=YELLOW, bold=True, italic=True,
                 align=PP_ALIGN.CENTER)

    # Tagline
    add_text_box(slide1, 0.5, 3.5, 12.333, 0.8,
                 "Trade ideas, not tokens",
                 font_size=28, font_color=WHITE, italic=True,
                 align=PP_ALIGN.CENTER)

    # Subtitle
    add_text_box(slide1, 0.5, 4.3, 12.333, 0.6,
                 "AI-Powered Narrative Trading on Hyperliquid",
                 font_size=20, font_color=GRAY,
                 align=PP_ALIGN.CENTER)

    # Three bounty badges
    add_bounty_badge(slide1, 4.5, 5.5, "PEAR")
    add_bounty_badge(slide1, 6.0, 5.5, "LIFI")
    add_bounty_badge(slide1, 7.5, 5.5, "SALT")

    # Bottom text
    add_text_box(slide1, 0.5, 6.5, 12.333, 0.5,
                 "Hyperstack Hackathon 2025",
                 font_size=14, font_color=GRAY,
                 align=PP_ALIGN.CENTER)

    # Yellow border (bottom)
    bottom_border = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                             Inches(0.5), Inches(7.15),
                                             Inches(12.333), Inches(0.05))
    bottom_border.fill.solid()
    bottom_border.fill.fore_color.rgb = YELLOW
    bottom_border.line.fill.background()

    # =========================================================================
    # SLIDE 2: Problem Statement
    # =========================================================================
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide2)

    add_text_box(slide2, 0.5, 0.5, 12.333, 0.8, "The Problem",
                 font_size=44, font_color=YELLOW, bold=True)

    problems = [
        "Trading is complex - Users manage raw tokens, not market theses",
        "Fragmented onboarding - Bridging from other chains is painful",
        "Risk management is manual - No automated guardrails for traders",
        "No narrative trading - Can't express 'AI will outperform ETH' easily",
        "Custody concerns - Automation tools often require giving up control"
    ]

    add_bullet_points(slide2, 0.8, 1.8, 11, 4.5, problems, font_size=24)

    # Stats boxes
    add_yellow_accent_box(slide2, 1, 5.5, 3, 1.2, "5+ Steps", "To bridge & trade")
    add_yellow_accent_box(slide2, 5, 5.5, 3, 1.2, "0 Tools", "For narrative trading")
    add_yellow_accent_box(slide2, 9, 5.5, 3, 1.2, "100%", "Manual risk mgmt")

    # =========================================================================
    # SLIDE 3: Solution Overview
    # =========================================================================
    slide3 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide3)

    add_text_box(slide3, 0.5, 0.5, 12.333, 0.8, "TAGO Leap: The Solution",
                 font_size=44, font_color=WHITE, bold=True)

    add_text_box(slide3, 0.5, 1.3, 12.333, 0.6,
                 "One platform. Three powerful integrations.",
                 font_size=20, font_color=GRAY, italic=True)

    # Three pillars
    pillars = [
        ("PEAR", "Trade Ideas", "AI-powered narrative trading\nPair & basket trades\nBet-slip UX"),
        ("LIFI", "One-Click Onboard", "Bridge from any chain\nDeposit to Hyperliquid\nSeamless flow"),
        ("SALT", "Robo Managers", "Policy-controlled accounts\nAutomated strategies\nNon-custodial")
    ]

    x_positions = [1, 5, 9]
    for i, (badge, title, desc) in enumerate(pillars):
        # Badge
        add_bounty_badge(slide3, x_positions[i], 2.2, badge)

        # Title
        add_text_box(slide3, x_positions[i] - 0.3, 2.8, 3.5, 0.6, title,
                     font_size=28, font_color=WHITE, bold=True)

        # Description box
        box = slide3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                       Inches(x_positions[i] - 0.3), Inches(3.5),
                                       Inches(3.5), Inches(2.5))
        box.fill.solid()
        box.fill.fore_color.rgb = DARK_GRAY
        box.line.color.rgb = YELLOW
        box.line.width = Pt(1)

        add_text_box(slide3, x_positions[i], 3.7, 3, 2, desc,
                     font_size=16, font_color=WHITE)

    # Bottom tagline
    add_text_box(slide3, 0.5, 6.5, 12.333, 0.5,
                 '"Trade ideas, not just single tokens" + "One-click onboarding" + "Never take custody"',
                 font_size=14, font_color=YELLOW, italic=True,
                 align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 4: PEAR Bounty Deep Dive
    # =========================================================================
    slide4 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide4)

    add_bounty_badge(slide4, 0.5, 0.5, "PEAR")
    add_text_box(slide4, 2, 0.4, 10, 0.8, "Narrative Trading Engine",
                 font_size=40, font_color=WHITE, bold=True)

    add_text_box(slide4, 0.5, 1.2, 12.333, 0.5,
                 '"Build tools that let people trade ideas, not just single tokens"',
                 font_size=16, font_color=GRAY, italic=True)

    # Left column - How it works
    add_text_box(slide4, 0.5, 1.9, 5.5, 0.5, "How It Works",
                 font_size=24, font_color=YELLOW, bold=True)

    steps = [
        "1. Enter your market thesis in plain English",
        '2. AI (Claude) generates trade suggestions',
        "3. Select pair or basket trade",
        "4. Adjust stake, leverage, direction",
        "5. Execute via Pear Protocol API"
    ]
    add_bullet_points(slide4, 0.8, 2.5, 5.5, 3, steps, font_size=16)

    # Right column - Features
    add_text_box(slide4, 7, 1.9, 5.5, 0.5, "Key Features",
                 font_size=24, font_color=YELLOW, bold=True)

    features = [
        "Narrative-first UI (themes, not tickers)",
        "Pair trades: Long A / Short B",
        "Basket trades: Long group vs benchmark",
        "Bet-slip UX (stake, direction, risk)",
        "Full trade logging with metadata"
    ]
    add_bullet_points(slide4, 7.3, 2.5, 5.5, 3, features, font_size=16)

    # Example box
    example_box = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                           Inches(0.5), Inches(5.3),
                                           Inches(12.333), Inches(1.8))
    example_box.fill.solid()
    example_box.fill.fore_color.rgb = DARK_GRAY
    example_box.line.color.rgb = YELLOW

    add_text_box(slide4, 0.8, 5.5, 12, 0.4, "Example Thesis:",
                 font_size=14, font_color=YELLOW, bold=True)
    add_text_box(slide4, 0.8, 5.9, 12, 0.4,
                 '"I believe AI tokens will outperform Ethereum over the next month"',
                 font_size=18, font_color=WHITE, italic=True)
    add_text_box(slide4, 0.8, 6.4, 12, 0.4,
                 "→ AI suggests: Long RENDER, TAO, FET basket / Short ETH benchmark",
                 font_size=16, font_color=GRAY)

    # =========================================================================
    # SLIDE 5: LIFI Bounty Deep Dive
    # =========================================================================
    slide5 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide5)

    add_bounty_badge(slide5, 0.5, 0.5, "LIFI")
    add_text_box(slide5, 2, 0.4, 10, 0.8, "One-Click Onboarding",
                 font_size=40, font_color=WHITE, bold=True)

    add_text_box(slide5, 0.5, 1.2, 12.333, 0.5,
                 '"Bridge users from any chain into HyperEVM using LI.FI routing"',
                 font_size=16, font_color=GRAY, italic=True)

    # Flow diagram (simplified)
    flow_steps = ["Any Chain", "→", "LI.FI Router", "→", "HyperEVM", "→", "Trading Account"]
    x_pos = 0.5
    for i, step in enumerate(flow_steps):
        if step == "→":
            add_text_box(slide5, x_pos, 2.3, 0.8, 0.5, step,
                         font_size=32, font_color=YELLOW, align=PP_ALIGN.CENTER)
            x_pos += 0.8
        else:
            box = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                           Inches(x_pos), Inches(2.2),
                                           Inches(2.2), Inches(0.7))
            box.fill.solid()
            box.fill.fore_color.rgb = DARK_GRAY
            box.line.color.rgb = YELLOW

            tf = box.text_frame
            p = tf.paragraphs[0]
            p.text = step
            p.font.size = Pt(14)
            p.font.color.rgb = WHITE
            p.font.bold = True
            p.alignment = PP_ALIGN.CENTER
            x_pos += 2.5

    # Features
    add_text_box(slide5, 0.5, 3.3, 5.5, 0.5, "User Experience",
                 font_size=24, font_color=YELLOW, bold=True)

    ux_features = [
        "Select origin chain + token",
        "See full route summary & ETA",
        "Track progress in real-time",
        "Automatic deposit to trading account",
        "Mobile-first responsive design"
    ]
    add_bullet_points(slide5, 0.8, 3.9, 5.5, 2.5, ux_features, font_size=16)

    add_text_box(slide5, 7, 3.3, 5.5, 0.5, "Technical Implementation",
                 font_size=24, font_color=YELLOW, bold=True)

    tech_features = [
        "Dedicated lifi-service backend",
        "GET /onboard/options - supported chains",
        "POST /onboard/quote - route quotes",
        "POST /onboard/track - progress tracking",
        "Reusable deposit component"
    ]
    add_bullet_points(slide5, 7.3, 3.9, 5.5, 2.5, tech_features, font_size=16)

    # Key differentiator
    add_yellow_accent_box(slide5, 4, 6.2, 5.333, 1, "1 Click", "From any chain to trading")

    # =========================================================================
    # SLIDE 6: SALT Bounty Deep Dive
    # =========================================================================
    slide6 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide6)

    add_bounty_badge(slide6, 0.5, 0.5, "SALT")
    add_text_box(slide6, 2, 0.4, 10, 0.8, "Policy-Controlled Robo Managers",
                 font_size=40, font_color=WHITE, bold=True)

    add_text_box(slide6, 0.5, 1.2, 12.333, 0.5,
                 '"Automate and manage capital without ever taking custody"',
                 font_size=16, font_color=GRAY, italic=True)

    # Policy features
    add_text_box(slide6, 0.5, 1.9, 6, 0.5, "Policy Controls",
                 font_size=24, font_color=YELLOW, bold=True)

    policies = [
        "Max Leverage: 1-10x limit",
        "Daily Notional: $100 - $1M cap",
        "Max Drawdown: 1-50% protection",
        "Allowed Pairs: Whitelist only",
        "All rules enforced before execution"
    ]
    add_bullet_points(slide6, 0.8, 2.5, 5.5, 2.5, policies, font_size=16)

    # Strategies
    add_text_box(slide6, 7, 1.9, 5.5, 0.5, "Automated Strategies",
                 font_size=24, font_color=YELLOW, bold=True)

    strategies = [
        "Mean Reversion: AI vs ETH",
        "SOL Ecosystem vs BTC",
        "DeFi Momentum plays",
        "60-second strategy loop",
        "Full audit trail in strategy_runs"
    ]
    add_bullet_points(slide6, 7.3, 2.5, 5.5, 2.5, strategies, font_size=16)

    # Non-custodial emphasis
    emphasis_box = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                            Inches(0.5), Inches(5.2),
                                            Inches(12.333), Inches(2))
    emphasis_box.fill.solid()
    emphasis_box.fill.fore_color.rgb = DARK_GRAY
    emphasis_box.line.color.rgb = YELLOW
    emphasis_box.line.width = Pt(2)

    add_text_box(slide6, 0.8, 5.4, 12, 0.5, "NON-CUSTODIAL BY DESIGN",
                 font_size=24, font_color=YELLOW, bold=True)
    add_text_box(slide6, 0.8, 5.9, 12, 1,
                 "Your funds stay in YOUR policy-controlled account. The robo manager only instructs trades under strict rules - never holds your assets.",
                 font_size=18, font_color=WHITE)

    # =========================================================================
    # SLIDE 7: Architecture
    # =========================================================================
    slide7 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide7)

    add_text_box(slide7, 0.5, 0.3, 12.333, 0.8, "Architecture",
                 font_size=44, font_color=WHITE, bold=True)

    # Service boxes
    services = [
        ("Frontend", "Next.js 14\nRainbowKit\nTailwind CSS", 0.5, 1.5),
        ("pear-service", "Claude AI\nPear Protocol\nTrade Execution", 4, 1.5),
        ("lifi-service", "LI.FI SDK\nRoute Optimization\nDeposit Flow", 7.5, 1.5),
        ("salt-service", "Salt SDK\nPolicy Engine\nStrategy Loop", 11, 1.5),
    ]

    for name, desc, x, y in services:
        box = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                       Inches(x), Inches(y),
                                       Inches(2.8), Inches(2))
        box.fill.solid()
        box.fill.fore_color.rgb = DARK_GRAY
        box.line.color.rgb = YELLOW

        # Service name
        add_text_box(slide7, x + 0.1, y + 0.1, 2.6, 0.4, name,
                     font_size=16, font_color=YELLOW, bold=True, align=PP_ALIGN.CENTER)

        # Description
        add_text_box(slide7, x + 0.1, y + 0.6, 2.6, 1.3, desc,
                     font_size=12, font_color=WHITE, align=PP_ALIGN.CENTER)

    # External services
    add_text_box(slide7, 0.5, 4, 12.333, 0.5, "External Integrations",
                 font_size=20, font_color=GRAY)

    externals = [
        ("Hyperliquid", 1, 4.6),
        ("Pear Protocol", 4, 4.6),
        ("LI.FI", 7, 4.6),
        ("Salt", 10, 4.6),
    ]

    for name, x, y in externals:
        box = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE,
                                       Inches(x), Inches(y),
                                       Inches(2.5), Inches(0.6))
        box.fill.solid()
        box.fill.fore_color.rgb = YELLOW
        box.line.fill.background()

        tf = box.text_frame
        p = tf.paragraphs[0]
        p.text = name
        p.font.size = Pt(14)
        p.font.color.rgb = BLACK
        p.font.bold = True
        p.alignment = PP_ALIGN.CENTER

    # Tech stack summary
    add_text_box(slide7, 0.5, 5.5, 12.333, 0.4, "Tech Stack",
                 font_size=20, font_color=GRAY)

    stack = "TypeScript • Turborepo • Fastify • Supabase • Anthropic Claude • Viem/Wagmi • pnpm"
    add_text_box(slide7, 0.5, 6, 12.333, 0.4, stack,
                 font_size=16, font_color=WHITE, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 8: Demo Flow
    # =========================================================================
    slide8 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide8)

    add_text_box(slide8, 0.5, 0.3, 12.333, 0.8, "Demo Flow",
                 font_size=44, font_color=WHITE, bold=True)

    add_text_box(slide8, 0.5, 1, 12.333, 0.5,
                 "End-to-end: Onboard → Trade → Automate",
                 font_size=20, font_color=YELLOW, italic=True)

    demo_steps = [
        ("1", "ONBOARD", "User bridges USDC from Arbitrum to HyperEVM via LI.FI", "LIFI"),
        ("2", "CONNECT", "Connect wallet, funds auto-deposit to trading account", "LIFI"),
        ("3", "THESIS", 'Enter thesis: "AI will outperform ETH this month"', "PEAR"),
        ("4", "TRADE", "AI suggests pair trade, user confirms with bet-slip UI", "PEAR"),
        ("5", "EXECUTE", "Trade executes via Pear Protocol on Hyperliquid", "PEAR"),
        ("6", "AUTOMATE", "Enable robo manager with risk policies", "SALT"),
    ]

    y_pos = 1.7
    for num, title, desc, bounty in demo_steps:
        # Step number circle
        circle = slide8.shapes.add_shape(MSO_SHAPE.OVAL,
                                          Inches(0.6), Inches(y_pos),
                                          Inches(0.5), Inches(0.5))
        circle.fill.solid()
        circle.fill.fore_color.rgb = YELLOW
        circle.line.fill.background()

        tf = circle.text_frame
        p = tf.paragraphs[0]
        p.text = num
        p.font.size = Pt(18)
        p.font.color.rgb = BLACK
        p.font.bold = True
        p.alignment = PP_ALIGN.CENTER

        # Title and description
        add_text_box(slide8, 1.3, y_pos - 0.05, 2, 0.5, title,
                     font_size=18, font_color=YELLOW, bold=True)
        add_text_box(slide8, 3.5, y_pos, 7.5, 0.5, desc,
                     font_size=16, font_color=WHITE)

        # Bounty badge
        add_bounty_badge(slide8, 11.5, y_pos + 0.05, bounty)

        y_pos += 0.85

    # =========================================================================
    # SLIDE 9: Bounty Checklist
    # =========================================================================
    slide9 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide9)

    add_text_box(slide9, 0.5, 0.3, 12.333, 0.8, "Bounty Requirements",
                 font_size=40, font_color=WHITE, bold=True)

    add_text_box(slide9, 0.5, 1, 12.333, 0.4, "All acceptance criteria satisfied",
                 font_size=18, font_color=YELLOW, italic=True)

    # Three columns
    bounty_checks = [
        ("PEAR", [
            "✓ Trade UI starts from ideas/themes",
            "✓ Pair + basket trades wired live",
            "✓ Narrative metadata logged",
            "✓ Bet-slip UX design",
            "✓ Automation routes to pear-service"
        ]),
        ("LIFI", [
            "✓ lifi-service endpoints exposed",
            "✓ Composable deposit component",
            "✓ Quote, ETA, route shown",
            "✓ Progress & error states",
            "✓ Mobile responsive"
        ]),
        ("SALT", [
            "✓ Account/policy endpoints",
            "✓ Strategy loop runs periodically",
            "✓ Policy limits enforced",
            "✓ Frontend shows all state",
            "✓ Non-custodial design"
        ])
    ]

    x_positions = [0.5, 4.7, 8.9]
    for i, (bounty, checks) in enumerate(bounty_checks):
        add_bounty_badge(slide9, x_positions[i], 1.5, bounty)

        y = 2.1
        for check in checks:
            add_text_box(slide9, x_positions[i], y, 4, 0.4, check,
                         font_size=14, font_color=WHITE)
            y += 0.5

    # Bottom summary
    add_text_box(slide9, 0.5, 5.8, 12.333, 1,
                 "TAGO Leap delivers on ALL THREE bounties with a cohesive, production-ready platform",
                 font_size=20, font_color=WHITE, bold=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 10: Why TAGO Leap Wins
    # =========================================================================
    slide10 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide10)

    add_text_box(slide10, 0.5, 0.3, 12.333, 0.8, "Why TAGO Leap",
                 font_size=44, font_color=WHITE, bold=True)

    differentiators = [
        ("Innovation", "First narrative trading platform on Hyperliquid"),
        ("Integration", "Seamlessly combines PEAR + LIFI + SALT"),
        ("User Experience", "Bet-slip simplicity, not trading terminal complexity"),
        ("Safety", "Non-custodial robo managers with policy enforcement"),
        ("Accessibility", "One-click onboarding from any blockchain"),
        ("Production Ready", "Clean architecture, full documentation")
    ]

    y = 1.3
    for title, desc in differentiators:
        # Yellow marker
        marker = slide10.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                           Inches(0.5), Inches(y + 0.1),
                                           Inches(0.1), Inches(0.5))
        marker.fill.solid()
        marker.fill.fore_color.rgb = YELLOW
        marker.line.fill.background()

        add_text_box(slide10, 0.8, y, 4, 0.5, title,
                     font_size=22, font_color=YELLOW, bold=True)
        add_text_box(slide10, 5, y + 0.05, 8, 0.5, desc,
                     font_size=18, font_color=WHITE)
        y += 0.85

    # Quote
    add_text_box(slide10, 0.5, 6.3, 12.333, 0.8,
                 '"Trade ideas, not just single tokens" - Pear Protocol Vision',
                 font_size=18, font_color=GRAY, italic=True, align=PP_ALIGN.CENTER)

    # =========================================================================
    # SLIDE 11: Call to Action
    # =========================================================================
    slide11 = prs.slides.add_slide(prs.slide_layouts[6])
    set_slide_background(slide11)

    # Yellow border frame
    top_border = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                           Inches(0.5), Inches(0.3),
                                           Inches(12.333), Inches(0.05))
    top_border.fill.solid()
    top_border.fill.fore_color.rgb = YELLOW
    top_border.line.fill.background()

    add_text_box(slide11, 0.5, 1.5, 12.333, 1, "TAGO",
                 font_size=96, font_color=WHITE, bold=True, align=PP_ALIGN.CENTER)

    add_text_box(slide11, 0.5, 2.9, 12.333, 0.8, "LEAP",
                 font_size=72, font_color=YELLOW, bold=True, italic=True, align=PP_ALIGN.CENTER)

    add_text_box(slide11, 0.5, 4.2, 12.333, 0.6,
                 "The future of narrative trading is here.",
                 font_size=28, font_color=WHITE, italic=True, align=PP_ALIGN.CENTER)

    # Three bounty achievements
    add_yellow_accent_box(slide11, 2.5, 5.2, 2.5, 0.8, "PEAR", "Trade Ideas")
    add_yellow_accent_box(slide11, 5.5, 5.2, 2.5, 0.8, "LIFI", "1-Click Onboard")
    add_yellow_accent_box(slide11, 8.5, 5.2, 2.5, 0.8, "SALT", "Robo Managers")

    add_text_box(slide11, 0.5, 6.4, 12.333, 0.5,
                 "Thank you!",
                 font_size=32, font_color=WHITE, bold=True, align=PP_ALIGN.CENTER)

    # Bottom border
    bottom_border = slide11.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                              Inches(0.5), Inches(7.15),
                                              Inches(12.333), Inches(0.05))
    bottom_border.fill.solid()
    bottom_border.fill.fore_color.rgb = YELLOW
    bottom_border.line.fill.background()

    # =========================================================================
    # Save the presentation
    # =========================================================================
    output_path = "/Users/kevinapetrei/hyperstack/TAGO_Leap_Pitch_Deck.pptx"
    prs.save(output_path)
    print(f"Presentation saved to: {output_path}")
    return output_path

if __name__ == "__main__":
    create_presentation()
