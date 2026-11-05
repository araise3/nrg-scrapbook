"""Render stat graphics (2000x1125 PNG/SVG) from data/player_agents.json.

Examples:
  python charts/make_chart.py scatter --x open_rate --y open_win --role Duelist \
      --min-rounds 600 --highlight Derke --compare jawgemo \
      --title "Same rate of opening duels, {Derke wins more}" -o charts/out/opening.png

  python charts/make_chart.py agents jawgemo Derke --accent Derke \
      --title "jawgemo plays more duelists, and a lot more Neon" -o charts/out/agents.png

  python charts/make_chart.py metrics

Wrap part of a --title in {braces} to draw it in the accent colour.
"""
import argparse
import os

import stats

HERE = os.path.dirname(os.path.abspath(__file__))


def add_scope_args(p):
    p.add_argument("--from", dest="start", help="first date, YYYY-MM-DD (default: 12 months before --to)")
    p.add_argument("--to", dest="end", help="last date, YYYY-MM-DD (default: newest match in the data)")
    p.add_argument("--competition", choices=["VCT", "EWC", "all"], default="VCT",
                   help="VCT includes Masters/Champions (default: VCT)")
    p.add_argument("--region", action="append", help="restrict to a region (repeatable)")
    p.add_argument("--role", choices=["Duelist", "Initiator", "Controller", "Sentinel"],
                   help="scatter: only count maps on this role's agents; agents: what the summary pill counts")
    p.add_argument("--title", help="headline; {braced} text is drawn in the accent colour")
    p.add_argument("--brand", help="small wordmark above the title")
    p.add_argument("--footer", help="override the generated source line")
    p.add_argument("-o", "--out", help="output file (.png or .svg)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    sc = sub.add_parser("scatter", help="every qualifying player on two metrics")
    sc.add_argument("--x", default="open_rate")
    sc.add_argument("--y", default="open_win")
    sc.add_argument("--min-rounds", type=int, default=600)
    sc.add_argument("--highlight", help="player drawn large in the accent colour")
    sc.add_argument("--compare", help="player drawn large in white, joined to --highlight")
    sc.add_argument("--label", action="append", default=[], help="always label this player (repeatable)")
    sc.add_argument("--auto-labels", type=int, default=12, help="how many outliers to label automatically")
    sc.add_argument("--quadrants", help='four labels "TL|TR|BL|BR" (empty to skip one)')
    sc.add_argument("--xlim", type=float, nargs=2)
    sc.add_argument("--ylim", type=float, nargs=2)
    add_scope_args(sc)

    ag = sub.add_parser("agents", help="per-agent breakdown, two players side by side")
    ag.add_argument("players", nargs=2)
    ag.add_argument("--accent", help="which player is drawn in the accent colour (default: second)")
    ag.add_argument("--cols", default="open_rate,open_win,rating", help="comma-separated metrics, up to 4")
    ag.add_argument("--min-maps", type=int, default=10, help="grey out agents under this many maps")
    ag.add_argument("--focus-agent", help="agent row to highlight (default: first player's most played, if shared)")
    ag.add_argument("--max-rows", type=int)
    add_scope_args(ag)

    sub.add_parser("metrics", help="list available metrics")

    a = ap.parse_args()

    if a.cmd == "metrics":
        for k, (label, short, *_rest) in stats.METRICS.items():
            print(f"  {k:<10} {short:<9} {label}")
        return

    data = stats.load()
    start, end = stats.resolve_window(data, a.start, a.end)
    # scatter: --role limits which maps count; agents: every agent is listed and
    # --role only decides what the summary pill counts ("7 duelists, 109 maps")
    role_filter = a.role if a.cmd == "scatter" else None
    buckets = stats.filter_buckets(data, start, end, a.competition, a.region, role_filter)
    scope = stats.describe_scope(start, end, a.competition)

    if a.cmd == "scatter":
        import scatter
        stats.metric(a.x), stats.metric(a.y)
        hl = stats.resolve_player(data, a.highlight) if a.highlight else None
        cp = stats.resolve_player(data, a.compare) if a.compare else None
        labels = [stats.resolve_player(data, n) for n in a.label]
        rows, avg = scatter.build_rows(data, buckets, a.x, a.y, a.min_rounds)
        if len(rows) < 3:
            raise SystemExit(f"Only {len(rows)} players qualify; lower --min-rounds or widen the dates.")
        who = f"{a.role}s" if a.role else "Players"
        footer = a.footer or f"{scope} {who} with {a.min_rounds}+ rounds."
        title = a.title or f"{stats.metric(a.y)[0]} vs {stats.metric(a.x)[0].lower()}"
        quadrants = a.quadrants.split("|") if a.quadrants else None
        out = a.out or os.path.join(HERE, "out", f"scatter_{a.x}_{a.y}.png")
        scatter.render(rows, avg, a.x, a.y, out, title, footer, a.brand, hl, cp, labels,
                       a.auto_labels, quadrants, a.xlim, a.ylim)
        print(f"{len(rows)} players -> {out}")

    elif a.cmd == "agents":
        import agent_table
        players = [stats.resolve_player(data, n) for n in a.players]
        accent = stats.resolve_player(data, a.accent) if a.accent else players[1]
        cols = [c.strip() for c in a.cols.split(",") if c.strip()][:4]
        for c in cols:
            stats.metric(c)
        tables = [agent_table.build(buckets, p) for p in players]
        for p, t in zip(players, tables):
            if not t:
                print(f"warning: no maps for {p} in this scope")
        footer = a.footer or f"{scope} Greyed under {a.min_maps} maps."
        title = a.title or f"{players[0]} vs {{{players[1]}}}: agent by agent"
        out = a.out or os.path.join(HERE, "out", f"agents_{players[0]}_{players[1]}.png")
        agent_table.render(players, tables, accent, cols, out, title, footer, a.brand, a.min_maps,
                           a.focus_agent, a.role, a.max_rows)
        print(f"-> {out}")


if __name__ == "__main__":
    main()
