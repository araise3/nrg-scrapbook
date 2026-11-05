# Stat graphics

Renders 2000×1125 social-media graphics from `data/player_agents.json`: dark
background, IBM Plex type, one accent colour.

```bash
pip install -r charts/requirements.txt
python charts/make_chart.py metrics          # list the stats you can plot
```

## Scatter: every qualifying player on two stats

```bash
python charts/make_chart.py scatter --x open_rate --y open_win --role Duelist \
    --min-rounds 600 --from 2025-11-01 --to 2026-10-31 \
    --highlight Derke --compare jawgemo \
    --title "Same rate of opening duels, {Derke wins more}" -o charts/out/opening.png
```

- `--highlight` is drawn large in the accent colour, `--compare` large in white,
  joined by a dotted line.
- The dashed cross is the pooled average of everyone on the chart.
- About 12 outliers get a name automatically (`--auto-labels N`). Add names
  with `--label aspas --label zekken`.
- The four corner captions come with the opening-duel preset. Set your own with
  `--quadrants "TOP LEFT|TOP RIGHT|BOTTOM LEFT|BOTTOM RIGHT"`.
- `--role` only counts maps on that role's agents.

## Agents: two players side by side, agent by agent

```bash
python charts/make_chart.py agents jawgemo Derke --role Duelist \
    --from 2025-11-01 --to 2026-10-31 \
    --title "jawgemo plays more duelists, and a lot more Neon" -o charts/out/agents.png
```

- Lists every agent each player played; `--role` only sets what the summary
  pill counts ("7 duelists, 109 maps").
- `--cols` picks up to 4 stat columns (default `open_rate,open_win,rating`).
- Rows under `--min-maps` (default 10) are greyed out.
- The second player is the accent colour unless you pass `--accent`.
- The shared most-played agent gets a highlighted row; override with `--focus-agent`.

## Common options

| Option | Default |
|---|---|
| `--from`, `--to` | the 12 months ending at the newest match in the data |
| `--competition VCT\|EWC\|all` | `VCT` (includes Masters and Champions) |
| `--region` | all regions (repeatable) |
| `--title` | generated; wrap words in `{braces}` for the accent colour |
| `--brand` | none; small wordmark above the title |
| `--footer` | generated source line |
| `-o` | `charts/out/…png` (`.svg` works too) |

All stats are summed over the raw counts in scope before dividing, never
averaged per match.

Fonts: IBM Plex Sans and Mono (SIL Open Font License, `fonts/OFL.txt`).
Agent portraits are Riot Games assets.
