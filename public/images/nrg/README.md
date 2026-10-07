# NRG edition photo sources

Original photos supplied by the user from `D:\Bilder\NRG`, copied without retouching.

- `team-room.jpg`: `flickr_55445005321.jpg`
- `on-stage.jpg`: `flickr_55445171114.jpg`
- `off-duty.jpg`: `flickr_55413479407.jpg`
- `backstage.jpg`: `flickr_55414452541.jpg`
- `camera-closeup.jpg`: `flickr_55479721890.jpg`
- `corner-store.jpg`: `flickr_55413480342.jpg`

Framing, grayscale treatment, and collage details are CSS; source photos remain intact.

The supplied collage references established the abstract scrapbook direction,
including dropping the orange theme. They are retained here as references;
the live background now uses NRG's own photographs instead of their bitmap stock.

- `reference-street.jpg`: `D:/Downloads/jpg(17).jpg`
- `reference-magazine.jpg`: `D:/Downloads/jpg(18).jpg`

## NRG photo collage

`collage/` contains 12 curated WebP derivatives from the downloaded originals in
`D:/Bilder/NRG`: Champions Paris 2025, Americas Stage 2 2025, Masters Santiago
2026, and Champions Shanghai 2026. The originals remain unchanged.

Each derivative is at most 1,400 pixels on its longest edge, encoded at quality
82 without sharpening or color retouching. Together they total approximately
1.4 MB. CSS supplies grayscale, torn edges, rotation, and overlapping paper.
`collage/sources.json` records the Flickr page, original caption (including
photographer credit), event, and exported dimensions for every photograph.

To recreate this selection from the local originals and frozen download
inventories, run `python data_prep/build_nrg_collage_assets.py` from the repo root.

## Passport photographs

Individual photographs from NRG's Flickr archive, copied unchanged from the
existing user collection. Identities were checked against the labelled portraits
on [NRG's official roster page](https://nrg.gg/pages/valorant-team).
Cropping and the printed-paper treatment are CSS only.

- `passports/ethan.jpg`: [55413480317](https://www.flickr.com/photos/nrggg/55413480317/)
- `passports/skuba.jpg`: [55445005136](https://www.flickr.com/photos/nrggg/55445005136/)
- `passports/mada.jpg`: [55478337007](https://www.flickr.com/photos/nrggg/55478337007/)
- `passports/brawk.jpg`: [55445005496](https://www.flickr.com/photos/nrggg/55445005496/)
- `passports/keiko.jpg`: [55445005026](https://www.flickr.com/photos/nrggg/55445005026/)
- `passports/bonkar.jpg`: [55445005286](https://www.flickr.com/photos/nrggg/55445005286/)

The bulk original download lives in `.local/nrg-flickr/originals/` and is excluded
from Git and the deployed site. Its JSON sidecars retain source dimensions and
album provenance. See `data_prep/NRG_PHOTOS.md` for the downloader.
