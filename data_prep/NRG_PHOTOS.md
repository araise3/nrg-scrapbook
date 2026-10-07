# NRG Flickr originals

## Riot event archives: 2026 and Champions Paris 2025

The current bulk collection goes directly into `D:/Bilder/NRG`. The frozen
inventory in `.local/nrg-event-photos/selected-inventory.json` contains 1,778
NRG photos: 1,072 from `valorantesports` and 706 from `vctamericas`.
Selection uses the public title and description: 2026, or 2025 with both
Champions and Paris. Some titles omit the year, so captions are necessary.
Each record retains its photo-page URL, caption, Original URL and dimensions.

Run or resume with Python and Pillow installed:

```powershell
python data_prep/download_nrg_flickr_originals.py
```

This downloads through Flickr's native `photo_download.gne` Original link,
the same link exposed by the photo page's download menu. It does not run
gallery-dl to transfer images. Two workers verify file integrity and exact
Original dimensions before renaming their temporary files. Existing final
files are verified and preserved; no reduced-resolution substitute is used.
HTTP 429 respects Flickr's cooldown. Interrupted native transfers can resume
from `.flickr_ID.jpg.part`; inventories and completion logs stay gitignored.

`download_nrg_event_photos.py` is an inventory-only helper using the public
Flickr metadata adapter. It does not download pictures. The native downloader
uses the saved inventory and does not require gallery-dl.

Completed on 2026-10-07: all 1,778 selected Originals are saved and fully decoded,
totaling 13,733,927,133 bytes (1,072 `valorantesports`, 706 `vctamericas`). All 554
pre-existing photo IDs remain present. The first native batch stopped on HTTP 429;
the later retry downloaded all 753 missing photos without failures using Flickr's
own download links. No gallery-dl image transfers were used for that retry.
Final verification checks exact source dimensions and full image decoding,
reusing earlier decode results only for files with unchanged size and modification
time. There are no missing/corrupt selected files or native partials. The remaining
inventory is empty. The resume command still verifies/skips completed originals.

## Stage 2 2025 extension

The Stage 2 2025 selection contains 450 NRG Originals from `vctamericas`,
covering regular season, playoffs and the grand final. Each selected event title
explicitly identifies 2025 Stage 2. There are no matches in `valorantesports`'s
previously collected complete public NRG inventory. No gallery-dl process is
needed to use the saved metadata or transfer images.

```powershell
python data_prep/download_nrg_flickr_originals.py --scope stage2-2025
```

Selection, resume logs and verification live in `.local/nrg-stage2-2025/`,
separate from the completed 2026/Champions 2025 collection. Images go into the
same `D:/Bilder/NRG` folder, with existing originals verified and preserved.

Completed on 2026-10-07: all 450 additional Originals are saved, totaling
3,121,534,199 bytes. The first batch saved 186 before a rate limit; the retry
downloaded the remaining 264 through Flickr's native links without failures.
Every original passed source-dimension and full-image decoding checks. All
2,332 previous collection IDs remain present, and there are no native partials.

## Earlier NRG-owned album collection

Run `python data_prep/download_nrg_photos.py` with `gallery-dl` installed and
network access. The script reads the public NRG album listing and downloads
only albums labelled VALORANT, excluding Rocket League.

It extracts Flickr photo IDs from the image filenames in `D:/Bilder/NRG` and
excludes those IDs before any image transfer. That earlier script treats the folder as read only. It
requests Flickr's **Original** size, preserves the source extension and uses
Flickr's original source URL; it does not substitute smaller images when an
original is unavailable.

Files are saved under `.local/nrg-flickr/originals/`, outside the public site
assets and ignored by Git. Each original has a JSON sidecar containing its
Flickr ID, original dimensions, source URL and album. The inventory in
`.local/nrg-flickr/download-inventory.json` records the exact exclusions.

Two workers use disjoint photo ranges and separate download archives. A
rerun skips completed files and resumes partial transfers. Config, cookies and
personal Flickr credentials are not loaded. Gallery-dl's normal TLS checks
remain enabled. HTTP 429 responses use a five-minute backoff.
