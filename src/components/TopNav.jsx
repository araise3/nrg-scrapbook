import { NavLink, useLocation } from 'react-router-dom'
import { useTheme } from '../lib/ThemeContext'

export default function TopNav() {
  const { pathname } = useLocation()
  const { mode, toggleTheme } = useTheme()
  const onLanding = pathname === '/tournaments' || pathname === '/'
  return (
    <>
      <header className="portal-header">
        <a href="#main-content" className="skip-link">Skip to scrapbook</a>
        <NavLink to="/tournaments" className="portal-wordmark" aria-label="NRG Scrapbook home"><span>NRG</span><b>SCRAPBOOK</b><i aria-hidden="true">✳</i></NavLink>
        <p className="masthead-note">An independent<br />NRG fan page.</p>
      </header>
      <nav className="portal-navigation" aria-label="Scrapbook navigation">
        <NavLink to="/tournaments" end className={({ isActive }) => `portal-nav-link ${isActive ? 'is-active' : ''}`}>Home</NavLink>
        <a href={onLanding ? '#team-ratings' : '/tournaments#team-ratings'} className="portal-nav-link">Glicko ratings</a>
        <a href={onLanding ? '#nrg-season' : '/tournaments#nrg-season'} className="portal-nav-link">Season stats</a>
        <a href={onLanding ? '#roster-history' : '/tournaments#roster-history'} className="portal-nav-link">Roster history</a>
        <NavLink to="/champs" className={({ isActive }) => `portal-nav-link ${isActive ? 'is-active' : ''}`}>Champs Shanghai</NavLink>
        <NavLink to="/documentaries" className={({ isActive }) => `portal-nav-link ${isActive ? 'is-active' : ''}`}>Documentaries</NavLink>
        <button type="button" className="portal-nav-link theme-toggle" onClick={toggleTheme} aria-label="Dark mode" aria-pressed={mode === 'dark'} title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}><span aria-hidden="true">{mode === 'dark' ? '☀' : '☾'}</span>{mode === 'dark' ? 'Light' : 'Dark'}</button>
      </nav>
    </>
  )
}
