import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useData } from '../lib/useData'
import { buildShanghaiEncounters } from '../lib/shanghaiEncounters'
import knownAccounts from '../lib/trackerLinks.json'
import portraits from '../lib/nrgPortraits.json'

const passportLooks = {
  ethan: { paper: '#ffead5', notes: '#fff2e4', night: '#3e302b', nightNotes: '#44362d', accent: '#b84b17', bright: '#ffad6c', wash: '#efbc8b', pattern: 'stripes', mark: 'E / 01' },
  skuba: { paper: '#d9f2e5', notes: '#ebfaf1', night: '#223d38', nightNotes: '#25443d', accent: '#167e6d', bright: '#83dcc5', wash: '#a3deca', pattern: 'waves', mark: 'S / 02' },
  mada: { paper: '#f5ddef', notes: '#fbeafa', night: '#422c42', nightNotes: '#49314b', accent: '#b02f83', bright: '#f5a2da', wash: '#e7add5', pattern: 'stars', mark: 'M / 03' },
  brawk: { paper: '#dceafa', notes: '#edf5ff', night: '#26374d', nightNotes: '#2b4059', accent: '#285ebe', bright: '#9cbdff', wash: '#adc9ef', pattern: 'grid', mark: 'B / 04' },
  keiko: { paper: '#e4edc9', notes: '#f2f7df', night: '#343d29', nightNotes: '#3a442d', accent: '#526f17', bright: '#c0d889', wash: '#c5d88f', pattern: 'checks', mark: 'K / 05' },
  bonkar: { paper: '#e5def5', notes: '#f4edff', night: '#342f48', nightNotes: '#3d3551', accent: '#7550ad', bright: '#c9b1f0', wash: '#c5b2e4', pattern: 'diagram', mark: 'BK / 06' },
}

function pageLook(account, notes = false) {
  const look = passportLooks[account.player.toLowerCase()] || passportLooks.ethan
  return { '--player-paper': notes ? look.notes : look.paper, '--player-night': notes ? look.nightNotes : look.night, '--player-accent': look.accent, '--player-bright': look.bright, '--player-wash': look.wash }
}

function metric(value, digits = 0, suffix = '') {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })}${suffix}` : '—'
}

function timestamp(value) {
  const date = new Date(value)
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null
}

function CoverArtwork() {
  return <>
    <span className="passport-cover-top">THE NRG TRAVEL DIARY</span><strong>NRG</strong>
    <svg viewBox="0 0 160 160" aria-hidden="true"><circle cx="80" cy="80" r="61" /><ellipse cx="80" cy="80" rx="29" ry="61" /><path d="M19 80h122M29 47h102M29 113h102" /><path d="m80 38 12 27 29 4-22 20 6 30-25-15-25 15 6-30-22-20 29-4Z" /></svg>
    <span className="passport-cover-title">PASSPORT</span><span className="passport-cover-chinese">上海 / SHANGHAI 2026</span>
    <span className="passport-open-label">OPEN THE PASSPORT ↗</span>
  </>
}

function IdentityPage({ account, page }) {
  const portrait = portraits[account.player.toLowerCase()]
  const look = passportLooks[account.player.toLowerCase()] || passportLooks.ethan
  return <div className="passport-page-content passport-identity" data-player={account.player.toLowerCase()} data-pattern={look.pattern} style={pageLook(account)}>
    <div className="passport-page-label"><span>NRG / TRAVEL DOCUMENT</span><span>上海</span></div>
    <span className="passport-fan-ticket" aria-hidden="true">★ NRG FAN CLUB ★</span>
    <span className="passport-fan-seal" aria-hidden="true"><span>SHANGHAI</span><b>’26</b><small>★ THE FAN DIARY ★</small></span>
    <div className="passport-photo">{portrait ? <img src={portrait.src} alt={`${account.player}, NRG ${account.role === 'coach' ? 'coach' : 'player'}`} style={{ objectPosition: portrait.position }} loading="lazy" /> : <span>{account.player}</span>}<span>NRG / CAMERA ROLL</span></div>
    <p className="passport-field-label">NAME / HANDLE</p>
    <h3>{account.player}</h3>
    <p className="passport-field-label">RIOT ACCOUNT</p>
    <p className="passport-riot-id">{account.riotId}</p>
    <div className="passport-id-details"><div><span>ROLE</span><b>{account.role === 'coach' ? 'COACH' : 'PLAYER'}</b></div><div><span>DESTINATION</span><b>SHANGHAI, CN</b></div></div>
    <RankedStats account={account} />
    <svg className="passport-page-doodle" viewBox="0 0 130 90" aria-hidden="true"><path d="m83 9 5 20 22-7-12 19 18 12-23 1 1 24-14-19-17 13 6-23-21-6 22-5Z" /><path d="M9 72C3 48 36 32 46 50S18 83 11 58M34 78l30-16m-12-2 13 1-7 10" /></svg>
    <span className="passport-page-number">{String(page * 2 + 1).padStart(2, '0')}</span>
  </div>
}

function FamiliarFaces({ account, data }) {
  const registry = useMemo(() => {
    // Exclude every passport member, including their main accounts and coach.
    const nrgMembers = new Set(data.accounts.map(entry => entry.player.toLowerCase()))
    return Object.fromEntries(Object.entries(knownAccounts).filter(([player]) => !nrgMembers.has(player.toLowerCase())))
  }, [data])
  const encounters = useMemo(() => buildShanghaiEncounters(data.matches || [], account, registry), [account, data, registry])
  return <section className="passport-familiar-faces">
    <h4 className="passport-meet-heading">FAMILIAR FACES.</h4>
    <p className="passport-meet-caption">Known pros in the same ranked lobby</p>
    {encounters.length ? <ul className="passport-encounters">{encounters.slice(0, 10).map(entry => <li key={entry.player}><strong>{entry.player}</strong><span>{entry.together} together / {entry.against} against</span>{timestamp(entry.lastMet) && <time dateTime={entry.lastMet}>{timestamp(entry.lastMet)}</time>}</li>)}</ul>
      : <p className="passport-status">{account.coverage?.matches ? 'No known pro accounts matched in the collected games.' : 'Lobby history has not been collected yet.'}</p>}
  </section>
}

function RankedStats({ account }) {
  const stats = account.stats
  return <section className="passport-ranked-stats">
    <h4>ON THE LADDER.</h4>
    <div className="passport-rank"><span>CURRENT RANK</span><strong>{stats?.rank?.tier || 'Awaiting stats'}{stats?.rank?.rr != null ? ` · ${metric(stats.rank.rr)} RR` : ''}</strong></div>
    <dl className="passport-stats">
      {[['Games', metric(stats?.matches)], ['Win rate', metric(stats?.winPct == null ? null : stats.winPct * 100, 1, '%')], ['K/D', metric(stats?.kd, 2)], ['ACS', metric(stats?.acs, 1)], ['ADR', metric(stats?.adr, 1)], ['HS%', metric(stats?.hsPct == null ? null : stats.hsPct * 100, 1, '%')]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    {(account.statusMessage || !stats) && <p className="passport-status">{account.statusMessage || 'Ranked stats have not been collected for this account yet.'}</p>}
  </section>
}

function EncountersPage({ account, data, page }) {
  const look = passportLooks[account.player.toLowerCase()] || passportLooks.ethan
  return <div className="passport-page-content passport-record" data-player={account.player.toLowerCase()} data-pattern={look.pattern} style={pageLook(account, true)}>
    <div className="passport-page-label"><span>STAGE / LOBBY NOTES</span><span>AP / PC</span></div>
    <ChampionsStats account={account} />
    <FamiliarFaces account={account} data={data} />
    <span className="passport-page-number">{String(page * 2 + 2).padStart(2, '0')}</span>
  </div>
}

function ChampionsStats({ account }) {
  const stats = account.champions
  return <section className="passport-champions-stats" aria-label={`${account.player} Champions Shanghai stats`}>
    <h4>ON THE STAGE.</h4><p className="passport-meet-caption">Champions Shanghai 2026{stats ? ` / ${stats.mapsPlayed} maps` : ''}</p>
    {account.role === 'coach' ? <p className="passport-status">Coaching NRG’s Shanghai run.</p> : account.championsError ? <p className="passport-status" role="status">Champions stats couldn’t load. Try refreshing.</p> : account.championsLoading ? <p className="passport-status" role="status">Opening the tournament record…</p> : stats ? <>
      <dl className="passport-stats">{[['Rating', metric(stats.avgRating, 2)], ['ACS', metric(stats.avgAcs, 1)], ['K/D', metric(stats.kd, 2)], ['ADR', metric(stats.avgAdr, 1)], ['KAST', metric(stats.avgKast == null ? null : stats.avgKast * 100, 1, '%')], ['HS%', metric(stats.avgHsPct == null ? null : stats.avgHsPct * 100, 1, '%')]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <p className="passport-stage-totals">{stats.totalKills} kills / {stats.totalDeaths} deaths / {stats.totalAssists} assists<br />{stats.totalFirstKills} first kills / {stats.totalFirstDeaths} first deaths</p>
    </> : <p className="passport-status">No Champions maps recorded yet.</p>}
  </section>
}

export default function NrgShanghai({ championsPlayers = {}, championsLoading = false, championsError = false, onOpen }) {
  const { data, loading, error } = useData('nrg_shanghai')
  const [phase, setPhase] = useState('closed')
  const opening = phase === 'opening'
  const closing = phase === 'closing'
  const busy = opening || closing
  const opened = phase !== 'closed'
  const dialogRef = useRef(null)
  const stageRef = useRef(null)
  const bookRef = useRef(null)
  const pointerRef = useRef(null)
  const suppressClickRef = useRef(false)
  const [fit, setFit] = useState(1)
  const [compact, setCompact] = useState(false)
  const openerRef = useRef(null)
  const closeButtonRef = useRef(null)
  const coverButtonRef = useRef(null)
  const hasInteracted = useRef(false)
  const [leaf, setLeaf] = useState(0)
  const page = Math.floor(leaf / 2)
  const [turn, setTurn] = useState(null)
  const accounts = useMemo(() => (data?.accounts || []).map(entry => ({ ...entry, champions: championsPlayers[entry.player.toLowerCase()], championsLoading, championsError })), [data, championsPlayers, championsLoading, championsError])
  const account = accounts[page] || accounts[0]
  // The turning sheet covers the incoming page until the hinge exposes it.
  // Forward exposes incoming encounters on the right; backward exposes identity on the left.
  const identityPage = turn && !turn.forward ? Math.floor(turn.to / 2) : page
  const encountersPage = turn && turn.forward ? Math.floor(turn.to / 2) : page
  useLayoutEffect(() => {
    if (opened && !dialogRef.current.open) dialogRef.current.showModal()
  }, [opened])
  useEffect(() => {
    if (!opened) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previousOverflow }
  }, [opened])
  useEffect(() => {
    const query = window.matchMedia('(max-width: 600px)')
    const update = () => setCompact(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  useLayoutEffect(() => {
    if (!opened || !bookRef.current) return
    const book = bookRef.current
    const stage = stageRef.current
    const measure = () => setFit(Math.min(1, stage.clientWidth / book.offsetWidth, stage.clientHeight / book.offsetHeight))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(book)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [opened, accounts.length, compact])
  useEffect(() => {
    if (!busy) return
    // Also release navigation if an animation is interrupted by a preference change.
    const timer = setTimeout(() => setPhase(opening ? 'open' : 'closed'), opening ? 750 : 500)
    return () => clearTimeout(timer)
  }, [busy, opening])
  useEffect(() => {
    if (!hasInteracted.current || busy) return
    if (phase === 'open') closeButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'closed') (openerRef.current?.isConnected ? openerRef.current : coverButtonRef.current)?.focus({ preventScroll: true })
  }, [phase, busy])
  useEffect(() => {
    if (!turn) return
    // Normally animationend commits the new spread. This also finishes a turn
    // if a motion-preference change interrupts the animation mid-flight.
    const timer = setTimeout(() => { setLeaf(turn.to); setTurn(null) }, 850)
    return () => clearTimeout(timer)
  }, [turn])
  function flip(direction) {
    if (phase !== 'open' || turn || !accounts.length) return
    const next = compact ? leaf + direction : (page + direction) * 2
    if (next < 0 || next >= accounts.length * 2) { closePassport(); return }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setLeaf(next); return }
    setTurn({ from: leaf, to: next, forward: direction > 0 })
  }
  function turnFace(value) {
    const entry = accounts[Math.floor(value / 2)]
    return value % 2 ? <EncountersPage account={entry} data={data} page={Math.floor(value / 2)} /> : <IdentityPage account={entry} page={Math.floor(value / 2)} />
  }
  function openPassport() {
    if (phase !== 'closed') return
    openerRef.current = document.activeElement
    hasInteracted.current = true
    onOpen?.()
    setPhase(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'open' : 'opening')
  }
  function closePassport() {
    if (phase === 'closed' || closing) return
    setTurn(null)
    setPhase(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'closed' : 'closing')
  }
  return <div id="nrg-shanghai" className="passport-header-feature">
    <button ref={coverButtonRef} type="button" className="passport-launcher" onClick={openPassport} aria-label="Open NRG Shanghai passport" aria-describedby="passport-contents-description" aria-haspopup="dialog" aria-expanded={opened}>
      <span className="passport-cover" aria-hidden="true"><CoverArtwork /></span>
      <span className="passport-launcher-label">Open the passport <b aria-hidden="true">↗</b></span>
    </button>
    <span id="passport-contents-description" className="sr-only">Roster profiles, ranked stats, Champions Shanghai stats and familiar faces from their ranked lobbies.</span>
    {opened && createPortal(<dialog ref={dialogRef} className={`passport-modal passport-modal-${phase}`} aria-label="NRG Shanghai passport" onCancel={event => { event.preventDefault(); closePassport() }} onClick={event => { if (event.target === event.currentTarget || event.target.classList.contains('passport-book-stage') || event.target.classList.contains('passport-diary')) closePassport() }}>
      <div className="passport-diary" aria-busy={busy || !!turn} onAnimationEnd={event => {
        if (event.target !== event.currentTarget) return
        if (event.animationName === 'passport-modal-enter') setPhase('open')
        if (event.animationName === 'passport-modal-exit') setPhase('closed')
      }} onKeyDown={event => {
        if (event.key === 'ArrowRight') { event.preventDefault(); flip(1) }
        if (event.key === 'ArrowLeft') { event.preventDefault(); flip(-1) }
      }}>
        <button className="passport-close" ref={closeButtonRef} autoFocus type="button" onClick={closePassport} disabled={closing} aria-label="Close passport">×</button>
        <div ref={stageRef} className="passport-book-stage">
          {error ? <p className="passport-load-status" role="status">The passport couldn't load. Try refreshing the page.</p> : loading ? <p className="passport-load-status" role="status">Opening the passport…</p> : !account ? <p className="passport-load-status" role="status">The Shanghai account list hasn't been added yet.</p> : <div ref={bookRef} className={`passport-book${opening ? ' is-opening' : closing ? ' is-closing' : ''}`} style={{ '--passport-fit': fit }} onClick={event => {
            if (event.target.closest('button')) return
            if (suppressClickRef.current) { suppressClickRef.current = false; return }
            if (window.getSelection()?.toString()) return
            const bounds = event.currentTarget.getBoundingClientRect()
            flip(event.clientX < bounds.left + bounds.width / 2 ? -1 : 1)
          }} onPointerDown={event => { suppressClickRef.current = false; pointerRef.current = { x: event.clientX, y: event.clientY } }} onPointerUp={event => {
            const start = pointerRef.current
            pointerRef.current = null
            if (!start || Math.abs(event.clientX - start.x) < 45 || Math.abs(event.clientY - start.y) > 60) return
            suppressClickRef.current = true
            flip(event.clientX < start.x ? 1 : -1)
          }} onPointerCancel={() => { pointerRef.current = null }}>

            {/* All pages reserve the same fitted height; mobile reveals one leaf at a time. */}
            {accounts.map((entry, i) => <div key={`${entry.id}-identity`} className={`passport-paper passport-paper-left${(compact ? i * 2 !== (turn ? turn.to : leaf) : i !== identityPage) ? ' passport-inactive-page' : ''}`} aria-hidden={compact ? i * 2 !== (turn ? turn.to : leaf) : i !== identityPage} inert={(compact ? i * 2 !== (turn ? turn.to : leaf) : i !== identityPage) ? '' : undefined}><IdentityPage account={entry} page={i} /></div>)}
            {accounts.map((entry, i) => <div key={`${entry.id}-encounters`} className={`passport-paper passport-paper-right${(compact ? i * 2 + 1 !== (turn ? turn.to : leaf) : i !== encountersPage) ? ' passport-inactive-page' : ''}`} aria-hidden={compact ? i * 2 + 1 !== (turn ? turn.to : leaf) : i !== encountersPage} inert={(compact ? i * 2 + 1 !== (turn ? turn.to : leaf) : i !== encountersPage) ? '' : undefined}><EncountersPage account={entry} data={data} page={i} /></div>)}
            {turn && <div key={`${turn.from}-${turn.to}`} className={`passport-turning-sheet ${turn.forward ? 'turn-forward' : 'turn-backward'}`} aria-hidden="true" inert="" onAnimationEnd={event => {
              if (event.target !== event.currentTarget) return
              if (event.animationName === 'passport-flip-forward' || event.animationName === 'passport-flip-backward') { setLeaf(turn.to); setTurn(null) }
            }}>
              <div className="passport-sheet-front">{compact ? turnFace(turn.from) : turn.forward ? turnFace(turn.from + 1 - turn.from % 2) : turnFace(turn.from - turn.from % 2)}</div>
              <div className="passport-sheet-back">{compact ? turnFace(turn.to) : turn.forward ? turnFace(turn.to - turn.to % 2) : turnFace(turn.to + 1 - turn.to % 2)}</div>
            </div>}
            <button className="passport-page-corner passport-page-corner-left" type="button" onClick={() => flip(-1)} disabled={busy || !!turn} aria-label={leaf === 0 ? 'Close passport at front cover' : 'Turn passport page backward'}><svg viewBox="0 0 50 50" aria-hidden="true"><path d="M4 44 44 4v40Z" /><path d="M32 28H17m6-6-6 6 6 6" /></svg></button>
            <button className="passport-page-corner passport-page-corner-right" type="button" onClick={() => flip(1)} disabled={busy || !!turn} aria-label={(compact ? leaf === accounts.length * 2 - 1 : page === accounts.length - 1) ? 'Close passport at back cover' : 'Turn passport page forward'}><svg viewBox="0 0 50 50" aria-hidden="true"><path d="m6 4 40 40H6Z" /><path d="M18 28h15m-6-6 6 6-6 6" /></svg></button>
          </div>}
        </div>
        <p className="passport-turn-hint">Click a page corner to turn <span aria-hidden="true">↶ ↷</span></p>
        <span className="sr-only" aria-live="polite">{account?.player || 'NRG'} · {compact ? `Page ${leaf + 1} of ${accounts.length * 2}` : `Spread ${page + 1} of ${accounts.length}`}</span>

      </div>
    </dialog>, document.body)}
  </div>
}
