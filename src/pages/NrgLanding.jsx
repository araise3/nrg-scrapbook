import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../lib/useData'
import { buildRatings } from '../lib/teamRatings'
import { applyAlwaysSettled } from '../lib/ratingStandings'
import { num } from '../lib/format'
import RosterTimeline from '../components/RosterTimeline'
import TeamLogo from '../components/TeamLogo'
import { Link } from 'react-router-dom'
import NrgSeasonStats from '../components/NrgSeasonStats'

const photos = {
  team: '/images/nrg/collage/paris-champions.webp',
  stage: '/images/nrg/collage/mada-shanghai.webp',
  offDuty: '/images/nrg/collage/ethan-city.webp',
  closeup: '/images/nrg/collage/keiko-shanghai.webp',
}

const wallPhotos = {
  cover: ['paris-trophy', 'bonkar-s0m', 'santiago-stage', 'ethan-shanghai', 's0m-brawk', 'paris-celebration', 'skuba-shanghai', 'ethan-city'],
  ratings: ['santiago-team', 'ethan-shanghai', 'paris-celebration', 'mada-shanghai', 'bonkar-s0m', 's0m-brawk', 'paris-trophy', 'skuba-shanghai'],
  roster: ['bonkar-s0m', 's0m-brawk', 'santiago-team', 'keiko-shanghai', 'paris-champions', 'santiago-stage', 'ethan-city', 'paris-trophy'],
  shanghai: ['ethan-city', 'mada-shanghai', 'skuba-shanghai', 'keiko-shanghai', 'ethan-shanghai', 'mada-shanghai', 'ethan-city', 'skuba-shanghai'],
}

function CollageWall({ kind }) {
  return <div className={`collage-wall collage-wall-${kind}`} aria-hidden="true">
    {wallPhotos[kind].map((photo, index) => <figure key={photo} className={`wall-print wall-print-${index + 1}`}>
      <img src={`/images/nrg/collage/${photo}.webp`} alt="" loading={kind === 'cover' && index < 3 ? 'eager' : 'lazy'} decoding="async" />
    </figure>)}
    <div className="wall-paper wall-paper-pink" />
    <div className="wall-paper wall-paper-blue" />
    <div className="wall-paper wall-paper-lime" />
    <div className="wall-type">{kind === 'shanghai' ? '上海\n上海\n上海' : kind === 'roster' ? 'WHO\nWHO\nWHO\nWHO' : 'NRG\nNRG\nNRG\nNRG'}</div>
  </div>
}

function SectionTitle({ number, title, subtitle, children }) {
  return <div className="scrap-section-heading">
    <div><span className="scrap-index">{number} / THE SCRAPBOOK</span><h2>{title}</h2><p>{subtitle}</p></div>
    {children}
  </div>
}

function TeamRatings({ matchData, loading, error }) {
  const year = 2026
  const runs = useMemo(() => matchData ? buildRatings(matchData) : new Map(), [matchData])
  const standings = useMemo(() => applyAlwaysSettled(runs.get(year)?.table || [], year), [runs, year])
  const rows = standings.filter(row => !row.provisional).sort((a, b) => b.rating - a.rating).slice(0, 12)
  const nrg = standings.find(row => row.team === 'NRG')

  return <section id="team-ratings" className="scrap-section ratings-section" aria-labelledby="landing-ratings-title">
    <CollageWall kind="ratings" />
    <SectionTitle number="01" title={<span id="landing-ratings-title">WHO'S ON TOP?</span>} subtitle="2026 / International top 12. Team Glicko-2 ratings." />
    <div className="ratings-layout">
      <div className="rating-clippings"><aside className="nrg-rating-note">
        <span className="note-pin" aria-hidden="true">★</span>
        <span className="scrap-small-label">THE HOME TEAM / {year || '…'}</span>
        <h3>NRG</h3>
        <div className="note-rating">{nrg ? num(nrg.rating) : '—'}</div>
        <span className="scrap-small-label note-rating-label">GLICKO-2 RATING</span>
        {nrg && <p>{nrg.seriesWins} wins · {nrg.series - nrg.seriesWins} losses<br />{nrg.provisional ? 'Provisional rating' : 'Season series record'}</p>}
      </aside><figure className="rating-snapshot"><img src={photos.offDuty} alt="Ethan out in Shanghai" loading="lazy" /><figcaption>from the camera roll / shanghai.</figcaption></figure><figure className="rating-archive-photo"><img src="/images/nrg/collage/paris-celebration.webp" alt="NRG celebrating at Champions Paris" loading="lazy" /><figcaption>CHAMPIONS / PARIS 2025</figcaption></figure></div>
      <div className="rating-sheet">
        <div className="window-bar" aria-hidden="true"><span>● ● ●</span><span>2026 / INTERNATIONAL TOP 12 / GLICKO-2</span><span>↗</span></div>
        {error ? <p className="scrap-empty" role="status">Ratings couldn't load. Try refreshing the page.</p>
          : loading ? <p className="scrap-empty" role="status">Putting the standings together…</p>
            : !rows.length ? <p className="scrap-empty">No ratings available for 2026.</p>
              : <ol className="scrap-standings" aria-label="2026 international top 12 Glicko-2 standings">
                {rows.map((row, index) => <li key={row.team} className={row.team === 'NRG' ? 'home-team-row' : ''}>
                  <span className="standing-number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="standing-team"><TeamLogo team={row.team} size={26} showName={false} /><span>{row.team}{row.provisional && <small>provisional</small>}</span></span>
                  <span className="standing-record">{row.seriesWins}–{row.series - row.seriesWins}</span>
                  <strong>{num(row.rating)}</strong>
                </li>)}
              </ol>}
        <p className="rating-footnote">2026 / Series wins–losses</p>
      </div>
    </div>
  </section>
}

function RosterHistory({ matchData }) {
  const team = 'NRG'
  const [visible, setVisible] = useState(false)
  const sectionRef = useRef(null)
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '300px' })
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])
  const { data: players, loading: playersLoading, error: playersError } = useData(visible ? 'player_buckets' : null)
  const { data: matchPlayers, loading: matchesLoading, error: matchesError } = useData(visible ? 'match_players' : null)

  return <section ref={sectionRef} id="roster-history" className="scrap-section roster-section" aria-labelledby="landing-roster-title">
    <CollageWall kind="roster" />
    <SectionTitle number="03" title={<span id="landing-roster-title">FIVE SEATS. MANY ERAS.</span>} subtitle="NRG through the years. Who stayed, who left, and who came next." />
    <div className="roster-paper">
      <div className="window-bar" aria-hidden="true"><span>● ● ●</span><span>THE ARCHIVE / ROSTER HISTORY</span><span>↗</span></div>
      <div className="roster-paper-caption"><TeamLogo team={team} size={28} showName={false} /><h3>{team} / ROSTER HISTORY</h3><span className="handwritten">same seat, new chapter ↴</span></div>
      <p className="roster-scroll-hint">Swipe to follow the five seats ↔</p>
      {playersError || matchesError ? <p className="scrap-empty" role="status">Roster history couldn't load. Try refreshing the page.</p>
        : !visible || playersLoading || matchesLoading || !players || !matchPlayers || !matchData ? <p className="scrap-empty" role="status">Opening the roster archive…</p>
          : <RosterTimeline playerBuckets={players} team={team} matchResultsRows={matchData.rows} matchPlayersRows={matchPlayers.rows} appearance="paper" profileLinks={false} />}
      <div className="roster-paper-footer"><p>Events run from oldest to newest. Each color follows a player; each column follows a starting seat. Recorded match appearances, not contract dates.</p></div>
    </div>
  </section>
}

export default function NrgLanding() {
  const { data: matchData, loading, error } = useData('match_results')
  return <div className="nrg-landing">
    <section className="nrg-cover" aria-labelledby="nrg-cover-title">
      <CollageWall kind="cover" />
      <div className="cover-repeat" aria-hidden="true">NRG<br />NRG<br />NRG<br />NRG</div>
      <span className="cover-techno" aria-hidden="true">NRG / VALORANT</span>
      <figure className="cover-trophy-print"><img src="/images/nrg/collage/paris-trophy.webp" alt="NRG with the Champions Paris trophy" /><figcaption>PARIS / 2025</figcaption></figure>
      <article className="magazine-window">
        <div className="window-bar" aria-hidden="true"><span>● ● ●</span><span>nrg / an independent fan archive</span><span>↗</span></div>
        <div className="magazine-masthead"><span>MAGAZINE / VOL. 01</span><span>THE PLAYERS<br />THE ERAS<br />THE NUMBERS</span></div>
        <div className="magazine-content"><div className="magazine-copy">
          <h1 id="nrg-cover-title">NRG<span>ALL IN.</span></h1>
          <p>A paper trail of competitive VALORANT. The names that made the team. The numbers that tell the story.</p>
          <p>Cut it out.<br />Put it together.<br />See what stays.</p>
          <a href="#roster-history" className="scrap-cta">ROSTER HISTORY ↗</a>
          <a href="#team-ratings" className="cover-ratings-link">GLICKO RATINGS ↗</a>
        </div><figure className="magazine-team-photo"><img src={photos.team} width="1400" height="934" alt="NRG celebrating with the Champions Paris trophy" fetchpriority="high" /><figcaption>FROM THE CAMERA ROLL / PARIS 2025</figcaption></figure></div>
      </article>
      <figure className="cover-player-cutout"><img src={photos.closeup} alt="Keiko on stage in Shanghai" /><figcaption>KEIKO<br />SHANGHAI</figcaption></figure>
      <figure className="cover-film"><img src={photos.stage} alt="Mada competing on stage in Shanghai" loading="lazy" /><figcaption>01 / IN THE MOMENT</figcaption></figure>
      <figure className="cover-contact-print"><img src="/images/nrg/collage/bonkar-s0m.webp" alt="Bonkar and s0m" loading="lazy" /><figcaption>BONKAR / S0M</figcaption></figure>
      <figure className="cover-celebration-print"><img src="/images/nrg/collage/paris-celebration.webp" alt="NRG celebrating in Paris" loading="lazy" /><figcaption>CHAMPIONS PARIS / 2025</figcaption></figure>
      <div className="cover-bottom-strip"><span>NRG / THE INDEPENDENT FAN ARCHIVE</span><a href="#team-ratings">THE NUMBERS ARE DOWN HERE ↓</a></div>
    </section>
    <TeamRatings matchData={matchData} loading={loading} error={error} />
    <section id="nrg-season" className="scrap-section season-section" aria-labelledby="landing-season-title">
      <CollageWall kind="ratings" />
      <SectionTitle number="02" title={<span id="landing-season-title">MAP POOL &amp; PLAYERS</span>} subtitle="NRG / Competitive season stats" />
      <NrgSeasonStats />
    </section>
    {error ? <p className="scrap-empty" role="status">The match archive couldn't load. Refresh to see roster history.</p> : <RosterHistory matchData={matchData} />}
    <section id="nrg-shanghai" className="scrap-section shanghai-section" aria-labelledby="landing-shanghai-title">
      <CollageWall kind="shanghai" />
      <SectionTitle number="04" title={<span id="landing-shanghai-title">NRG IN SHANGHAI.</span>} subtitle="Champions Shanghai 2026 / The games, the photos, the passport." />
      <Link to="/champs" className="champs-home-link"><img src="/images/nrg/collage/mada-shanghai.webp" alt="Mada competing at Champions Shanghai" loading="lazy" /><span><b>CHAMPIONS / SHANGHAI</b>Past games. Upcoming games. The team’s travel diary.<strong>OPEN THE SHANGHAI PAGE ↗</strong></span></Link>
    </section>
  </div>
}
