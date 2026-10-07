// Match participants must carry an account identity, not just a pro-like name.
// The account registry is curated; no fuzzy handle matching is used here.
const riotKey = value => typeof value === 'string' ? value.normalize('NFKC').toLowerCase() : ''

export function buildShanghaiEncounters(matches, account, knownAccounts) {
  const byPuuid = new Map()
  const byRiotId = new Map()
  for (const [player, accounts] of Object.entries(knownAccounts)) {
    for (const entry of accounts) {
      if (entry.puuid) byPuuid.set(entry.puuid, player)
      if (entry.riotId) byRiotId.set(riotKey(entry.riotId), player)
    }
  }
  const identify = participant => participant.puuid
    ? byPuuid.get(participant.puuid)
    : byRiotId.get(riotKey(participant.riotId))
  const isAccount = participant => account.puuid
    ? participant.puuid === account.puuid
    : !!account.riotId && riotKey(participant.riotId) === riotKey(account.riotId)
  const encounters = new Map()
  const seenMatches = new Set()
  for (const match of matches) {
    if (!match.id || seenMatches.has(match.id) || match.queue !== 'competitive') continue
    const me = (match.players || []).find(isAccount)
    if (!me || !me.teamId) continue
    seenMatches.add(match.id)
    const seenPlayers = new Set()
    for (const participant of match.players) {
      const player = identify(participant)
      if (!player || isAccount(participant) || player.toLowerCase() === account.player?.toLowerCase() || !participant.teamId || seenPlayers.has(player)) continue
      seenPlayers.add(player)
      const entry = encounters.get(player) || { player, together: 0, against: 0, lastMet: null }
      entry[participant.teamId === me.teamId ? 'together' : 'against'] += 1
      if (match.playedAt && (!entry.lastMet || match.playedAt > entry.lastMet)) entry.lastMet = match.playedAt
      encounters.set(player, entry)
    }
  }
  return [...encounters.values()].sort((a, b) => (b.together + b.against) - (a.together + a.against) || a.player.localeCompare(b.player))
}
