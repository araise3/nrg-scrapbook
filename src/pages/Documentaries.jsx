const documentaries = [
  { id: 'clVUx7k3tj4', title: 'Everything was perfect...until it wasn’t' },
  { id: 'ttF1UYlCzdU', title: 'How We Broke the Champs Curse | The NRG Stage 1 Documentary' },
  { id: 'kSHermWKqb4', title: 'What REALLY happened at Santiago...' },
  { id: '5YQy_qi17H4', title: 'How NRG Made It Back To Champs' },
  { id: 'Zm36Up_SiQQ', title: "The End of NRG VALORANT's Last Roster | Bring The NRG Ep 2" },
  { id: 'syTA4vh_bDI', title: 'What Happened to NRG in VCT Kickoff | Bring The NRG Ep 1' },
]

export default function Documentaries() {
  return <div className="documentaries-page">
    <div className="documentary-wall" aria-hidden="true">
      {['paris-celebration', 'santiago-stage', 'bonkar-s0m', 'paris-trophy'].map((photo, index) => <img key={photo} className={`documentary-print documentary-print-${index + 1}`} src={`/images/nrg/collage/${photo}.webp`} alt="" decoding="async" />)}
    </div>
    <div className="documentary-content">
      <header className="scrap-section-heading">
        <div><span className="scrap-index">NRG / FILM ARCHIVE</span><h1>DOCUMENTARIES</h1><p>NRG VALORANT · Behind the scenes</p></div>
      </header>
      <div className="documentary-grid">
        {documentaries.map((video, index) => <article className="documentary-card" key={video.id} aria-labelledby={`film-${video.id}`}>
          <div className="documentary-player">
            <iframe src={`https://www.youtube-nocookie.com/embed/${video.id}`} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          </div>
          <div className="documentary-caption"><span className="documentary-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><h2 id={`film-${video.id}`}>{video.title}</h2></div>
          <a className="documentary-link" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${video.title} on YouTube`}>Watch on YouTube ↗</a>
        </article>)}
      </div>
    </div>
  </div>
}
