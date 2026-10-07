import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
  return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Shanghai' }) : null
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
    <span className="passport-visa-sticker" aria-hidden="true">{look.mark} / ALL IN</span>
    <span className="passport-entry-stamp" aria-hidden="true">SHANGHAI<br /><b>2026</b><small>ALL IN / NRG</small></span>
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
    <div className="passport-page-label"><span>LOBBY / FIELD NOTES</span><span>AP / PC</span></div>
    <FamiliarFaces account={account} data={data} />
    <span className="passport-page-number">{String(page * 2 + 2).padStart(2, '0')}</span>
  </div>
}

export default function NrgShanghai() {
  const { data, loading, error } = useData('nrg_shanghai')
  const [phase, setPhase] = useState('closed')
  const opening = phase === 'opening'
  const closing = phase === 'closing'
  const busy = opening || closing
  const opened = phase !== 'closed'
  const [openingGeometry, setOpeningGeometry] = useState({})
  const bookRef = useRef(null)
  const closeButtonRef = useRef(null)
  const coverButtonRef = useRef(null)
  const hasInteracted = useRef(false)
  const [page, setPage] = useState(0)
  const [turn, setTurn] = useState(null)
  const accounts = data?.accounts || []
  const account = accounts[page] || accounts[0]
  // The turning sheet covers the incoming page until the hinge exposes it.
  // Forward exposes incoming encounters on the right; backward exposes identity on the left.
  const identityPage = turn && !turn.forward ? turn.to : page
  const encountersPage = turn && turn.forward ? turn.to : page
  useLayoutEffect(() => {
    const book = bookRef.current
    const cover = coverButtonRef.current
    if (!book || !cover) return
    // Measure the reserved spread even while closed; never animate layout height.
    const measure = () => {
      const paper = book.querySelector('.passport-paper-right')
      if (!paper) return
      const originX = paper.offsetLeft + paper.offsetWidth / 2
      const originY = paper.offsetTop + paper.offsetHeight / 2
      setOpeningGeometry({
        '--passport-open-scale-x': cover.offsetWidth / paper.offsetWidth,
        '--passport-open-scale-y': cover.offsetHeight / paper.offsetHeight,
        '--passport-cover-expand-x': paper.offsetWidth / cover.offsetWidth,
        '--passport-cover-expand-y': paper.offsetHeight / cover.offsetHeight,
        '--passport-cover-width': `${cover.offsetWidth}px`,
        '--passport-cover-height': `${cover.offsetHeight}px`,
        '--passport-origin-x': `${originX}px`,
        '--passport-origin-y': `${originY}px`,
        '--passport-rest-x': `${book.parentElement.clientWidth / 2 - book.offsetLeft - originX}px`,
        '--passport-rest-y': `${book.parentElement.clientHeight / 2 - book.offsetTop - originY}px`,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(book)
    observer.observe(cover)
    return () => observer.disconnect()
  }, [data])
  useEffect(() => {
    if (!busy) return
    // Also release navigation if an animation is interrupted by a preference change.
    const timer = setTimeout(() => setPhase(opening ? 'open' : 'closed'), 1250)
    return () => clearTimeout(timer)
  }, [busy, opening])
  useEffect(() => {
    if (!hasInteracted.current || busy) return
    if (phase === 'open') closeButtonRef.current?.focus({ preventScroll: true })
    if (phase === 'closed') coverButtonRef.current?.focus({ preventScroll: true })
  }, [phase, busy])
  useEffect(() => {
    if (!turn) return
    // Normally animationend commits the new spread. This also finishes a turn
    // if a motion-preference change interrupts the animation mid-flight.
    const timer = setTimeout(() => { setPage(turn.to); setTurn(null) }, 850)
    return () => clearTimeout(timer)
  }, [turn])
  function flip(next) {
    if (phase !== 'open' || turn || next < 0 || next >= accounts.length || next === page) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPage(next); return }
    setTurn({ from: page, to: next, forward: next > page })
  }
  function openPassport() {
    hasInteracted.current = true
    setPhase(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'open' : 'opening')
  }
  function closePassport() {
    setTurn(null)
    setPhase(window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'closed' : 'closing')
  }
  return <div className={`shanghai-passport-scene passport-${phase}`}>
    <span className="passport-luggage-label" aria-hidden="true">PVG / 上海<br /><b>NRG, ALL IN.</b></span>
    <div className="passport-diary" style={openingGeometry} role="region" aria-label="NRG Shanghai passport" aria-busy={busy || !!turn} onKeyDown={event => {
      if (event.target.tagName === 'SELECT') return
      if (event.key === 'ArrowRight') { event.preventDefault(); flip(page + 1) }
      if (event.key === 'ArrowLeft') { event.preventDefault(); flip(page - 1) }
    }}>
      <div className="passport-toolbar" aria-hidden={!opened || busy} inert={!opened || busy ? '' : undefined}><button ref={closeButtonRef} type="button" onClick={closePassport} disabled={busy}>← Close passport</button><label>Page <select aria-label="Passport player" value={page} disabled={busy || !!turn} onChange={event => flip(Number(event.target.value))}>{accounts.map((entry, i) => <option value={i} key={entry.id}>{entry.player}</option>)}</select></label></div>
      <div className="passport-book-stage">
      <button ref={coverButtonRef} type="button" className="passport-cover passport-resting-cover" onClick={openPassport} aria-label="Open NRG Shanghai passport" aria-hidden={opened} inert={opened ? '' : undefined} disabled={opened}>
        <CoverArtwork />
      </button>
      {error ? <p className="passport-load-status" role="status">The passport couldn't load. Try refreshing the page.</p> : loading ? <p className="passport-load-status" role="status">Opening the passport…</p> : !account ? <p className="passport-load-status" role="status">The Shanghai account list hasn't been added yet.</p> : <>
        <div ref={bookRef} className={`passport-book${opening ? ' is-opening' : closing ? ' is-closing' : ''}`} aria-hidden={!opened || busy} inert={!opened || busy ? '' : undefined} onAnimationEnd={event => {
          if (event.target !== event.currentTarget) return
          if (event.animationName === 'passport-open-spread') setPhase('open')
          if (event.animationName === 'passport-close-spread') setPhase('closed')
        }}>
          {/* All spreads share one grid row so every player reserves the same space. */}
          {accounts.map((entry, i) => <div key={`${entry.id}-identity`} className={`passport-paper passport-paper-left${i !== identityPage ? ' passport-inactive-page' : ''}`} aria-hidden={i !== identityPage} inert={i !== identityPage ? '' : undefined}><IdentityPage account={entry} page={i} /></div>)}
          {accounts.map((entry, i) => <div key={`${entry.id}-encounters`} className={`passport-paper passport-paper-right${i !== encountersPage ? ' passport-inactive-page' : ''}`} aria-hidden={i !== encountersPage} inert={i !== encountersPage ? '' : undefined}><EncountersPage account={entry} data={data} page={i} /></div>)}
          {busy && <div className={`passport-opening-cover${closing ? ' is-closing' : ''}`} aria-hidden="true" inert="">
            <div className="passport-cover passport-opening-front"><CoverArtwork /></div>
            <div className="passport-sheet-back passport-opening-inside"><IdentityPage account={account} page={page} /></div>
          </div>}
          {turn && <div key={`${turn.from}-${turn.to}`} className={`passport-turning-sheet ${turn.forward ? 'turn-forward' : 'turn-backward'}`} aria-hidden="true" inert="" onAnimationEnd={event => {
            if (event.target !== event.currentTarget) return
            if (event.animationName === 'passport-flip-forward' || event.animationName === 'passport-flip-backward') { setPage(turn.to); setTurn(null) }
          }}>
            <div className="passport-sheet-front">{turn.forward ? <EncountersPage account={accounts[turn.from]} data={data} page={turn.from} /> : <IdentityPage account={accounts[turn.from]} page={turn.from} />}</div>
            <div className="passport-sheet-back">{turn.forward ? <IdentityPage account={accounts[turn.to]} page={turn.to} /> : <EncountersPage account={accounts[turn.to]} data={data} page={turn.to} />}</div>
          </div>}
        </div>
      </>}
      </div>
      <div className="passport-controls" aria-hidden={!opened || busy} inert={!opened || busy ? '' : undefined}><button type="button" disabled={busy || page === 0 || !!turn} onClick={() => flip(page - 1)} aria-label="Previous passport page">← Previous</button><span aria-live="polite">{account?.player || 'NRG'} · {page + 1} / {accounts.length}</span><button type="button" disabled={busy || page === accounts.length - 1 || !!turn} onClick={() => flip(page + 1)} aria-label="Next passport page">Next →</button></div>
    </div>
  </div>
}
