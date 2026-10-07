"""Download Liquipedia's light-background icons from the existing API cache.

The cache contains the Team template's light/dark variants and MediaWiki
imageinfo URLs. Reuse those results rather than scraping rendered wiki pages.
All-mode icons already downloaded locally are reused. Requests are paced.
"""
import argparse
import json
import re
import shutil
import sys
import time
from pathlib import Path
from urllib.parse import unquote

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scraper.liquipedia_team_logos_scraper import TEAM_NAME_MAP, thumb_url_to_filename


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--plan', action='store_true')
    args = parser.parse_args()
    cache = ROOT / 'scraper/.liquipedia_logo_cache'
    icons = {}
    urls = {}
    for file in sorted(cache.glob('teamicons*.json'), key=lambda p: p.stat().st_mtime):
        html = json.loads(file.read_text(encoding='utf-8'))['html']
        parts = re.split(r'(?=<span\b[^>]*class="team-template-team-standard")', html)
        for part in parts:
            name = re.match(r'<span\b[^>]*data-highlighting(?:-class|class)="([^"]+)"', part)
            if not name:
                continue
            light = re.search(r'lightmode"[^>]*>.*?src="([^"]+)"', part, re.S)
            single = re.search(r'team-template-image-icon"[^>]*>.*?src="([^"]+)"', part, re.S)
            dark = re.search(r'darkmode"[^>]*>.*?src="([^"]+)"', part, re.S)
            image = light or single
            if not image:
                continue
            pair = (thumb_url_to_filename(image.group(1)), thumb_url_to_filename(dark.group(1)) if dark else None)
            keys = [name.group(1)] + [unquote(x).replace('_', ' ') for x in re.findall(r'href="/valorant/([^"#]+)', part)]
            for key in keys:
                icons[key] = pair
    for file in cache.glob('imageinfo*.json'):
        for page in json.loads(file.read_text(encoding='utf-8')).get('query', {}).get('pages', {}).values():
            if page.get('imageinfo'):
                info = page['imageinfo'][0]
                urls[page['title'].removeprefix('File:')] = info.get('thumburl') or info['url']
    mapping_path = ROOT / 'src/lib/teamLogos.json'
    mapping = json.loads(mapping_path.read_text(encoding='utf-8'))
    plan = []
    missing = []
    for team, entry in mapping.items():
        pair = icons.get(TEAM_NAME_MAP.get(team, team)) or icons.get(team)
        if not pair or pair[0] not in urls:
            missing.append(team)
            continue
        light, dark = pair
        old = ROOT / 'public' / entry['logo'].lstrip('/')
        new = old.with_name(old.stem + '-light' + Path(light).suffix)
        plan.append((team, light, urls[light], old, new, light == dark or dark is None))
    print(json.dumps({'teams':len(mapping), 'resolved':len(plan), 'missing':missing, 'new_downloads':sum(not item[5] for item in plan)},ensure_ascii=False), flush=True)
    if missing:
        raise RuntimeError('Missing cached light logos; do not silently use dark variants')
    if args.plan:
        return
    session = requests.Session()
    session.headers['User-Agent'] = 'nrg-scrapbook/1.0 (https://github.com/araise3/nrg-scrapbook)'
    for team, filename, url, old, new, reuse in plan:
        if not new.exists():
            if reuse and old.exists():
                shutil.copyfile(old, new)
            else:
                time.sleep(2.5)
                response = session.get(url, timeout=40)
                response.raise_for_status()
                if not response.headers.get('Content-Type','').startswith('image/'):
                    raise RuntimeError(f'Non-image response for {team}')
                new.write_bytes(response.content)
        mapping[team]['logoLight'] = '/' + new.relative_to(ROOT / 'public').as_posix()
        print(f'{team}: {filename}', flush=True)
    mapping_path.write_text(json.dumps(mapping,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print('Saved light-background logos. Source: Liquipedia Team templates and imageinfo API.', flush=True)


if __name__ == '__main__':
    main()
