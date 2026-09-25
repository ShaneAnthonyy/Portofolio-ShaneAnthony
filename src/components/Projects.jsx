import { projects } from '../data/content.js'

function GitHubIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}

function FigmaIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M5.5 1h3a2 2 0 0 1 0 4h-3V1Z" fill="currentColor" stroke="none" opacity="0.9" />
      <path d="M2.5 1h3v4h-3a2 2 0 0 1 0-4Z" />
      <path d="M2.5 5h3v4h-3a2 2 0 0 1 0-4Z" />
      <circle cx="10.5" cy="3" r="2" />
      <path d="M5.5 9h3a2 2 0 0 1 0 4h-3V9Z" />
      <path d="M2.5 9h3v4h-3a2 2 0 0 1 0-4Z" />
      <circle cx="10.5" cy="11" r="2" />
    </svg>
  )
}

function ProjectCard({ project, index }) {
  const featured = Boolean(project.featured)
  return (
    <article className={featured ? 'project-card project-card--featured' : 'project-card'}>
      <span className="project-card__index">{String(index + 1).padStart(2, '0')}</span>
      <span className="project-card__stack">{project.stack}</span>
      <h3 className="project-card__title">{project.title}</h3>
      <p className="project-card__desc">{project.description}</p>
      {project.figma ? (
        <div className="project-card__embed">
          <iframe
            src={project.figma}
            title={`${project.title} — interactive prototype`}
            loading="lazy"
            allowFullScreen
          />
        </div>
      ) : null}
      <div className="project-card__footer">
        <div className="project-card__actions">
          <a
            className="project-card__github"
            href={project.github}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${project.title} on GitHub`}
          >
            <GitHubIcon />
            <span>Code on GitHub</span>
          </a>
          {project.figma ? (
            <a
              className="project-card__figma"
              href={project.figma}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open ${project.title} prototype in Figma`}
            >
              <FigmaIcon />
              <span>Live prototype</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}

export default function Projects() {
  return (
    <section id="projects" className="section projects">
      <div className="section__layout">
        <aside className="section__rail">
          <p className="section__eyebrow">04 — Projects</p>
          <h2 className="section__title">Projects</h2>
          <p className="section__sub">
            A mix of research and development projects I&apos;ve worked on.
          </p>
        </aside>

        <div className="section__body">
          <div className="projects__grid">
            {projects.map((project, index) => (
              <ProjectCard key={project.title} project={project} index={index} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
