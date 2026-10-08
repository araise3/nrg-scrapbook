import { aggregatePlayerBuckets, expandMatchRows, groupByEntity } from './entityBuckets.js'

export const CHAMPIONS_EVENT = 'Valorant Champions 2026'

export function nrgChampionsPlayers(data) {
  const buckets = (data?.buckets || []).filter(bucket => bucket.t === 'NRG' && data.events[bucket.e]?.name === CHAMPIONS_EVENT)
  return Object.fromEntries([...groupByEntity(buckets.map(bucket => ({ ...bucket, id: bucket.p })))].map(([player, rows]) => [player.toLowerCase(), aggregatePlayerBuckets(rows)]))
}

export function matchCountdown(timestamp, now = Date.now()) {
  const remaining = Math.ceil((timestamp * 1000 - now) / 1000)
  if (remaining <= 0) return null
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor(remaining % 86400 / 3600),
    minutes: Math.floor(remaining % 3600 / 60),
    seconds: remaining % 60,
  }
}

const escapeCalendar = value => String(value).replaceAll('\\', '\\\\').replaceAll('\n', '\\n').replaceAll(',', '\\,').replaceAll(';', '\\;')
const calendarDate = value => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
// RFC 5545 limits physical lines to 75 UTF-8 octets, not 75 JS characters.
function foldCalendarLine(line) {
  const lines = []
  let current = '', length = 0
  for (const char of line) {
    const bytes = new TextEncoder().encode(char).length
    if (length + bytes > 75) { lines.push(current); current = ' '; length = 1 }
    current += char; length += bytes
  }
  lines.push(current)
  return lines.join('\r\n')
}

export function championsCalendar(match, now = Date.now()) {
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NRG Scrapbook//Champions Shanghai//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${escapeCalendar(match.key)}@nrg-scrapbook`, `DTSTAMP:${calendarDate(now)}`,
    `DTSTART:${calendarDate(match.timestamp * 1000)}`,
    `SUMMARY:${escapeCalendar(`${match.team1} vs ${match.team2} — Champions Shanghai`)}`,
    `LOCATION:${escapeCalendar('Shanghai, China')}`,
    `DESCRIPTION:${escapeCalendar(`VALORANT Champions 2026. Best of ${match.bestOf || 3}. Kickoff time may change; check the match schedule before watching.\nhttps://liquipedia.net/valorant/VCT/2026/Champions`)}`,
    'URL:https://liquipedia.net/valorant/VCT/2026/Champions',
    'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:NRG match starts in 15 minutes', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].map(foldCalendarLine).join('\r\n')
}

// Schedule timestamps are absolute instants. Format the date and clock in the
// same browser timezone so a midnight crossing cannot split them across days.
export function championsKickoff(timestamp, timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone) {
  const date = new Date(timestamp * 1000)
  return {
    iso: date.toISOString(),
    date: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone }),
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone, timeZoneName: 'short' }),
  }
}

export function nrgChampionsGames(results, schedule) {
  const past = expandMatchRows(results)
    .filter(match => match.event === CHAMPIONS_EVENT && [match.team1, match.team2].includes('NRG'))
    .sort((a, b) => (b.ts || b.date).localeCompare(a.ts || a.date) || b.id - a.id)
  const upcoming = (schedule?.matches || [])
    .filter(match => match.event === CHAMPIONS_EVENT && [match.team1, match.team2].includes('NRG'))
    // Schedule feeds retain played fixtures. Only an unstarted fixture belongs here;
    // an elapsed kickoff alone does not prove a match has finished.
    .filter(match => !match.started && match.score1 == null && match.score2 == null)
    .filter(match => !past.some(result => [result.team1, result.team2].every(team => [match.team1, match.team2].includes(team)) && result.date === new Date(match.timestamp * 1000).toISOString().slice(0, 10)))
    .sort((a, b) => a.timestamp - b.timestamp)
  return { past, upcoming }
}
