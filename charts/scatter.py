"""Scatter of every qualifying player on two metrics, with a highlighted pair."""
import math

from matplotlib.ticker import FixedLocator, FuncFormatter

import stats
from theme import COL, H, W, Canvas, font, px_to_pt

L, R, T, B = 220, 1870, 303, 940  # plot area in canvas pixels

QUADRANT_PRESETS = {
    ("open_rate", "open_win"): ("PICKS THEM, WINS THEM", "TAKES THEM, WINS THEM",
                                "RARELY OPENS", "TAKES THEM, LOSES THEM"),
}


def _nice_axis(lo, hi, target=6):
    span = hi - lo or abs(hi) or 1
    raw = span / target
    mag = 10 ** math.floor(math.log10(raw))
    step = min((s * mag for s in (1, 2, 2.5, 5, 10)), key=lambda s: abs(span / s - target))
    # a point may sit up to a tenth of a step outside the outer ticks (on the frame)
    # rather than adding a whole empty band to the chart for it
    a = math.floor(lo / step + 0.1) * step
    b = math.ceil(hi / step - 0.1) * step
    ticks = [a + i * step for i in range(int(round((b - a) / step)) + 1)]
    return a, b, ticks


def _decimals(step):
    """Fewest decimals that print every multiple of step exactly (2.5 -> 1, 0.05 -> 2)."""
    for d in range(6):
        if abs(step * 10 ** d - round(step * 10 ** d)) < 1e-6:
            return d
    return 6


def _tick_fmt(key, step):
    if stats.METRICS[key][2] == "pct":
        decimals = _decimals(step * 100)
        return lambda v, _: f"{v * 100:.{decimals}f}%"
    decimals = _decimals(step)
    return lambda v, _: f"{v:.{decimals}f}"


def build_rows(data, buckets, xk, yk, min_rounds):
    sums = stats.sum_by(buckets, lambda b: b["p"])
    fx, fy = stats.metric(xk)[3], stats.metric(yk)[3]
    rows = []
    for p, s in sums.items():
        if s["rnd"] < min_rounds:
            continue
        x, y = fx(s), fy(s)
        if x is None or y is None:
            continue
        rows.append({"name": p, "x": x, "y": y, "rnd": s["rnd"]})
    total = {k: sum(sums[r["name"]][k] for r in rows) for k in stats.SUM_KEYS}
    return rows, (fx(total), fy(total))


def render(rows, avg, xk, yk, out, title, footer, brand=None, highlight=None, compare=None,
           labels=(), auto_labels=12, quadrants=None, xlim=None, ylim=None):
    cv = Canvas()
    cv.header(brand, title)

    xs, ys = [r["x"] for r in rows], [r["y"] for r in rows]
    x0, x1, xt = _nice_axis(*(xlim or (min(xs), max(xs))))
    y0, y1, yt = _nice_axis(*(ylim or (min(ys), max(ys))), target=4)

    ax = cv.fig.add_axes([L / W, 1 - B / H, (R - L) / W, (B - T) / H], zorder=1)
    ax.set_facecolor("none")
    ax.set_xlim(x0, x1)
    ax.set_ylim(y0, y1)
    for sp in ax.spines.values():
        sp.set_color(COL["frame"])
        sp.set_linewidth(px_to_pt(2))
    ax.xaxis.set_major_locator(FixedLocator(xt))
    ax.yaxis.set_major_locator(FixedLocator(yt))
    ax.xaxis.set_major_formatter(FuncFormatter(_tick_fmt(xk, xt[1] - xt[0])))
    ax.yaxis.set_major_formatter(FuncFormatter(_tick_fmt(yk, yt[1] - yt[0])))
    ax.tick_params(length=0, pad=px_to_pt(18), colors=COL["muted"])
    for lab in ax.get_xticklabels() + ax.get_yticklabels():
        lab.set_fontproperties(font("regular", True, 27))
    ax.grid(True, color=COL["grid"], linewidth=px_to_pt(2))
    ax.set_axisbelow(True)
    ax.axvline(avg[0], color=COL["dim"], linewidth=px_to_pt(2), dashes=(4, 3), zorder=1)
    ax.axhline(avg[1], color=COL["dim"], linewidth=px_to_pt(2), dashes=(4, 3), zorder=1)

    cv.text((L + R) / 2, 1022, stats.metric(xk)[0], 32, COL["soft"], "medium", ha="center")
    cv.text(96, (T + B) / 2, stats.metric(yk)[0], 32, COL["soft"], "medium",
            ha="center", va="center", rotation=90)

    q = quadrants or QUADRANT_PRESETS.get((xk, yk))
    placed = []  # label bounding boxes already on the chart
    if q:
        for (text, x, y, ha) in zip(q, (L + 16, R - 16, L + 16, R - 16), (T + 38, T + 38, B - 18, B - 18),
                                    ("left", "right", "left", "right")):
            if text:
                w = cv.tracked(x, y, text, 26, COL["muted"], tracking=3, ha=ha)
                bx = x if ha == "left" else x - w
                placed.append((bx - 6, y - 26, bx + w + 6, y + 8))

    # data -> canvas pixel coordinates
    def to_px(x, y):
        return L + (x - x0) / (x1 - x0) * (R - L), B - (y - y0) / (y1 - y0) * (B - T)

    for r in rows:
        r["px"] = to_px(r["x"], r["y"])

    by_name = {r["name"]: r for r in rows}
    hi = by_name.get(highlight) if highlight else None
    cmp_ = by_name.get(compare) if compare else None
    for who, flag in ((highlight, hi), (compare, cmp_)):
        if who and flag is None:
            print(f"warning: {who} is not in the filtered population (too few rounds?)")

    # choose which names to print
    named = [r for r in (hi, cmp_) if r]
    named += [by_name[n] for n in labels if n in by_name and by_name[n] not in named]
    if auto_labels:
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        sx = (sum((v - mx) ** 2 for v in xs) / len(xs)) ** 0.5 or 1
        sy = (sum((v - my) ** 2 for v in ys) / len(ys)) ** 0.5 or 1
        ranked = sorted(rows, key=lambda r: -math.hypot((r["x"] - mx) / sx, (r["y"] - my) / sy))
        added = 0
        for r in ranked:
            if added >= auto_labels:
                break
            if r in named or any(math.dist(r["px"], n["px"]) < 70 for n in named):
                continue
            named.append(r)
            added += 1

    def style(r):
        if r is hi:
            return 17, COL["accent"], 40, "bold", COL["accent"]
        if r is cmp_:
            return 17, COL["text"], 40, "bold", COL["text"]
        if r in named:
            return 8.5, COL["soft"], 30, "regular", COL["soft"]
        return 7, COL["dim"], None, None, None

    if hi and cmp_:
        cv.ax.plot([hi["px"][0], cmp_["px"][0]], [hi["px"][1], cmp_["px"][1]], color=COL["accent"],
                   linewidth=px_to_pt(3), dashes=(1, 2), zorder=2)

    order = sorted(rows, key=lambda r: (r in named, r is cmp_, r is hi))
    for r in order:
        rad, color = style(r)[:2]
        x, y = r["px"]
        cv.ax.scatter([x], [y], s=(2 * px_to_pt(rad)) ** 2, color=color,
                      edgecolors=COL["bg"], linewidths=px_to_pt(2), zorder=3 + (r in named))

    # greedy label placement, avoiding other labels and dots
    dots = [(r["px"][0] - style(r)[0], r["px"][1] - style(r)[0],
             r["px"][0] + style(r)[0], r["px"][1] + style(r)[0]) for r in rows]

    def overlap(a, b):
        return not (a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1])

    for r in named:
        rad, _, size, weight, color = style(r)
        x, y = r["px"]
        w = cv.width(r["name"], size, weight)
        h = size * 0.75
        gap = rad + 10
        cands = [  # (ha, text x, text y, bounding box) -- label left of, right of, above, below the dot
            ("right", x - gap, y, (x - gap - w, y - h / 2, x - gap, y + h / 2)),
            ("left", x + gap, y, (x + gap, y - h / 2, x + gap + w, y + h / 2)),
            ("center", x, y - gap - h / 2, (x - w / 2, y - gap - h, x + w / 2, y - gap)),
            ("center", x, y + gap + h / 2, (x - w / 2, y + gap, x + w / 2, y + gap + h)),
        ]
        if r not in (hi, cmp_):
            cands[0], cands[1] = cands[1], cands[0]

        def score(c):
            box = c[3]
            s = 1000 * (box[0] < L + 4 or box[2] > R - 4 or box[1] < T + 4 or box[3] > B - 4)
            s += 100 * sum(overlap(box, p) for p in placed)
            s += sum(overlap(box, d) for d in dots)
            return s

        ha, tx, ty, box = min(cands, key=score)
        cv.text(tx, ty, r["name"], size, color, weight, ha=ha, va="center_baseline", zorder=6)
        placed.append(box)

    cv.footer(footer)
    cv.save(out)
