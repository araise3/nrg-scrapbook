"""Offline checks for incremental paging and failure handling; no API calls."""
import unittest
from unittest.mock import patch

from fetch_act_stats import ApiError
from fetch_nrg_shanghai import collect, compact_match


def match(identifier, team='Red', queue='competitive'):
    return {
        'metadata': {'match_id': identifier, 'started_at': '2026-10-01T10:00:00Z', 'queue': {'id': queue}},
        'players': [{'puuid': 'subject', 'name': 'Account', 'tag': 'TAG', 'team_id': team,
                     'stats': {'kills': 20, 'deaths': 10, 'score': 4600}}],
        'teams': [{'team_id': team, 'won': True, 'rounds': {'won': 13, 'lost': 10}}],
    }


class FakeClient:
    def __init__(self, matches):
        self.matches = matches
        self.calls = []

    def get(self, path, params=None):
        self.calls.append((path, params))
        if '/account/' in path:
            return {'data': {'puuid': 'subject'}}
        return {'data': self.matches}


class ShanghaiCollectionTests(unittest.TestCase):
    spec = {'id': 'ethan', 'player': 'ethan', 'riotId': 'Account#TAG', 'role': 'player'}

    @patch('fetch_nrg_shanghai.fetch_rank', return_value={'tier': 'Immortal', 'rr': 100})
    def test_duplicate_match_and_incremental_cache(self, rank):
        lobbies = {}
        first = collect(FakeClient([match('one'), match('one')]), self.spec, 'ap', {}, lobbies)
        self.assertEqual(first['stats']['matches'], 1)
        self.assertEqual(first['stats']['kd'], 2)
        self.assertEqual(first['stats']['acs'], 200)
        self.assertEqual(first['coverage']['matches'], 1)
        second = collect(FakeClient([match('two'), match('one')]), self.spec, 'ap', first, lobbies)
        self.assertEqual(second['stats']['matches'], 2)
        self.assertEqual(second['coverage']['matches'], 2)
        self.assertEqual(second['newestMatchId'], 'two')

    @patch('fetch_nrg_shanghai.fetch_rank', return_value=None)
    def test_failed_history_is_not_zero_games(self, rank):
        class MissingHistory(FakeClient):
            def get(self, path, params=None):
                return super().get(path, params) if '/account/' in path else None
        with self.assertRaises(ApiError):
            collect(MissingHistory([]), self.spec, 'ap', {}, {})

    def test_lobby_retains_identity_and_filters_other_queues(self):
        lobby = compact_match(match('one'))
        self.assertEqual(lobby['players'][0]['riotId'], 'Account#TAG')
        self.assertEqual(lobby['players'][0]['teamId'], 'Red')
        self.assertIsNone(compact_match(match('unrated', queue='unrated')))


if __name__ == '__main__':
    unittest.main()
