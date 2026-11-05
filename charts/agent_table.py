"""Side-by-side per-agent breakdown for two players."""
from matplotlib.patches import Rectangle

import stats
from theme import COL, Canvas, agent_icon

PANELS = (80, 1040)  # left x of each panel
PANEL_W = 880
ROW_TOP, ROW_BOTTOM, ROW_STEP = 449, 990, 67


def build(buckets, player):
    mine = [b for b in buckets if b["p"] == player]
    sums = stats.sum_by(mine, lambda b: b["ag"])
    return sorted(({"agent": a, **s} for a, s in sums.items()), key=lambda r: (-r["maps"], -r["rnd"]))


def render(players, tables, accent, cols, out, title, footer, brand=None, min_maps=10,
           focus_agent=None, role=None, max_rows=None):
    cv = Canvas()
    cv.header(brand, title)

    nrows = max(len(t) for t in tables)
    if max_rows:
        nrows = min(nrows, max_rows)
    step = min(ROW_STEP, (ROW_BOTTOM - ROW_TOP) / max(nrows - 1, 1))
    max_maps = max((r["maps"] for t in tables for r in t), default=1)
    if focus_agent is None and tables[0] and all(t for t in tables):
        top = tables[0][0]["agent"]
        if all(any(r["agent"] == top for r in t) for t in tables):
            focus_agent = top

    for px, player, rows in zip(PANELS, players, tables):
        color = COL["accent"] if player == accent else COL["text"]
        bar_color = COL["accent"] if player == accent else "#d6d9de"
        cv.text(px, 322, player, 40, color, "bold")

        maps = sum(r["maps"] for r in rows)
        noun = f"{role.lower()}s" if role else "agents"
        n = sum(1 for r in rows if not role or stats.ROLES.get(r["agent"]) == role)
        pill = f"{n} {noun[:-1] if n == 1 else noun}, {maps} map{'s' if maps != 1 else ''}"
        pw = cv.width(pill, 30, mono=True) + 64
        cv.rounded_rect(px + PANEL_W - pw, 288, pw, 50, 6, edge="#3a3f46", lw_px=2)
        cv.text(px + PANEL_W - pw / 2, 309, pill, 30, COL["soft"], mono=True, ha="center", va="center_baseline")

        bar_x = px + 250
        col_right = [px + PANEL_W - 18 - (len(cols) - 1 - i) * 150 for i in range(len(cols))]
        cv.text(bar_x, 388, "Maps", 28, COL["muted"])
        for c, xr in zip(cols, col_right):
            cv.text(xr, 388, stats.metric(c)[1], 28, COL["muted"], ha="right")

        for i, r in enumerate(rows[:nrows]):
            y = ROW_TOP + i * step
            grey = r["maps"] < min_maps
            focus = r["agent"] == focus_agent
            if focus:
                cv.rounded_rect(px, y - 32, PANEL_W, 64, 10, face=COL["row"], zorder=1)
            icon = agent_icon(r["agent"])
            if icon:
                cv.image(icon, px + 10, y - 27, 54, radius=8)
            name = stats.AGENT_DISPLAY.get(r["agent"], r["agent"])
            cv.text(px + 83, y, name, 34, COL["text"], "bold" if focus else "regular", va="center_baseline")

            bw = max(4, 125 * r["maps"] / max_maps)
            cv.ax.add_patch(Rectangle((bar_x, y - 13), bw, 26, facecolor=bar_color, edgecolor="none", zorder=2))
            cv.text(bar_x + bw + 12, y, str(r["maps"]), 32, COL["muted"] if grey else COL["soft"],
                    va="center_baseline")

            for c, xr in zip(cols, col_right):
                v = stats.fmt_value(c, stats.metric(c)[3](r))
                cv.text(xr, y - 4, v, 34, COL["dim"] if grey else COL["text"], mono=True, ha="right",
                        va="center_baseline")

    cv.footer(footer)
    cv.save(out)
