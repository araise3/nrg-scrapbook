import { useState } from 'react'
import { useData } from '../lib/useData'
import accounts from '../lib/socialAccounts.json'
import XPost from '../components/XPost'

export default function SocialFeed() {
  const { data, loading, error } = useData('social_feed')
  const [group, setGroup] = useState('all')
  const [author, setAuthor] = useState('all')
  const [limit, setLimit] = useState(12)
  const selectedAccounts = accounts.filter(account => group === 'all' || account.group === group)
  const posts = (data?.posts || []).filter(post => selectedAccounts.some(account => account.handle === post.handle) && (author === 'all' || post.handle === author))
  const stale = data?.updatedAt && Date.now() - Date.parse(data.updatedAt) > 36 * 60 * 60 * 1000
  return <div className="social-page">
    <div className="documentary-wall social-wall" aria-hidden="true">
      {['paris-celebration', 'santiago-stage', 'bonkar-s0m', 'paris-trophy'].map((photo, index) => <img key={photo} className={`documentary-print documentary-print-${index + 1}`} src={`/images/nrg/collage/${photo}.webp`} alt="" decoding="async" />)}
    </div>
    <div className="social-content">
      <header className="scrap-section-heading"><div><span className="scrap-index">NRG / FROM THE TIMELINE</span><h1>SOCIAL FEED</h1><p>Players, the team & fan art</p></div></header>
      <div className="social-controls">
        <div className="social-tabs" role="group" aria-label="Post category">{[['all', 'All'], ['players', 'Players & staff'], ['artists', 'Artists']].map(([value, label]) => <button key={value} type="button" aria-pressed={group === value} onClick={() => { setGroup(value); setAuthor('all'); setLimit(12) }}>{label}</button>)}</div>
        <label>From <select value={author} onChange={event => { setAuthor(event.target.value); setLimit(12) }}><option value="all">Everyone</option>{selectedAccounts.map(account => <option key={account.handle} value={account.handle}>{account.name}</option>)}</select></label>
        {data?.updatedAt && <p>Updated <time dateTime={data.updatedAt}>{new Date(data.updatedAt).toLocaleString()}</time>{stale && <span> · Refresh delayed</span>}</p>}
      </div>
      {loading ? <div className="social-empty" role="status">Loading the feed…</div> : error ? <div className="social-empty" role="alert">The feed could not be loaded. Try refreshing the page.</div> : posts.length === 0 ? <div className="social-empty"><h2>{data?.updatedAt ? 'No posts in this selection yet.' : 'The feed is on its way.'}</h2><p>{data?.updatedAt ? 'Check another account or come back after the next update.' : 'Team updates and fan art will appear here once collection starts.'}</p><div className="social-accounts">{selectedAccounts.map(account => <a key={account.handle} href={`https://x.com/${account.handle}`} target="_blank" rel="noopener noreferrer">@{account.handle} ↗</a>)}</div></div> : <><div className="social-grid">{posts.slice(0, limit).map(post => <XPost key={post.id} post={post} name={accounts.find(account => account.handle === post.handle)?.name || post.handle} />)}</div>{limit < posts.length && <button type="button" className="social-more" onClick={() => setLimit(value => value + 12)}>More posts</button>}</>}
    </div>
  </div>
}
