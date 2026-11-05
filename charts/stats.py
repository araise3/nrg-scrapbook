"""Load data/player_agents.json, filter it, and aggregate stats sum-first.

Every metric is computed from summed raw counts (kills, rounds, rating sum,
...) across whatever buckets are in scope, then divided -- never by
averaging per-bucket rates, which would weight a 10-round bucket the same as
a 200-round one.
"""
import difflib
import json
import os
from collections import defaultdict
from datetime import date, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
DATA_PATH = os.path.join(REPO, "data", "player_agents.json")

with open(os.path.join(HERE, "assets", "agent_roles.json"), encoding="utf-8") as f:
    ROLES = json.load(f)

AGENT_DISPLAY = {"Kayo": "KAY/O"}

SUM_KEYS = ["maps", "rnd", "wn", "ratS", "ratR", "acsS", "acsM", "kastS", "kastR",
            "adrS", "adrR", "hsS", "hsR", "k", "d_", "a", "fk", "fd"]


def _div(a, b):
    return a / b if b else None


# key -> (axis label, short column label, format, function of summed counts)
METRICS = {
    "open_rate": ("Opening duels taken a round", "Open/R", "{:.2f}", lambda s: _div(s["fk"] + s["fd"], s["rnd"])),
    "open_win": ("Opening duels won", "Open win", "pct", lambda s: _div(s["fk"], s["fk"] + s["fd"])),
    "fkpr": ("First kills a round", "FK/R", "{:.2f}", lambda s: _div(s["fk"], s["rnd"])),
    "fdpr": ("First deaths a round", "FD/R", "{:.2f}", lambda s: _div(s["fd"], s["rnd"])),
    "rating": ("Rating", "Rating", "{:.2f}", lambda s: _div(s["ratS"], s["ratR"])),
    "acs": ("Average combat score", "ACS", "{:.0f}", lambda s: _div(s["acsS"], s["acsM"])),
    "adr": ("Average damage a round", "ADR", "{:.0f}", lambda s: _div(s["adrS"], s["adrR"])),
    "kast": ("KAST", "KAST", "pct", lambda s: _div(s["kastS"], s["kastR"])),
    "hs": ("Headshot rate", "HS%", "pct", lambda s: _div(s["hsS"], s["hsR"])),
    "kpr": ("Kills a round", "K/R", "{:.2f}", lambda s: _div(s["k"], s["rnd"])),
    "dpr": ("Deaths a round", "D/R", "{:.2f}", lambda s: _div(s["d_"], s["rnd"])),
    "apr": ("Assists a round", "A/R", "{:.2f}", lambda s: _div(s["a"], s["rnd"])),
    "kd": ("Kills per death", "K/D", "{:.2f}", lambda s: _div(s["k"], s["d_"])),
    "map_win": ("Maps won", "Map win", "pct", lambda s: _div(s["wn"], s["maps"])),
}


def metric(key):
    if key not in METRICS:
        raise SystemExit(f"Unknown metric '{key}'. Available: {', '.join(METRICS)}")
    return METRICS[key]


def fmt_value(key, v):
    if v is None:
        return "–"
    f = METRICS[key][2]
    return f"{v * 100:.0f}%" if f == "pct" else f.format(v)


def load():
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


def resolve_window(data, start, end):
    """Default window: the 12 months ending at the newest date in the data."""
    if not end:
        end = max(b["d"] for b in data["buckets"])
    if not start:
        start = (date.fromisoformat(end) - timedelta(days=365) + timedelta(days=1)).isoformat()
    return start, end


def filter_buckets(data, start, end, competition="VCT", regions=None, role=None):
    events = data["events"]
    out = []
    for b in data["buckets"]:
        e = events.get(str(b["e"]))
        if e is None:
            continue
        if competition != "all" and e["competition"] != competition:
            continue
        if not (start <= b["d"] <= end):
            continue
        if regions and e["region"] not in regions:
            continue
        if role and ROLES.get(b["ag"]) != role:
            continue
        out.append(b)
    return out


def sum_by(buckets, key):
    acc = defaultdict(lambda: dict.fromkeys(SUM_KEYS, 0))
    for b in buckets:
        a = acc[key(b)]
        for k in SUM_KEYS:
            a[k] += b.get(k) or 0
    return dict(acc)


def resolve_player(data, name):
    players = {p.lower(): p for p in data["meta"]}
    if name.lower() in players:
        return players[name.lower()]
    close = difflib.get_close_matches(name.lower(), players, n=5, cutoff=0.6)
    hint = f" Did you mean: {', '.join(players[c] for c in close)}?" if close else ""
    raise SystemExit(f"Player '{name}' not found.{hint}")


def describe_scope(start, end, competition):
    comp = {"VCT": "VCT + Internationals", "EWC": "Esports World Cup", "all": "VCT + EWC"}[competition]
    s, e = date.fromisoformat(start), date.fromisoformat(end)
    return f"Data: VLR.gg, {comp}, {s:%b %Y} to {e:%b %Y}."
