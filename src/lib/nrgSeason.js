import { aggregatePlayerBuckets, aggregateTeamMapBuckets, expandBuckets, groupByEntity } from './entityBuckets.js'

export function nrgSeasonYears(mapData, playerData) {
  const years = new Set()
  for (const data of [mapData, playerData]) {
    for (const bucket of data?.buckets || []) {
      const year = data.events[bucket.e]?.year
      if (bucket.t === 'NRG' && year != null) years.add(Number(year))
    }
  }
  return [...years].sort((a, b) => b - a)
}

export function buildNrgSeason(mapData, playerData, year) {
  const maps = mapData ? expandBuckets(mapData, 't', b => b.t === 'NRG').filter(b => Number(b.year) === Number(year)) : []
  const records = playerData ? expandBuckets(playerData, 'p', b => b.t === 'NRG').filter(b => Number(b.year) === Number(year)) : []
  const players = [...groupByEntity(records)].map(([player, buckets]) => ({
    player, stats: aggregatePlayerBuckets(buckets),
  })).sort((a, b) => b.stats.mapsPlayed - a.stats.mapsPlayed || a.player.localeCompare(b.player))
  const mapPool = aggregateTeamMapBuckets(maps)
  const played = mapPool.reduce((sum, row) => sum + row.mapsPlayed, 0)
  const won = mapPool.reduce((sum, row) => sum + row.wins, 0)
  return { mapPool, players, played, won, winPct: played ? won / played : null }
}

export function buildNrgCurrentSeason(mapData, playerData, rosterData, year, currentMaps) {
  const season = buildNrgSeason(mapData, playerData, year)
  const byMap = new Map(season.mapPool.map(row => [row.map, row]))
  const mapPool = currentMaps.map(map => byMap.get(map) || { map, mapsPlayed: 0, wins: 0, losses: 0, winPct: null })
  const byPlayer = new Map(season.players.map(row => [row.player.toLowerCase(), row]))
  const starters = (rosterData?.teams?.NRG?.players || []).filter(player => player.playerStatus === 'STARTER')
  const players = starters.map(player => byPlayer.get(player.id.toLowerCase()) || { player: player.id, stats: null })
  const played = mapPool.reduce((sum, row) => sum + row.mapsPlayed, 0)
  const won = mapPool.reduce((sum, row) => sum + row.wins, 0)
  return { mapPool, players, played, won, winPct: played ? won / played : null }
}
