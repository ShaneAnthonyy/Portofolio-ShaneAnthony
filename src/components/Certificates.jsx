import { certificates } from '../data/content.js'

function ExternalIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function Certificates() {
  return (
    <section id="certificates" className="section certificates">
      <div className="section__layout">
        <aside className="section__rail">
          <p className="section__eyebrow">05 — Certificates</p>
          <h2 className="section__title">Certificates</h2>
          <p className="section__sub">
            Verified credentials and coursework.
          </p>
        </aside>

        <div className="section__body">
          <div className="certs__grid">
            {certificates.map((cert, index) => (
              <article key={cert.title} className="cert-card">
                <span className="cert-card__index">{String(index + 1).padStart(2, '0')}</span>
                <span className="cert-card__issuer">{cert.issuer}</span>
                <h3 className="cert-card__title">{cert.title}</h3>
                <p className="cert-card__meta">
                  {cert.detail}
                  {cert.date ? ` · ${cert.date}` : ''}
                </p>
                <div className="cert-card__footer">
                  <a
                    className="cert-card__link"
                    href={cert.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`View certificate: ${cert.title}`}
                  >
                    <ExternalIcon />
                    <span>View certificate</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
