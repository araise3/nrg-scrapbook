"""Download a frozen NRG event selection via Flickr itself.

Uses Flickr's native photo_download.gne Original links, not gallery-dl.
Selection provenance/expected dimensions are in .local/nrg-event-photos.
"""
import argparse
import concurrent.futures
import json
import re
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.local/nrg-event-photos'
DESTINATION = Path('D:/Bilder/NRG')
LOCK = threading.Lock()
STOP = threading.Event()
COUNTS = {'downloaded':0, 'existing':0, 'failed':0}


def selected(photo, scope='2026-champs2025'):
    caption = photo['title']+' '+photo['description']
    if scope == 'stage2-2025':
        return bool(re.search(r'\b2025\b',caption) and
                    re.search(r'\bstage\s*2\b',caption,re.I))
    return bool(re.search(r'\b2026\b',caption) or
                (re.search(r'\b2025\b',caption) and
                 re.search(r'\bchampions\b',caption,re.I) and
                 re.search(r'\bparis\b',caption,re.I)))


def check_image(path, photo):
    with Image.open(path) as image:
        expected = (int(photo['width']), int(photo['height']))
        if image.size != expected:
            raise ValueError(f'Expected Original dimensions {expected}; got {image.size}')
        image.verify()


def record(photo, status, path=None, error=None):
    with LOCK:
        COUNTS[status] += 1
        entry = {'id':photo['id'],'owner':photo['owner'],'status':status}
        if path:
            entry.update(path=str(path),bytes=path.stat().st_size,
                         width=int(photo['width']),height=int(photo['height']))
        if error:
            entry['error'] = str(error)
        with (STATE/'native-download-results.jsonl').open('a',encoding='utf-8') as log:
            log.write(json.dumps(entry)+'\n')
        if error or sum(COUNTS.values()) % 20 == 0:
            print(dict(COUNTS), f"{photo['id']}: {error}" if error else '',flush=True)


def download(photo):
    if STOP.is_set():
        return
    match = re.search(r'/\d+_([a-zA-Z0-9]+)_o\.(jpg|jpeg|png)$',photo['url'])
    if not match:
        record(photo,'failed',error='Unrecognized Original URL; no smaller substitute')
        return
    original_secret, extension = match.groups()
    target = DESTINATION/f'flickr_{photo["id"]}.{extension}'
    if target.exists():
        try:
            check_image(target,photo)
            record(photo,'existing',target)
        except Exception as error:
            record(photo,'failed',error=f'Existing file preserved: {error}')
        return
    partial = DESTINATION/f'.flickr_{photo["id"]}.{extension}.part'
    query = urllib.parse.urlencode({'id':photo['id'],'secret':original_secret,
                                   'size':'o','source':'photoPageEngagement'})
    url = 'https://www.flickr.com/photo_download.gne?'+query
    for attempt in range(3):
        if STOP.is_set():
            return
        try:
            time.sleep(1)
            start = partial.stat().st_size if partial.exists() else 0
            headers = {'User-Agent':'Mozilla/5.0','Referer':photo['page']}
            if start:
                headers['Range'] = f'bytes={start}-'
            request = urllib.request.Request(url,headers=headers)
            with urllib.request.urlopen(request,timeout=45) as response:
                if not response.headers.get('Content-Type','').startswith('image/'):
                    raise ValueError('Flickr did not return an image')
                resume = start and response.status == 206
                with partial.open('ab' if resume else 'wb') as output:
                    while chunk := response.read(1024*1024):
                        output.write(chunk)
            check_image(partial,photo)
            # Preserve any existing file if another downloader created it.
            if target.exists():
                check_image(target,photo)
                partial.unlink()
                record(photo,'existing',target)
            else:
                partial.rename(target)
                record(photo,'downloaded',target)
            return
        except urllib.error.HTTPError as error:
            if error.code == 429:
                delay = max(300,int(error.headers.get('Retry-After','300')))
                print(f'{photo["owner"]}: Flickr 429; waiting {delay}s (attempt {attempt+1}/3)',flush=True)
                if attempt < 2:
                    STOP.wait(delay)
                    continue
                STOP.set()
            elif 500 <= error.code < 600 and attempt < 2:
                STOP.wait(10*(attempt+1))
                continue
            record(photo,'failed',error=f'HTTP {error.code}')
            return
        except Exception as error:
            if attempt < 2:
                STOP.wait(10*(attempt+1))
                continue
            record(photo,'failed',error=error)
            return


def main():
    global STATE
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--scope', choices=('2026-champs2025', 'stage2-2025'),
                        default='2026-champs2025')
    args = parser.parse_args()
    if args.scope == 'stage2-2025':
        STATE = ROOT / '.local/nrg-stage2-2025'
    photos = json.loads((STATE/'selected-inventory.json').read_text(encoding='utf-8'))
    assert DESTINATION.is_dir()
    assert len({p['id'] for p in photos}) == len(photos)
    assert all(selected(p, args.scope) and p['owner'] in ('valorantesports','vctamericas')
               and re.search(r'\bnrg\b', ' '.join((p['title'], p['description'], ' '.join(p['tags']))), re.I)
               for p in photos)
    print(f'{len(photos)} selected NRG Originals -> {DESTINATION}',flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        list(pool.map(download,photos))
    result = dict(COUNTS,target=len(photos),stopped=STOP.is_set())
    (STATE/'native-download-summary.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(result,flush=True)
    return 1 if COUNTS['failed'] or STOP.is_set() else 0


if __name__ == '__main__':
    raise SystemExit(main())
