"""NRG's dedicated AP event accounts, separate from normal Act/main accounts.

Reuse the existing authenticated client and sum-first ranked calculations.
Keep compact lobby identities for verified-pro encounters, with an incremental
raw counter cache per PUUID. No local scraper database or third-party secrets
in the frontend. Coverage is the collected history of the supplied accounts;
we do not invent an arrival date or silently clip to an Act boundary.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fetch_act_stats import Client, ApiError, blank_counters, accumulate, derive, fetch_rank

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / 'data_prep/nrg_shanghai_accounts.json'
OUT = ROOT / 'public/data/nrg_shanghai.json'
PAGE_SIZE = 10
MAX_PAGES = 30


def now():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def compact_match(match):
    meta = match.get('metadata') or {}
    queue = (meta.get('queue') or {}).get('id')
    if queue and queue != 'competitive':
        return None
    if not meta.get('match_id'):
        return None
    return {
        'id': meta['match_id'], 'queue': 'competitive',
        'playedAt': meta.get('started_at'),
        'players': [{'puuid': p.get('puuid'),
                     'riotId': f"{p.get('name', '')}#{p.get('tag', '')}",
                     'teamId': p.get('team_id')} for p in match.get('players', [])],
    }


def collect(client, spec, server, previous, lobbies):
    name, tag = spec['riotId'].rsplit('#', 1)
    response = client.get(f'/v2/account/{quote(name, safe="")}/{quote(tag, safe="")}')
    identity = (response or {}).get('data') or {}
    puuid = identity.get('puuid')
    if not puuid:
        raise ApiError('The data service could not resolve this Riot account.')
    cached = previous if previous.get('puuid') == puuid else {}
    counters = {key: cached.get('counters', {}).get(key, 0) for key in blank_counters()}
    prior_newest = cached.get('newestMatchId')
    newest = None
    seen = set()
    stopped = False
    unreadable = 0
    rank = fetch_rank(client, server, puuid)
    for page in range(MAX_PAGES):
        response = client.get(f'/v4/by-puuid/matches/{server}/pc/{puuid}',
                              {'mode': 'competitive', 'size': PAGE_SIZE, 'start': page * PAGE_SIZE})
        if response is None or not isinstance(response.get('data'), list):
            raise ApiError('The data service could not read AP ranked history.')
        matches = response['data']
        for match in matches:
            lobby = compact_match(match)
            if not lobby or lobby['id'] in seen:
                continue
            seen.add(lobby['id'])
            if lobby['id'] == prior_newest:
                stopped = True
                break
            newest = newest or lobby['id']
            # Lobby coverage and stats use the same readable competitive games.
            if not accumulate(counters, match, puuid):
                unreadable += 1
                continue
            lobbies[lobby['id']] = lobby
        if stopped or len(matches) < PAGE_SIZE:
            stopped = True
            break
    games = [m for m in lobbies.values() if any(p.get('puuid') == puuid for p in m['players'])]
    dates = sorted(m['playedAt'] for m in games if m.get('playedAt'))
    return dict(spec, server=server.upper(), puuid=puuid, updatedAt=now(),
                stats=dict(derive(counters), matches=counters['matches'], rank=rank),
                counters=counters, newestMatchId=newest or prior_newest,
                coverage={'matches': len(games), 'from': dates[0] if dates else None,
                          'to': dates[-1] if dates else None,
                          'truncated': cached.get('coverage', {}).get('truncated', False) or not stopped,
                          'unreadable': unreadable})


def main():
    key = os.environ.get('HENRIKDEV_API_KEY')
    if not key:
        print('HENRIKDEV_API_KEY is required; use the existing Actions secret.', file=sys.stderr)
        return 1
    config = json.loads(CONFIG.read_text(encoding='utf-8'))
    old = json.loads(OUT.read_text(encoding='utf-8')) if OUT.exists() else {}
    previous = {a['id']: a for a in old.get('accounts', [])}
    lobbies = {m['id']: m for m in old.get('matches', [])}
    accounts, failed = [], 0
    client = Client(key)
    for spec in config['accounts']:
        prev = previous.get(spec['id'], {})
        try:
            account = collect(client, spec, config['server'], prev, lobbies)
            print(f"{spec['player']}: {account['stats']['matches']} games, {account['coverage']['matches']} lobbies")
        except ApiError as error:
            failed += 1
            account = dict(prev, **spec, server=config['server'].upper(), statusMessage=str(error))
            print(f"{spec['player']}: {error}", file=sys.stderr)
        accounts.append(account)
    out = {'updatedAt': now() if failed < len(accounts) else old.get('updatedAt'),
           'source': 'HenrikDev', 'server': config['server'],
           'accounts': accounts,
           'matches': sorted(lobbies.values(), key=lambda m: m.get('playedAt') or '', reverse=True)}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return 1 if failed == len(accounts) else 0


if __name__ == '__main__':
    sys.exit(main())
