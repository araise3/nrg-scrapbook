import { useMemo, useState } from 'react'
import { useData } from '../lib/useData'
import { championsKickoff, nrgChampionsGames, nrgChampionsPlayers } from '../lib/nrgChampions'
import { shortDate } from '../lib/format'
import TeamLogo from '../components/TeamLogo'
import NrgShanghai from '../components/NrgShanghai'
import { AddToCalendar, ChampionsDiary, MatchCountdown } from '../components/ChampionsGuide'

const photos = [
  { name: 'mada-shanghai', caption: 'MADA / PLAYOFFS', alt: 'Mada onstage at Champions Shanghai' },
  { name: 'ethan-city', caption: 'ETHAN / SHANGHAI', alt: 'Ethan in Shanghai at Champions' },
  { name: 'skuba-shanghai', caption: 'SKUBA / GROUP STAGE', alt: 'Skuba onstage at Champions Shanghai' },
  { name: 'keiko-shanghai', caption: 'KEIKO / GROUP STAGE', alt: 'Keiko onstage at Champions Shanghai' },
  { name: 'ethan-shanghai', caption: 'ETHAN / GROUP STAGE', alt: 'Ethan competing at Champions Shanghai' },
]
const scheduleUrl = 'https://liquipedia.net/valorant/VCT/2026/Champions'
const dateLabel = value => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

function Game({ match, upcoming = false }) {
  const first = match.team1 === 'NRG'
  const opponent = first ? match.team2 : match.team1
  const ours = first ? match.s1 : match.s2
  const theirs = first ? match.s2 : match.s1
  const kickoff = upcoming ? championsKickoff(match.timestamp) : null
  const won = ours > theirs
  return <li className="champs-game">
    <div className="champs-game-meta">
      <time dateTime={upcoming ? kickoff.iso : match.date}>{upcoming ? kickoff.date : shortDate(match.date)}</time>
      <span>{upcoming ? match.phase || `Best of ${match.bestOf || 3}` : match.w.replace(':', ' /')}</span>
    </div>
    <div className="champs-game-teams"><TeamLogo team="NRG" size={28} showName={false} /><strong>NRG</strong><b className="champs-score">{upcoming ? 'VS' : `${ours}–${theirs}`}</b><TeamLogo team={opponent} size={28} showName={false} /><strong>{opponent}</strong></div>
    {upcoming ? <><p className="champs-kickoff">{kickoff.time} / Your local time</p><MatchCountdown match={match} /><AddToCalendar match={match} /></>
      : <div className="champs-map-scores"><span className={`champs-result ${won ? 'is-win' : 'is-loss'}`}>{won ? 'WIN' : 'LOSS'}</span>{match.maps.map((map, i) => <span key={`${map.map}-${i}`}>{map.map} <b>{first ? map.s1 : map.s2}–{first ? map.s2 : map.s1}</b></span>)}</div>}
    <a className="champs-match-link" href={upcoming ? scheduleUrl : `https://www.vlr.gg/${match.id}`} target="_blank" rel="noopener noreferrer">{upcoming ? 'Match schedule' : 'Match details'} ↗</a>
  </li>
}

function PassportLauncher() {
  const [requested, setRequested] = useState(false)
  const players = useData(requested ? 'player_buckets' : null)
  const stats = useMemo(() => nrgChampionsPlayers(players.data), [players.data])
  return <NrgShanghai onOpen={() => setRequested(true)} championsPlayers={stats} championsLoading={!requested || players.loading} championsError={players.error} />
}

export default function ChampionsShanghai() {
  const results = useData('match_results')
  const schedule = useData('upcoming_matches')
  const { past, upcoming } = useMemo(() => nrgChampionsGames(results.data, schedule.data), [results.data, schedule.data])
  const wins = past.filter(match => match.team1 === 'NRG' ? match.s1 > match.s2 : match.s2 > match.s1).length
  return <div className="champs-page">
    <div className="champs-wall" aria-hidden="true">{[...photos, ...photos].map((photo, i) => <img key={i} className={`champs-wall-photo champs-wall-photo-${i + 1}`} src={`/images/nrg/collage/${photo.name}.webp`} alt="" loading={i < 2 ? 'eager' : 'lazy'} />)}</div>
    <div className="champs-content">
      <header className="champs-header"><div className="champs-header-copy"><span className="scrap-index">NRG / CHAMPIONS 2026</span><h1>SHANGHAI<span>上海</span></h1><p>Champions Shanghai / The NRG fan guidebook</p><nav aria-label="Shanghai page sections"><a href="#champs-games">The games ↓</a><a href="#champs-diary">The diary ↓</a></nav></div><aside className="passport-header-note"><p>The roster, Shanghai stats<br />&amp; ranked lobbies.<span>All inside →</span></p><svg viewBox="0 0 180 85" aria-hidden="true"><path d="M8 57C30 15 48 13 63 34S67 74 99 60s45-34 68-25M150 19l19 16-22 11" /></svg></aside><PassportLauncher /></header>
      <div className="champs-camera-roll">{photos.slice(0, 3).map(photo => <figure key={photo.name}><img src={`/images/nrg/collage/${photo.name}.webp`} alt={photo.alt} /><figcaption>{photo.caption}</figcaption></figure>)}</div>
      <section id="champs-games" className="champs-games" aria-label="NRG Champions matches">
        <div className="champs-game-sheet champs-next"><header><span className="scrap-index">ON THE CALENDAR</span><h2>UPCOMING GAMES</h2></header><p className="champs-source">Times in your timezone · {Intl.DateTimeFormat().resolvedOptions().timeZone.replaceAll('_', ' ')}</p>
          {schedule.error ? <p role="status">The schedule couldn’t load. Try refreshing.</p> : schedule.loading ? <p role="status">Opening the match calendar…</p> : upcoming.length ? <ul>{upcoming.map(match => <Game key={match.key} match={match} upcoming />)}</ul> : <p>No upcoming NRG games have been announced in the schedule.</p>}
          <p className="champs-source">Schedule: <a href={scheduleUrl} target="_blank" rel="noopener noreferrer">Liquipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>{schedule.data?._meta?.fetchedAt && <> · Updated {dateLabel(schedule.data._meta.fetchedAt)}</>}</p>
        </div>
        <div className="champs-game-sheet"><header><span className="scrap-index">THE TOURNAMENT SO FAR</span><h2>PAST GAMES</h2>{!results.loading && !results.error && past.length > 0 && <span className="champs-record">{wins}W / {past.length - wins}L</span>}</header>
          {results.error ? <p role="status">The results couldn’t load. Try refreshing.</p> : results.loading ? <p role="status">Opening the match diary…</p> : past.length ? <ul>{past.map(match => <Game key={match.id} match={match} />)}</ul> : <p>NRG’s Champions results will appear here after their first game.</p>}
        </div>
      </section>
      <ChampionsDiary past={past} loading={results.loading} error={results.error} />
      <p className="champs-photo-credit">Shanghai photography: Colin Young-Wolff &amp; Lee Aiksoon / Riot Games. {photos.map((photo, i) => <span key={photo.name}>{i > 0 && ' · '}<a href={`https://www.flickr.com/photos/valorantesports/${['55574547526', '55549835403', '55550384570', '55550187545', '55559423605'][i]}/`} target="_blank" rel="noopener noreferrer">{photo.caption.split(' / ')[0]}</a></span>)}</p>
    </div>
  </div>
}
