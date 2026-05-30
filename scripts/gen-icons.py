"""
Generate Lumi app icons:
- icon-light.png: lavender L+crescent on light gray
- icon-dark.png:  brighter lavender L+crescent on near-black

Design: geometric bold "L" whose vertical bar terminates in a crescent moon at the top.
The crescent is formed by subtracting a smaller offset circle from a larger one.
"""

from PIL import Image, ImageDraw

SIZE = 1024

# ── palette ──────────────────────────────────────────────────────────────────
VARIANTS = [
    {
        "out": "apps/expo/assets/icon-light.png",
        "bg":  (228, 228, 231, 255),   # #E4E4E7 zinc-200
        "fg":  (139, 126, 200, 255),   # #8B7EC8 lavender
    },
    {
        "out": "apps/expo/assets/icon-dark.png",
        "bg":  (24, 24, 27, 255),      # #18181B zinc-950
        "fg":  (168, 152, 216, 255),   # #A898D8 brighter lavender
    },
]

# ── geometry ──────────────────────────────────────────────────────────────────
BAR_W      = 128    # thickness of both L bars
STEM_X     = 272    # left edge of vertical bar  (centers L horizontally)
STEM_BOTTOM = 800
BASE_RIGHT  = 750   # right edge of horizontal bar

# The horizontal bar sits at the bottom of the stem
BASE_TOP = STEM_BOTTOM - BAR_W          # 672

# Crescent moon sits above the stem
# Big outer circle
CR_CX   = STEM_X + BAR_W // 2          # 336 – centred over stem
CR_CY   = 228
R_BIG   = 148

# The stem starts where the big circle's bottom is, so they connect seamlessly
STEM_TOP = CR_CY + R_BIG               # 376

# Small inner circle (the "bite") – offset right + slightly up
R_SMALL = 122
BITE_OX =  70     # rightward offset of bite centre from crescent centre
BITE_OY = -32     # upward offset (negative = up)

# ── builder ───────────────────────────────────────────────────────────────────
def build_icon(bg, fg):
    img = Image.new("RGBA", (SIZE, SIZE), bg)

    # — L shape —
    l_mask = Image.new("L", (SIZE, SIZE), 0)
    d = ImageDraw.Draw(l_mask)
    # vertical bar (stem)
    d.rectangle([STEM_X, STEM_TOP, STEM_X + BAR_W, STEM_BOTTOM], fill=255)
    # horizontal bar (base)
    d.rectangle([STEM_X, BASE_TOP, BASE_RIGHT, STEM_BOTTOM], fill=255)

    # round the outer bottom-right corner of the horizontal bar
    r_corner = BAR_W // 2
    d.rectangle(
        [BASE_RIGHT - r_corner, STEM_BOTTOM - r_corner, BASE_RIGHT, STEM_BOTTOM],
        fill=0
    )
    d.ellipse(
        [BASE_RIGHT - 2*r_corner, STEM_BOTTOM - 2*r_corner, BASE_RIGHT, STEM_BOTTOM],
        fill=255
    )

    # round the inner bottom-right corner of the L (inner notch)
    notch_x = STEM_X + BAR_W
    notch_y = BASE_TOP
    r_notch = r_corner
    d.rectangle(
        [notch_x, notch_y, notch_x + r_notch, notch_y + r_notch],
        fill=0
    )
    d.ellipse(
        [notch_x, notch_y, notch_x + 2*r_notch, notch_y + 2*r_notch],
        fill=255
    )

    fg_layer = Image.new("RGBA", (SIZE, SIZE), fg)
    img = Image.composite(fg_layer, img, l_mask)

    # — crescent moon —
    c_mask = Image.new("L", (SIZE, SIZE), 0)
    cd = ImageDraw.Draw(c_mask)
    # big circle
    cd.ellipse(
        [CR_CX - R_BIG, CR_CY - R_BIG, CR_CX + R_BIG, CR_CY + R_BIG],
        fill=255,
    )
    # bite (black = subtract)
    bx, by = CR_CX + BITE_OX, CR_CY + BITE_OY
    cd.ellipse(
        [bx - R_SMALL, by - R_SMALL, bx + R_SMALL, by + R_SMALL],
        fill=0,
    )

    img = Image.composite(fg_layer, img, c_mask)

    return img.convert("RGB")


# ── main ──────────────────────────────────────────────────────────────────────
import os, pathlib

root = pathlib.Path(__file__).parent.parent

for v in VARIANTS:
    icon = build_icon(v["bg"], v["fg"])
    out = root / v["out"]
    out.parent.mkdir(parents=True, exist_ok=True)
    icon.save(str(out), "PNG")
    print(f"Saved {out}")
