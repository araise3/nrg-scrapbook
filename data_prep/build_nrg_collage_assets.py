"""Export a small curated web set from the user's downloaded NRG originals.

Requires Pillow. Run from the repository root; no network or original-file edits.
Flickr provenance comes from the frozen download inventories, not filenames alone.
"""
import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps

SELECTION = {
    'mada-shanghai': 55574547526,
    'ethan-shanghai': 55559423605,
    'skuba-shanghai': 55550384570,
    'keiko-shanghai': 55550187545,
    'ethan-city': 55549835403,
    'bonkar-s0m': 54755401351,
    's0m-brawk': 54742991585,
    'santiago-stage': 55147330626,
    'santiago-team': 55129657830,
    'paris-champions': 54834631815,
    'paris-celebration': 54834534689,
    'paris-trophy': 54834465173,
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--originals', type=Path, default=Path('D:/Bilder/NRG'))
    args = parser.parse_args()
    inventory = {}
    for path in [Path('.local/nrg-event-photos/selected-inventory.json'),
                 Path('.local/nrg-stage2-2025/selected-inventory.json')]:
        inventory.update({photo['id']: photo for photo in json.loads(path.read_text(encoding='utf-8'))})
    files = {p.stem.removeprefix('flickr_'): p for p in args.originals.rglob('*.jpg')}
    output = Path('public/images/nrg/collage')
    output.mkdir(parents=True, exist_ok=True)
    manifest = []
    for name, photo_id in SELECTION.items():
        photo = inventory[photo_id]
        with Image.open(files[str(photo_id)]) as source:
            image = ImageOps.exif_transpose(source).convert('RGB')
            image.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
            image.save(output / f'{name}.webp', quality=82, method=6)
        manifest.append({'file': f'{name}.webp', 'flickrId': photo_id,
                         'source': photo['page'], 'description': photo['description'].strip(),
                         'event': photo['title'], 'width': image.width, 'height': image.height})
    (output / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'{len(manifest)} images / {sum((output / x["file"]).stat().st_size for x in manifest):,} bytes')


if __name__ == '__main__':
    main()
