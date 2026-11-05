# VCT vlr.gg scraper and data

Scrapers for [vlr.gg](https://vlr.gg) VALORANT Champions Tour (2023–2026) and
Esports World Cup (2025–2026) match data, plus the data they have already
collected. A scheduled GitHub Actions workflow keeps the current season up to date.

(This repo used to host a stats website; that has been removed. Only the
scraping pipeline and its data remain.)

## Where the data lives

- **Raw scraped data (SQLite):** the GitHub releases
  [`db-snapshot`](../../releases/tag/db-snapshot) (VCT/EWC 2026, refreshed daily),
  [`db-snapshot-2025`](../../releases/tag/db-snapshot-2025) and
  [`db-snapshot-2023-2024`](../../releases/tag/db-snapshot-2023-2024) (frozen
  past seasons). Download with
  `gh release download db-snapshot --pattern '*.db'`.
- **`data/*.json`:** aggregated exports built from those databases by
  `scraper/export_from_db.py` (player/team buckets per event and week, match
  results, per-player match rows, duels, agents, map/series lengths, events).
  The keys are abbreviated; see the comments in `export_from_db.py`.
- **`data/player_photos/`** and `data/player_photos.json`: player photos from
  vlr.gg profiles (`scraper/vlr_player_photos_scraper.py`).

## Layout

```
scraper/
  vlr_vct_scraper.py          VCT 2026 (incremental, --resume)
  vlr_ewc_scraper.py          EWC 2026
  vlr_vct_202{3,4,5}_scraper.py, vlr_ewc_2025_scraper.py   past seasons
  vlr_player_photos_scraper.py
  export_from_db.py           SQLite -> data/*.json
  export_to_csv.py            SQLite -> CSV
  *.bat                       Windows helpers (setup.bat first)
  README.md                   scraper details, schema, exit codes
data/                         exported JSON + player photos
.github/workflows/update-data.yml
```

## Running locally

```bash
pip install -r scraper/requirements.txt
python scraper/vlr_vct_scraper.py --resume
python scraper/export_from_db.py
```

Database and output paths can be overridden with `VLR_DB_PATH`,
`VLR_EWC_DB_PATH`, `VLR_VCT_2025_DB_PATH`, `VLR_EWC_2025_DB_PATH`,
`VLR_VCT_2024_DB_PATH`, `VLR_VCT_2023_DB_PATH` and `VLR_OUT`. The export refuses
to run against a missing or empty VCT database rather than writing empty JSON
over real data.

## Automated updates

`.github/workflows/update-data.yml` runs every 3 hours: restore the databases →
scrape only what is new from vlr.gg → save the databases → regenerate `data/` →
commit and push.

## How the database persists

The scraper databases are **not** in this repo — ~8MB of binary that deltas
badly would balloon history at that commit frequency. Each run restores them
from the GitHub Actions cache, scrapes what's new, and saves them back. The
cache alone is fast but not durable (entries are evicted after 7 days unused),
so a `db-snapshot` release is kept as a durable fallback, refreshed
automatically once a day and used whenever the cache comes up empty.

Nothing needs seeding by hand: if **neither** the cache nor the snapshot has a
copy — the very first run ever, or both lost at once — the workflow just
scrapes everything from scratch itself instead of failing. That run is slow
(~1300 requests, roughly an hour, vs. a handful normally), but it's the only
one — the very next run finds what it just saved and goes back to incremental.
If you'd rather skip that one slow run, upload your existing databases as the
seed before the first scheduled run fires:

```bash
gh release create db-snapshot "vlr_vct_2026.db" "vlr_ewc_2026.db" --title "Scraper DB snapshot" --notes "Seed/recovery copy for CI."
```

To force a full rewipe-and-rebuild on purpose (e.g. recovering from suspected
data corruption, not just ordinary cache loss), run the workflow via
*Actions → Update VLR data → Run workflow* with **force_full_rebuild** checked
— it discards whatever was restored and starts clean.

Exit codes carry meaning end to end: a clean run publishes and goes green; an
incomplete run still publishes the valid data it collected but the job is
marked failed so it's visible; and a run that vlr.gg refuses outright (403/429,
the expected result if the runner's datacenter IP gets blocked) aborts without
publishing anything.

## Data caveats

Known gaps in what vlr.gg publishes:

- **China-region matches** don't publish multi-kill, clutch or economy data.
- **About 21 China matches are missing Rating 2.0.** Player buckets carry a
  sparse `u` sub-object with the unrated delta so those maps can be excluded.
- **Pistol win rate** assumes exactly 2 pistol rounds per map (rounds 1 and 13).
- **Attack/defense splits are missing on 42 of 1091 (2026) maps**, all in China
  events. The scraper still writes `t`/`ct` rows filled with the map total; the
  export drops any pair that fails `t + ct == both`.
