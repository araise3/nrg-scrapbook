"""Inventory NRG photos from Riot's two specified public Flickr archives.

Run using the Python environment containing gallery-dl for its public metadata
API adapter only; no cookies/config/credentials or image transfers. Download
the frozen inventory with download_nrg_flickr_originals.py via Flickr itself.
"""
import html
import json
import re
from pathlib import Path

from gallery_dl import config, extractor
from gallery_dl.extractor.flickr import FlickrAPI

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / '.local/nrg-event-photos'
DESTINATION = Path('D:/Bilder/NRG')
OWNERS = {'valorantesports':'192820496@N05', 'vctamericas':'197181792@N06'}


def in_scope(photo):
    caption = html.unescape(photo['title']+' '+photo['description'])
    return bool(re.search(r'\b2026\b', caption) or
                (re.search(r'\b2025\b', caption) and
                 re.search(r'\bchampions\b', caption, re.I) and
                 re.search(r'\bparis\b', caption, re.I)))


def inventory(alias, owner):
    saved = STATE / f'{alias}-inventory.json'
    if saved.exists():
        return json.loads(saved.read_text(encoding='utf-8'))
    extr = extractor.find(f'https://www.flickr.com/search/?user_id={owner}&text=NRG')
    extr.initialize()
    api = FlickrAPI(extr)
    photos, totals, page = {}, set(), 1
    while True:
        result = api._call('photos.search', {
            'user_id':owner, 'text':'NRG', 'per_page':500, 'page':page,
            'sort':'date-posted-desc', 'media':'photos',
            'extras':'description,tags,url_o,o_dims,date_upload',
        })['photos']
        totals.add(int(result['total']))
        if max(totals) > 4000:
            raise RuntimeError(f'{alias}: search exceeds Flickr 4000-result cap; split by date before downloading')
        for p in result['photo']:
            if p['owner'] != owner:
                raise RuntimeError('Unexpected photo owner')
            description = html.unescape(p['description']['_content'])
            if not re.search(r'\bnrg\b', ' '.join((p['title'], description, p['tags'])), re.I):
                raise RuntimeError(f"Search result {p['id']} does not identify NRG")
            photos[p['id']] = {
                'id':int(p['id']), 'owner':alias, 'title':p['title'],
                'description':description, 'tags':p['tags'].split(),
                'url':p.get('url_o'), 'width':p.get('width_o'), 'height':p.get('height_o'),
                'page':f"https://www.flickr.com/photos/{alias}/{p['id']}/",
            }
        print(f'{alias}: inventory page {page}/{result["pages"]}, {len(photos)} photos', flush=True)
        if page >= int(result['pages']):
            break
        page += 1
    if len(totals) != 1 or len(photos) != next(iter(totals)):
        raise RuntimeError(f'{alias}: archive changed during inventory; repeat for complete pagination')
    entries = list(photos.values())
    saved.write_text(json.dumps(entries, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    return entries


def main():
    if not DESTINATION.is_dir():
        raise SystemExit('The existing D:/Bilder/NRG directory is required')
    STATE.mkdir(parents=True, exist_ok=True)
    config.clear()
    config.set(('extractor','flickr'), 'videos', False)
    config.set(('extractor','flickr'), 'size-max', 'o')
    records = {alias:[p for p in inventory(alias, owner) if in_scope(p)]
               for alias, owner in OWNERS.items()}
    (STATE/'selected-inventory.json').write_text(json.dumps(
        [p for photos in records.values() for p in photos], ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    existing = set()
    for path in DESTINATION.iterdir():
        if path.is_file() and path.suffix.lower() in ('.jpg','.jpeg','.png','.webp'):
            match = re.search(r'(\d{10,})', path.stem)
            if match:
                existing.add(int(match[1]))
    all_records = [p for photos in records.values() for p in photos]
    available = [p for p in all_records if p['url']]
    missing = [p for p in available if p['id'] not in existing]
    summary = {'destination':str(DESTINATION), 'quality':'Original',
               'scope':'2026 and Champions Paris 2025 only',
               'sources':{a:len(p) for a,p in records.items()},
               'uniqueIds':len({p['id'] for p in all_records}),
               'alreadyPresent':len(available)-len(missing),
               'withoutOriginal':[p['id'] for p in all_records if not p['url']],
               'toDownload':len(missing), 'initialExistingIds':sorted(existing)}
    (STATE/'download-plan.json').write_text(json.dumps(summary, indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in summary.items() if k!='initialExistingIds'}),flush=True)
    print('Inventory ready. Download with: python data_prep/download_nrg_flickr_originals.py', flush=True)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
