"""Fetch actual map splash art; build web-sized images without upscaling/sharpening.

Requires Pillow. Reads the current pool, caches untouched originals under .local,
and writes a separate artwork lookup so existing small UI icons remain unchanged.
Run: python scraper/download_map_artwork.py
"""
from pathlib import Path
from io import BytesIO
import json
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
POOL = ROOT / 'src/lib/currentMapPool.json'
CACHE = ROOT / '.local/map-artwork-originals'
OUTPUT = ROOT / 'public/map-artwork'


def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'NRG-scrapbook/1.0 (map artwork asset fetch)'})
    with urllib.request.urlopen(request, timeout=40) as response:
        return response.read()


def main():
    names = json.loads(POOL.read_text(encoding='utf-8'))['maps']
    maps = {entry['displayName']: entry for entry in json.loads(fetch('https://valorant-api.com/v1/maps'))['data']}
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for name in names:
        source = maps[name]['splash']
        original = CACHE / f'{name.lower()}.png'
        if not original.exists():
            body = fetch(source)
            with Image.open(BytesIO(body)) as check:
                if check.width < 1000 or check.height < 500:
                    raise ValueError(f'{name}: source is a thumbnail, not full-size artwork')
                check.verify()
            original.write_bytes(body)
        with Image.open(original) as image:
            image = image.convert('RGB')
            if image.width < 1000 or image.height < 500:
                raise ValueError(f'{name}: cached image is too small')
            variants = []
            for target in (640, 1280):
                width = min(target, image.width)
                height = round(image.height * width / image.width)
                resized = image.resize((width, height), Image.Resampling.LANCZOS)
                filename = f'{name.lower()}-{width}.webp'
                resized.save(OUTPUT / filename, 'WEBP', quality=92, method=6)
                variants.append((f'/map-artwork/{filename}', width, height))
            manifest[name] = {'src': variants[-1][0], 'srcSet': ', '.join(f'{path} {width}w' for path, width, _ in variants),
                              'width': variants[-1][1], 'height': variants[-1][2],
                              'source': source, 'originalWidth': image.width, 'originalHeight': image.height}
            print(f'{name}: {image.width}x{image.height} source -> {variants[-1][1]}x{variants[-1][2]} WebP', flush=True)
    (ROOT / 'src/lib/mapArtwork.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
