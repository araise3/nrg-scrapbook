import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../lib/useData'
import { buildNrgCurrentSeason } from '../lib/nrgSeason'
import { num, pct, rating } from '../lib/format'
import currentPool from '../lib/currentMapPool.json'
import mapArtwork from '../lib/mapArtwork.json'
import portraits from '../lib/nrgPortraits.json'

export default function NrgSeasonStats() {
  const sectionRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const year = new Date().getFullYear()
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '300px' })
    observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])
  const { data: mapData, loading: mapsLoading, error: mapsError } = useData(visible ? 'team_map_buckets' : null)
  const { data: playerData, loading: playersLoading, error: playersError } = useData(visible ? 'player_buckets' : null)
  const { data: rosterData, loading: rosterLoading, error: rosterError } = useData(visible ? 'liquipedia_rosters' : null)
  const season = useMemo(() => buildNrgCurrentSeason(mapData, playerData, rosterData, year, currentPool.maps), [mapData, playerData, rosterData, year])
  const loading = !visible || mapsLoading || playersLoading || rosterLoading
  return <div ref={sectionRef} className="nrg-season-content">
    {mapsError || playersError || rosterError ? <p className="scrap-empty" role="status">Season stats couldn't load. Try refreshing the page.</p> : loading ? <p className="scrap-empty" role="status">Loading NRG's season…</p> : <>
      <div className="season-paper season-map-board">
        <div className="season-panel-heading"><h3>CURRENT MAP POOL</h3><p>{year} · {season.played} maps · {season.won}–{season.played - season.won}</p></div>
        <ul className="season-map-gallery" aria-label="NRG current map pool win rates">{season.mapPool.map(map => <li key={map.map}>
          <div className="season-map-print">
            {mapArtwork[map.map] && <img src={mapArtwork[map.map].src} srcSet={mapArtwork[map.map].srcSet} sizes="(max-width: 767px) 60vw, 34vw" width={mapArtwork[map.map].width} height={mapArtwork[map.map].height} alt="" loading="lazy" decoding="async" />}
            <div className="season-map-rate"><span>WIN RATE</span><strong>{pct(map.winPct)}</strong></div>
          </div>
          <div className="season-map-caption"><h4>{map.map}</h4><span>{map.wins}W / {map.losses}L · {map.mapsPlayed} maps</span></div>
        </li>)}</ul>
      </div>
      <div className="season-paper">
        <div className="season-panel-heading"><h3>CURRENT PLAYERS</h3><p>{year} / Season stats for NRG</p></div>
        <ul className="season-player-list" aria-label="NRG starting player season stats">{season.players.map(({ player, stats }) => {
          const portrait = portraits[player.toLowerCase()]
          return <li key={player}>
            <div className="season-player-name">{portrait ? <img src={portrait.src} alt="" style={{ objectPosition: portrait.position }} loading="lazy" /> : <span className="season-player-initial" aria-hidden="true">{player.slice(0, 1)}</span>}<div><h4>{player}</h4><span>{stats?.mapsPlayed || 0} maps</span></div></div>
            <dl>{[['Rating', rating(stats?.avgRating)], ['ACS', num(stats?.avgAcs, 1)], ['K/D', rating(stats?.kd)], ['ADR', num(stats?.avgAdr, 1)], ['KAST', pct(stats?.avgKast)], ['HS%', pct(stats?.avgHsPct)]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          </li>
        })}</ul>
        {!season.players.length && <p>No current starting roster recorded.</p>}
      </div>
    </>}
  </div>
}
