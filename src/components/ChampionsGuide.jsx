import { useEffect, useState } from 'react'
import { championsCalendar, matchCountdown } from '../lib/nrgChampions'
import { shortDate } from '../lib/format'
import recaps from '../lib/nrgChampionsRecaps.json'

export function MatchCountdown({ match }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])
  const countdown = matchCountdown(match.timestamp, now)
  return <div className="champs-countdown" role="timer" aria-label="Time until scheduled kickoff">
    <span className="champs-countdown-label">{countdown ? 'KICKOFF IN' : 'SCHEDULED KICKOFF REACHED'}</span>
    {countdown ? <dl>{[['Days', countdown.days], ['Hours', countdown.hours], ['Minutes', countdown.minutes], ['Seconds', countdown.seconds]].map(([label, value]) => <div key={label}><dd>{String(value).padStart(2, '0')}</dd><dt>{label}</dt></div>)}</dl> : <p>Check the match page for the latest status.</p>}
  </div>
}

export function AddToCalendar({ match }) {
  function download() {
    const url = URL.createObjectURL(new Blob([championsCalendar(match)], { type: 'text/calendar;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `nrg-champions-${new Date(match.timestamp * 1000).toISOString().slice(0, 10)}.ics`
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return <button type="button" className="champs-calendar" onClick={download} aria-label={`Add ${match.team1} vs ${match.team2} to calendar`}>+ Add to calendar <span>15-minute reminder / .ics</span></button>
}

const diaryPhotos = {
  '2026-09-25': { file: 'skuba-shanghai', name: 'Skuba / Group stage' },
  '2026-09-29': { file: 'ethan-shanghai', name: 'Ethan / Group stage' },
  '2026-10-07': { file: 'mada-shanghai', name: 'Mada / Playoffs' },
}

export function ChampionsDiary({ past, loading, error }) {
  return <section id="champs-diary" className="champs-diary" aria-labelledby="champs-diary-title">
    <div className="scrap-section-heading"><div><span className="scrap-index">SHANGHAI / THE CAMERA ROLL</span><h2 id="champs-diary-title">THE TOURNAMENT DIARY.</h2><p>Shanghai photos / Match-day recap summaries from VLR.gg.</p></div></div>
    <ol className="champs-diary-entries">
      <li className="champs-diary-entry"><figure><img src="/images/nrg/collage/ethan-city.webp" alt="Ethan in Shanghai during Champions Features Day" loading="lazy" /><figcaption>ETHAN / SHANGHAI</figcaption></figure><article><time dateTime="2026-09-20">20 Sept 2026</time><h3>IN SHANGHAI.</h3><p>Ethan in the city during Champions Features Day. A page from the camera roll before NRG’s first match.</p></article></li>
      {error ? <li className="champs-diary-status" role="status">The match diary couldn’t load. Try refreshing.</li> : loading ? <li className="champs-diary-status" role="status">Opening the match-day notes…</li> : [...past].reverse().map(match => {
        const photo = diaryPhotos[match.date]
        const first = match.team1 === 'NRG'
        const recap = recaps[match.id]
        return <li key={match.id} className={`champs-diary-entry${photo ? '' : ' without-photo'}`}>{photo && <figure><img src={`/images/nrg/collage/${photo.file}.webp`} alt={`${photo.name} at Champions Shanghai`} loading="lazy" /><figcaption>{photo.name.toUpperCase()}</figcaption></figure>}<article><time dateTime={match.date}>{shortDate(match.date)} / {match.w.replace(':', ' /')}</time><span className="champs-diary-series">NRG {first ? `${match.s1}–${match.s2}` : `${match.s2}–${match.s1}`} {first ? match.team2 : match.team1}</span><h3>{recap?.title || 'MATCH DAY.'}</h3>{recap ? <><p className="champs-diary-byline">VLR.gg recap / Reporting by {recap.author}</p>{recap.summary.map((paragraph, i) => <p key={i}>{paragraph}</p>)}<div className="champs-diary-links"><a href={recap.url} target="_blank" rel="noopener noreferrer">Read the full VLR recap ↗</a><a href={`https://www.vlr.gg/${match.id}`} target="_blank" rel="noopener noreferrer">Match details ↗</a></div></> : <><p>Recap to follow.</p><a href="https://www.vlr.gg/event/news/2766/valorant-champions-2026" target="_blank" rel="noopener noreferrer">Champions news on VLR ↗</a></>}</article></li>
      })}
    </ol>
  </section>
}
