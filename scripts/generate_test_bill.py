"""
Generate a realistic City of Cape Town municipal bill PDF
with deliberate billing errors for end-to-end testing.

Usage: python scripts/generate_test_bill.py
Output: scripts/test-bill.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
import os

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "test-bill.pdf")

# City of Cape Town brand colours
CCT_BLUE = HexColor("#003B71")
CCT_LIGHT_BLUE = HexColor("#E8F0FE")
CCT_GREY = HexColor("#F5F5F5")
CCT_RED = HexColor("#CC0000")
CCT_GREEN = HexColor("#006633")
DARK_GREY = HexColor("#333333")
MED_GREY = HexColor("#666666")
LIGHT_LINE = HexColor("#CCCCCC")


def draw_header(c, width, y):
    """City of Cape Town header area."""
    # Blue header bar
    c.setFillColor(CCT_BLUE)
    c.rect(0, y - 25*mm, width, 25*mm, fill=1, stroke=0)

    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(15*mm, y - 10*mm, "CITY OF CAPE TOWN")
    c.setFont("Helvetica", 9)
    c.drawString(15*mm, y - 16*mm, "STAD KAAPSTAD  •  ISIXEKO SASEKAPA")
    c.setFont("Helvetica-Bold", 12)
    c.drawRightString(width - 15*mm, y - 10*mm, "TAX INVOICE")
    c.setFont("Helvetica", 9)
    c.drawRightString(width - 15*mm, y - 16*mm, "VAT Reg: 4500105459")

    return y - 30*mm


def draw_account_details(c, width, y):
    """Account holder and bill details."""
    c.setFillColor(CCT_LIGHT_BLUE)
    c.rect(10*mm, y - 42*mm, width - 20*mm, 40*mm, fill=1, stroke=0)

    x_left = 15*mm
    x_right = width / 2 + 10*mm
    top = y - 5*mm

    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x_left, top, "ACCOUNT HOLDER")
    c.setFont("Helvetica", 9)
    c.drawString(x_left, top - 5*mm, "JASON THWAITS & PAULINA GONCALVES")
    c.drawString(x_left, top - 10*mm, "11 WATSON WALK")
    c.drawString(x_left, top - 15*mm, "TOKAI")
    c.drawString(x_left, top - 20*mm, "7945")

    c.setFont("Helvetica-Bold", 8)
    c.drawString(x_right, top, "ACCOUNT DETAILS")

    details = [
        ("Account Number:", "223740405"),
        ("Invoice Number:", "ISU260007941498"),
        ("Invoice Date:", "28 March 2026"),
        ("Billing Period:", "01 Mar 2026 - 31 Mar 2026"),
        ("Payment Due:", "28 April 2026"),
        ("Property Ref:", "ERF 12847 TOKAI"),
    ]

    c.setFont("Helvetica", 8)
    for i, (label, value) in enumerate(details):
        row_y = top - (5*mm) * (i + 1) + 3*mm
        c.setFont("Helvetica", 7.5)
        c.drawString(x_right, row_y, label)
        c.setFont("Helvetica-Bold", 8)
        c.drawString(x_right + 35*mm, row_y, value)

    return y - 48*mm


def draw_previous_balance(c, width, y):
    """Previous balance and payments section."""
    x_left = 15*mm

    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(x_left, y, "ACCOUNT SUMMARY")

    y -= 6*mm
    c.setStrokeColor(LIGHT_LINE)
    c.line(x_left, y + 1*mm, width - 15*mm, y + 1*mm)

    rows = [
        ("Previous Balance", "R4,215.83"),
        ("Payment Received 15/03/2026 — Thank You", "R4,215.83-"),
        ("Balance Brought Forward", "R0.00"),
    ]

    c.setFont("Helvetica", 8)
    for label, amount in rows:
        c.setFillColor(DARK_GREY)
        c.drawString(x_left, y - 3*mm, label)
        if "-" in amount:
            c.setFillColor(CCT_GREEN)
        c.drawRightString(width - 15*mm, y - 3*mm, amount)
        y -= 5*mm

    c.setStrokeColor(LIGHT_LINE)
    c.line(x_left, y + 1*mm, width - 15*mm, y + 1*mm)

    return y - 4*mm


def draw_line_item(c, width, y, description, amount, bold=False, indent=0, sub="", red=False):
    """Draw a single line item."""
    x_left = 15*mm + indent*mm
    font = "Helvetica-Bold" if bold else "Helvetica"
    size = 8.5 if bold else 8

    c.setFont(font, size)
    if red:
        c.setFillColor(CCT_RED)
    else:
        c.setFillColor(DARK_GREY)
    c.drawString(x_left, y, description)

    if sub:
        c.setFont("Helvetica", 7)
        c.setFillColor(MED_GREY)
        c.drawString(x_left + 2*mm, y - 4*mm, sub)

    if amount:
        c.setFont(font, size)
        if red:
            c.setFillColor(CCT_RED)
        else:
            c.setFillColor(DARK_GREY)
        c.drawRightString(width - 15*mm, y, amount)

    return y - (8*mm if sub else 5*mm)


def draw_section_header(c, width, y, title):
    """Draw a section header bar."""
    c.setFillColor(CCT_GREY)
    c.rect(10*mm, y - 1*mm, width - 20*mm, 5.5*mm, fill=1, stroke=0)
    c.setFillColor(CCT_BLUE)
    c.setFont("Helvetica-Bold", 8.5)
    c.drawString(15*mm, y + 0.5*mm, title)
    return y - 7*mm


def draw_charges(c, width, y):
    """All charge line items."""

    # ===== PROPERTY RATES (ERROR: wrong valuation) =====
    y = draw_section_header(c, width, y, "PROPERTY RATES")
    y = draw_line_item(c, width, y,
        "Rates — Residential",
        "R3,144.67",
        sub="Municipal valuation: R5,200,000 @ 0.0071590 ÷ 365 x 31 days")
    y = draw_line_item(c, width, y, "Rates Rebate", "R285.00-", indent=3)
    y = draw_line_item(c, width, y, "Property Rates Total", "R2,859.67", bold=True)
    y -= 3*mm

    # ===== WATER (ERROR: estimated, wildly inflated) =====
    y = draw_section_header(c, width, y, "WATER")
    y = draw_line_item(c, width, y,
        "Water Consumption (Estimated Reading — 31 days)",
        "R1,015.20",
        sub="Previous: 24,510   Current: 24,558 (est)   Consumption: 48.000 kl @ R21.15")
    y = draw_line_item(c, width, y, "Fixed Basic Charge", "R214.89", indent=3)
    y = draw_line_item(c, width, y, "Water Total", "R1,230.09", bold=True)
    y -= 3*mm

    # ===== REFUSE (correct) =====
    y = draw_section_header(c, width, y, "REFUSE REMOVAL")
    y = draw_line_item(c, width, y, "Refuse — Residential Standard", "R178.52")
    y -= 3*mm

    # ===== SEWERAGE (ERROR: inflated based on water estimate) =====
    y = draw_section_header(c, width, y, "SEWERAGE")
    y = draw_line_item(c, width, y,
        "Sewerage Disposal",
        "R713.66",
        sub="Disposal: 33.600 kl @ R21.24 (70% of metered water consumption)")
    y = draw_line_item(c, width, y, "Fixed Basic Charge", "R154.32", indent=3)
    y = draw_line_item(c, width, y, "Sewerage Total", "R867.98", bold=True)
    y -= 3*mm

    # ===== ELECTRICITY (correct — Home User charge) =====
    y = draw_section_header(c, width, y, "ELECTRICITY")
    y = draw_line_item(c, width, y,
        "Electricity Home User Service Charge",
        "R339.89",
        sub="Fixed monthly charge — Prepaid meter residential (property value > R1m)")
    y -= 3*mm

    # ===== CITY-WIDE CLEANING (correct) =====
    y = draw_section_header(c, width, y, "CITY-WIDE CLEANING")
    y = draw_line_item(c, width, y, "City-Wide Cleaning Charge", "R272.70")
    y -= 3*mm

    # ===== SUNDRY CHARGES (ERROR: unexplained) =====
    y = draw_section_header(c, width, y, "SUNDRY CHARGES")
    y = draw_line_item(c, width, y,
        "Miscellaneous adjustment — 03.2026",
        "R750.00",
        sub="(No description provided)")
    y -= 3*mm

    return y


def draw_totals(c, width, y):
    """VAT and total due."""
    c.setStrokeColor(LIGHT_LINE)
    c.line(15*mm, y + 2*mm, width - 15*mm, y + 2*mm)

    # Subtotal
    y = draw_line_item(c, width, y, "Subtotal (excl. VAT)", "R5,917.07", bold=True)

    # VAT
    y = draw_line_item(c, width, y, "VAT @ 15%", "R887.56")

    y -= 2*mm
    c.setStrokeColor(CCT_BLUE)
    c.setLineWidth(1.5)
    c.line(15*mm, y + 2*mm, width - 15*mm, y + 2*mm)
    c.setLineWidth(0.5)

    # Total
    c.setFillColor(CCT_BLUE)
    c.setFont("Helvetica-Bold", 14)
    c.drawString(15*mm, y - 3*mm, "TOTAL AMOUNT DUE")
    c.drawRightString(width - 15*mm, y - 3*mm, "R6,804.63")
    y -= 10*mm

    # Due date warning
    c.setFillColor(CCT_RED)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(width / 2, y, "PAYMENT DUE BY: 28 APRIL 2026")

    return y - 8*mm


def draw_meter_info(c, width, y):
    """Meter reading and historical consumption note."""
    c.setFillColor(CCT_GREY)
    c.rect(10*mm, y - 28*mm, width - 20*mm, 27*mm, fill=1, stroke=0)

    x = 15*mm
    top = y - 3*mm

    c.setFillColor(DARK_GREY)
    c.setFont("Helvetica-Bold", 8)
    c.drawString(x, top, "METER & CONSUMPTION INFORMATION")

    c.setFont("Helvetica", 7.5)
    info = [
        "Water Meter: WM4428891  |  Reading Type: ESTIMATED  |  Period: 31 days",
        "Previous Actual Reading (28 Feb 2026): 24,510 kl  |  Current Estimated: 24,558 kl",
        "Average Monthly Consumption (last 12 months actual): 8.200 kl",
        "Current Estimated Consumption: 48.000 kl — 485% ABOVE 12-MONTH AVERAGE",
        "",
        "Note: This reading is estimated. Your next scheduled actual reading is April 2026.",
        "If you believe this reading is incorrect, please submit a dispute within 90 days.",
    ]

    for i, line in enumerate(info):
        row_y = top - (3.5*mm) * (i + 1)
        if "485%" in line or "ABOVE" in line:
            c.setFillColor(CCT_RED)
            c.setFont("Helvetica-Bold", 7.5)
        else:
            c.setFillColor(MED_GREY)
            c.setFont("Helvetica", 7.5)
        c.drawString(x, row_y, line)

    return y - 33*mm


def draw_footer(c, width, y):
    """Footer with contact details."""
    c.setStrokeColor(LIGHT_LINE)
    c.line(10*mm, y, width - 10*mm, y)
    y -= 5*mm

    c.setFillColor(MED_GREY)
    c.setFont("Helvetica", 6.5)
    lines = [
        "City of Cape Town  |  Civic Centre, 12 Hertzog Blvd, Cape Town  |  Tel: 0860 103 089  |  www.capetown.gov.za",
        "Dispute queries: revenue@capetown.gov.za  |  Hours: Mon-Fri 07:30-16:00  |  Account: 223740405",
        "This document was generated for testing purposes only and is not a valid tax invoice.",
    ]
    for i, line in enumerate(lines):
        c.drawCentredString(width / 2, y - i * 3.5*mm, line)


def generate_bill():
    """Main bill generation function."""
    width, height = A4
    c = canvas.Canvas(OUTPUT_PATH, pagesize=A4)
    c.setTitle("City of Cape Town Tax Invoice - ISU260007941498")
    c.setAuthor("City of Cape Town")

    y = height

    # Draw all sections
    y = draw_header(c, width, y)
    y = draw_account_details(c, width, y)
    y -= 5*mm
    y = draw_previous_balance(c, width, y)
    y -= 3*mm
    y = draw_charges(c, width, y)
    y = draw_totals(c, width, y)
    y -= 3*mm
    y = draw_meter_info(c, width, y)
    draw_footer(c, width, y - 5*mm)

    c.save()
    print(f"✅ Test bill generated: {OUTPUT_PATH}")
    print(f"   Size: {os.path.getsize(OUTPUT_PATH)} bytes")
    print(f"   Errors planted: 4")
    print(f"     1. Water — estimated reading 485% above average")
    print(f"     2. Property Rates — wrong valuation (R5.2m vs R4.7m)")
    print(f"     3. Sundry — unexplained R750 charge")
    print(f"     4. Sewerage — inflated based on water estimate")
    print(f"   Correct items: Refuse, Electricity HU, City cleaning, VAT")


if __name__ == "__main__":
    generate_bill()
