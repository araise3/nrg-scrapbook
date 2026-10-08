import { useState } from 'react'

const external = { target: '_blank', rel: 'noopener noreferrer' }

function textWithLinks(text) {
  return text.split(/(https:\/\/[^\s]+|@[A-Za-z0-9_]{1,15}|#[\p{L}\p{N}_]+)/gu).map((part, index) => {
    const href = part.startsWith('@') ? `https://x.com/${part.slice(1)}` : part.startsWith('#') ? `https://x.com/search?q=${encodeURIComponent(part)}` : part.startsWith('https://') ? part : null
    return href ? <a key={index} href={href} {...external}>{part}</a> : part
  })
}

function PostText({ body, text }) {
  return <p className="social-post-text" dir="auto">{body?.length ? body.map((token, index) => token.href?.startsWith('https://') ? <a key={index} href={token.href} {...external}>{token.text}</a> : <span key={index}>{textWithLinks(token.text)}</span>) : textWithLinks(text || '')}</p>
}

function Avatar({ src, name }) {
  const [failed, setFailed] = useState(false)
  return src && !failed ? <img className="social-avatar" src={src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <span className="social-avatar social-avatar-fallback" aria-hidden="true">{name.slice(0, 1)}</span>
}

function Attachment({ media, url, author, index }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <a className="social-media-missing" href={url} {...external}>View attachment on X ↗</a>
  if (media.type === 'video' && media.src) return <video className="social-native-video" src={media.src} poster={media.poster || undefined} controls playsInline preload="none" aria-label={`Video posted by ${author}`} onError={() => setFailed(true)} />
  if (media.type === 'video' && media.poster) return <a className="social-video-preview" href={url} {...external} aria-label={`Watch video posted by ${author} on X`}><img src={media.poster} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} /><span><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 3 17 10 5 17Z" fill="currentColor" /></svg>Watch video on X ↗</span></a>
  if (media.type !== 'image' || !media.src) return null
  return <a className="social-photo" href={media.src} {...external} aria-label={`Open photo ${index + 1} posted by ${author}`}><img src={media.src} alt={media.alt || `Photo ${index + 1} posted by ${author}`} loading="lazy" decoding="async" onError={() => setFailed(true)} /></a>
}

function Media({ items, url, author }) {
  return items?.length ? <div className={`social-post-media ${items.length > 1 ? 'is-multiple' : ''}`}>{items.map((media, index) => <Attachment key={`${media.src || media.poster}-${index}`} media={media} url={url} author={author} index={index} />)}</div> : null
}

export default function XPost({ post, name }) {
  const author = post.author?.name || name
  return <article className="social-post social-native-post" aria-label={`Post by ${author}`}>
    <header className="social-post-heading">
      <a className="social-post-author" href={`https://x.com/${post.handle}`} {...external}><Avatar src={post.author?.avatar} name={author} /><span><b>{author}</b><small>@{post.handle}</small></span></a>
      <a className="social-x-mark" href={post.url} {...external} aria-label="Original post on X"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932zM17.61 20.644h2.039L6.486 3.24H4.298z" /></svg></a>
    </header>
    <PostText body={post.body} text={post.text} />
    <Media items={post.media} url={post.url} author={author} />
    {post.quote && <blockquote className="social-quoted-post"><a className="social-quote-author" href={`https://x.com/${post.quote.handle}`} {...external}><b>{post.quote.name}</b><span>@{post.quote.handle}</span></a><PostText body={post.quote.body} /><Media items={post.quote.media} url={post.quote.url} author={post.quote.name} /><a className="social-quote-source" href={post.quote.url} {...external}>View quoted post ↗</a></blockquote>}
    <footer className="social-post-footer"><a href={post.url} {...external}><time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</time></a><a className="social-source" href={post.url} {...external}>View on X ↗</a></footer>
  </article>
}
