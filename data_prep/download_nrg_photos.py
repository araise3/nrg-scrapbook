"""Download original NRG VALORANT photos with gallery-dl, excluding local IDs.

The bulk archive is gitignored; only selected passport photos ship.
gallery-dl must already be installed. No default configs, cookies or user
credentials are loaded. Existing D:/Bilder/NRG photos are read-only exclusions.
"""
import html
import concurrent.futures
import json
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / '.local/nrg-flickr'
SOURCE = Path('D:/Bilder/NRG')
URL = 'https://www.flickr.com/photos/nrggg/albums/'


def main():
    executable = shutil.which('gallery-dl')
    if not executable:
        raise SystemExit('gallery-dl is required. Install it from PyPI first.')
    if not SOURCE.is_dir():
        raise SystemExit('The exclusion folder is missing: ' + str(SOURCE))
    existing = set()
    for path in SOURCE.iterdir():
        if path.is_file() and path.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp'):
            match = re.search(r'(?:flickr_)?(\d{10,})', path.stem)
            if match:
                existing.add(int(match.group(1)))
    if not existing:
        raise SystemExit('No photo IDs found in the exclusion folder; refusing an unintended full redownload.')
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    request = urllib.request.Request(URL, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=40) as response:
        source = response.read().decode('utf-8')
    marker = source.index('modelExport: ') + len('modelExport: ')
    model = json.JSONDecoder().raw_decode(source[marker:])[0]['main']
    listing = model['sets-models'][0]['data']['albumsList']['data']
    if not listing.get('fetchedEnd'):
        raise SystemExit('Flickr album listing is incomplete.')
    albums, excluded = [], []
    for wrapped in listing['_data']:
        entry = wrapped['data']
        album = {'id': entry['id'], 'title': html.unescape(entry['title']), 'count': entry['photoCount']}
        if 'valorant' in album['title'].lower() and not re.search(r'rocket\s*league|\bRLCS\b', album['title'], re.I):
            albums.append(album)
        else:
            excluded.append(album)
    if not albums:
        raise SystemExit('No VALORANT albums found.')
    destination = ARCHIVE / 'originals'
    destination.mkdir(exist_ok=True)
    inventory = {'source': URL, 'tool': 'gallery-dl', 'quality': 'Original',
                 'excludedFolder': str(SOURCE), 'excludedPhotoIds': sorted(existing),
                 'albums': albums, 'excludedAlbums': excluded, 'destination': str(destination)}
    (ARCHIVE / 'download-inventory.json').write_text(json.dumps(inventory, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    expression = 'id not in ' + repr(existing) + " and label == 'Original'"
    args = [executable, '--config-ignore', '--no-colors', '--force-ipv4', '--http-timeout', '30',
            '--directory', str(destination), '--filename', 'flickr_{id}.{extension}',
            '--write-metadata', '--filter', expression,
            '-o', 'extractor.flickr.videos=false',
            '-o', 'extractor.flickr.size-max=o',
            '-o', 'downloader.http.sleep-429=300',
            '-o', 'downloader.http.retry-codes=[429]',
            *[URL + album['id'] + '/' for album in albums]]
    print(f"{len(albums)} VALORANT albums; {sum(a['count'] for a in albums)} album photos; {len(existing)} existing photo IDs excluded.", flush=True)
    print(f"Original files -> {destination}", flush=True)
    def worker(index):
        # Disjoint 1-based photo ranges avoid duplicate downloads. Keep an
        # archive per worker so concurrent jobs never lock the same SQLite DB.
        worker_args = args[:1] + ['--range', f"{index}:{max(a['count'] for a in albums)}:2", '--download-archive',
            str(ARCHIVE / f'originals-worker-{index}.sqlite3')] + args[1:]
        with (ARCHIVE / f'download-worker-{index}.log').open('w', encoding='utf-8') as log:
            result = subprocess.run(worker_args, stdout=log, stderr=subprocess.STDOUT, check=False)
        print(f'Worker {index}: exit {result.returncode}', flush=True)
        return result.returncode
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(worker, range(1, 3)))
    raise SystemExit(max(results))


if __name__ == '__main__':
    main()
