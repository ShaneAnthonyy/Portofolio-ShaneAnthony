import { certificates } from '../data/content.js'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

function ExternalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function Certificates() {
  const total = certificates.length
  const typeRef = useTypeReveal(typeTimelines.certificates, 'certificates')
  const choreoRef = useSectionChoreography(choreographyBuilders.certificates, 'choreo-certificates')
  return (
    <section id="certificates" className="section certificates" ref={typeRef}>
      <div className="section__layout">
        <aside className="section__rail">
          <h2 className="section__title">Certifications</h2>
          <p className="section__sub">
            Verified learning records and formal training.
          </p>
          <p className="cabinet__count" aria-label={`${total} credential${total === 1 ? '' : 's'} logged`}>
            <span className="cabinet__count-now">Credentials / {String(total).padStart(2, '0')}</span>
          </p>
        </aside>

        <div className="section__body">
          <div className="cabinet-flow" ref={choreoRef}>
            {certificates.map((cert, index) => (
              <article key={cert.title} className="cabinet-record">
                <span className="cabinet-record__no" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <div className="cabinet-record__body">
                  <p className="cabinet-record__issuer">{cert.issuer}</p>
                  <h3 className="cabinet-record__title">{cert.title}</h3>
                  <p className="cabinet-record__meta">
                    {cert.detail}
                    {cert.date ? ` · ${cert.date}` : ''}
                  </p>
                </div>
                <a
                  className="cabinet-record__link"
                  href={cert.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`View certificate: ${cert.title}`}
                >
                  <span>View certificate</span>
                  <ExternalIcon />
                </a>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
