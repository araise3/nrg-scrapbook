"""Shared look: dark 2000x1125 canvas, IBM Plex type, pixel-coordinate drawing helpers."""
import os
import re

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from matplotlib.font_manager import FontProperties  # noqa: E402
from matplotlib.patches import FancyBboxPatch  # noqa: E402
from PIL import Image, ImageDraw  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.join(HERE, "fonts")
AGENT_DIR = os.path.join(HERE, "assets", "agents")

W, H, DPI = 2000, 1125, 200

COL = {
    "bg": "#0b0d10",
    "text": "#f3f4f6",
    "soft": "#c9ccd1",   # labelled dots / secondary text
    "muted": "#9aa0a8",  # axis text, quadrant labels
    "dim": "#5f646b",    # unlabelled dots, greyed rows
    "grid": "#252a30",
    "frame": "#30353c",
    "row": "#181b20",
    "accent": "#a5c76c",
}

_WEIGHTS = {"regular": "Regular", "medium": "Medium", "semibold": "SemiBold", "bold": "Bold"}


def font(weight="regular", mono=False, size_px=30):
    if mono:
        name = "IBMPlexMono-" + ("Regular" if weight == "regular" else "Medium")
    else:
        name = "IBMPlexSans-" + _WEIGHTS[weight]
    path = os.path.join(FONT_DIR, name + ".ttf")
    if os.path.exists(path):
        fp = FontProperties(fname=path)
    else:  # fonts folder missing: fall back to system fonts
        fp = FontProperties(family="monospace" if mono else "sans-serif",
                            weight="bold" if weight in ("semibold", "bold") else "normal")
    fp.set_size(size_px * 72 / DPI)
    return fp


def px_to_pt(px):
    return px * 72 / DPI


class Canvas:
    """A full-figure axes whose data coordinates are pixels, origin top-left."""

    def __init__(self):
        self.fig = plt.figure(figsize=(W / DPI, H / DPI), dpi=DPI, facecolor=COL["bg"])
        self.ax = self.fig.add_axes([0, 0, 1, 1], zorder=10)
        self.ax.set_xlim(0, W)
        self.ax.set_ylim(H, 0)
        self.ax.axis("off")
        self.ax.patch.set_alpha(0)
        self.renderer = self.fig.canvas.get_renderer()

    # --- text -------------------------------------------------------------
    def text(self, x, y, s, size, color=COL["text"], weight="regular", mono=False,
             ha="left", va="baseline", rotation=0, zorder=5):
        return self.ax.text(x, y, s, fontproperties=font(weight, mono, size), color=color,
                            ha=ha, va=va, rotation=rotation, zorder=zorder)

    def width(self, s, size, weight="regular", mono=False):
        if not s:
            return 0.0
        t = self.text(0, 0, s, size, weight=weight, mono=mono)
        w = t.get_window_extent(self.renderer).width
        t.remove()
        return w

    def tracked(self, x, y, s, size, color, weight="semibold", tracking=3, ha="left"):
        """Letter-spaced text (for small-caps style labels)."""
        widths = [self.width(c if c != " " else "a", size, weight) * (0.55 if c == " " else 1) for c in s]
        total = sum(widths) + tracking * (len(s) - 1)
        cx = x - total if ha == "right" else x
        for c, w in zip(s, widths):
            if c != " ":
                self.text(cx, y, c, size, color, weight)
            cx += w + tracking
        return total

    def rich(self, x, y, s, size, weight="bold", color=COL["text"], accent=COL["accent"], max_width=None):
        """Text where {braced} parts are drawn in the accent colour. Shrinks to fit max_width."""
        segs = [(p[1:-1], accent) if p.startswith("{") else (p, color)
                for p in re.split(r"(\{[^}]*\})", s) if p]
        plain = "".join(t for t, _ in segs)
        while max_width and size > 20 and self.width(plain, size, weight) > max_width:
            size *= 0.96
        bar = self.width("|", size, weight)
        prefix = ""
        for t, c in segs:
            off = self.width(prefix + "|", size, weight) - bar if prefix else 0
            self.text(x + off, y, t, size, c, weight)
            prefix += t

    # --- shapes -----------------------------------------------------------
    def rounded_rect(self, x, y, w, h, r, face="none", edge="none", lw_px=0, zorder=1):
        self.ax.add_patch(FancyBboxPatch(
            (x, y), w, h, boxstyle=f"round,pad=0,rounding_size={r}",
            facecolor=face, edgecolor=edge, linewidth=px_to_pt(lw_px), zorder=zorder))

    def image(self, path, x, y, size, radius=8, zorder=4):
        im = Image.open(path).convert("RGBA").resize((size * 2, size * 2), Image.LANCZOS)
        mask = Image.new("L", im.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, im.size[0] - 1, im.size[1] - 1), radius * 2, fill=255)
        im.putalpha(Image.fromarray(np.minimum(np.array(im.getchannel("A")), np.array(mask))))
        self.ax.imshow(np.array(im), extent=(x, x + size, y + size, y), zorder=zorder, interpolation="lanczos")
        self.ax.set_xlim(0, W)
        self.ax.set_ylim(H, 0)

    # --- page furniture ---------------------------------------------------
    def header(self, brand, title):
        if brand:
            self.text(80, 98, brand, 38, COL["text"], "semibold")
        self.rich(82, 225, title, 78, max_width=W - 164)

    def footer(self, text):
        self.text(80, 1073, text, 24, COL["muted"])

    def save(self, out):
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        self.fig.savefig(out, dpi=DPI, facecolor=COL["bg"])
        plt.close(self.fig)


def agent_icon(agent):
    path = os.path.join(AGENT_DIR, agent.lower().replace("/", "") + ".png")
    return path if os.path.exists(path) else None
