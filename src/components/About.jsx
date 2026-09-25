import { about, profile } from '../data/content.js'

export default function About() {
  return (
    <section id="about" className="section about">
      <div className="section__layout">
        <aside className="section__rail">
          <p className="section__eyebrow">02 — About</p>
          <h2 className="section__title">About me</h2>
          <p className="section__sub">
            Frontend developer crafting clean interfaces and usable experiences through real projects.
          </p>
        </aside>

        <div className="section__body">
          <div className="about__grid">
            <div className="about__image">
              <img src="/photo2.png" alt={profile.name} className="about__photo" />
            </div>

            <div className="about__content">
              <p className="about__summary">{about.summary}</p>

              <div className="about__side">
                <div className="about__block">
                  <h3 className="about__block-title">Education</h3>
                  <ul className="timeline">
                    {about.education.map((item) => (
                      <li key={item.school} className="timeline__item">
                        <span className="timeline__period">{item.period}</span>
                        <span className="timeline__school">{item.school}</span>
                        <span className="timeline__detail">{item.detail}</span>
                        <span className="timeline__note">{item.note}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="about__block">
                  <h3 className="about__block-title">Languages</h3>
                  <ul className="lang-list">
                    {about.languages.map((lang) => (
                      <li key={lang.name} className="lang-list__item">
                        <span>{lang.name}</span>
                        <span className="lang-list__level">{lang.level}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
