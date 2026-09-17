import { skillGroups } from '../data/content.js'

const TIER_ORDER = { expert: 0, intermediate: 1, amateur: 2 }
const TIER_DOTS = { expert: 3, intermediate: 2, amateur: 1 }

function TierLabel({ tier }) {
  const label = tier.charAt(0).toUpperCase() + tier.slice(1)
  return <span className={`tier tier--${tier}`}>{label}</span>
}

export default function Skills() {
  return (
    <section id="skills" className="section skills">
      <div className="section__layout">
        <aside className="section__rail">
          <p className="section__eyebrow">03 — Skills</p>
          <h2 className="section__title">Skills</h2>
          <p className="section__sub">
            What I can ship with. Levels reflect comfort doing real work, not test scores.
          </p>
        </aside>

        <div className="section__body">
          <div className="skills__grid">
            {skillGroups.map((group) => {
              const sorted = [...group.items].sort(
                (a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9)
              )
              return (
                <div key={group.label} className="skills__group">
                  <h3 className="skills__group-title">{group.label}</h3>
                  <ul className="skills__list">
                    {sorted.map((item) => (
                      <li key={item.name} className="skill-row">
                        <span className="skill-row__name">{item.name}</span>
                        <span className="skill-row__meta">
                          <span
                            className="dots"
                            aria-label={`${item.tier}: ${TIER_DOTS[item.tier]} of 3`}
                          >
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className={`dot ${i < TIER_DOTS[item.tier] ? 'is-on' : ''}`}
                                aria-hidden="true"
                              />
                            ))}
                          </span>
                          <TierLabel tier={item.tier} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
