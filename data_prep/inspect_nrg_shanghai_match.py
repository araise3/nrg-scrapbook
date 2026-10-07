"""Inspect the exact reported lobby and account affinity; no aggregate writes."""
import json
import os
from pathlib import Path
from fetch_act_stats import Client

client = Client(os.environ['HENRIKDEV_API_KEY'])
puuid = '8789814a-3843-594b-8d20-a5cf8d1100f3'
match_id = '00b01706-b209-4c39-b894-a3a2752db7b3'
match = (client.get(f'/v4/match/ap/{match_id}') or {}).get('data') or {}
account = (client.get(f'/v2/by-puuid/account/{puuid}') or {}).get('data') or {}
report = {
    'requestedAffinity': 'ap',
    'metadata': match.get('metadata'),
    'players': [{k: p.get(k) for k in ('name','tag','puuid','team_id')}
                for p in match.get('players', [])
                if p.get('puuid') in (puuid, '62e78567-8d9e-54b9-b52b-2d091faf692a')],
    'currentAccount': {k: account.get(k) for k in ('name','tag','puuid','region','affinity')},
}
print(json.dumps(report, ensure_ascii=False, indent=2))
Path('shanghai-match-audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
if not match.get('metadata') or len(report['players']) != 2:
    raise SystemExit('Exact match verification incomplete')
