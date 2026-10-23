import { useState } from 'react'
import ActionButton from './ActionButton.jsx'
import { contact } from '../data/content.js'
import { CONTACT_FISH } from '../data/fauna.js'
import AmbientFish from './AmbientFish.jsx'
import { typeTimelines, useTypeReveal } from '../animation/typography.js'
import { choreographyBuilders, useSectionChoreography } from '../animation/sectionChoreography.js'

export default function Contact() {
  const typeRef = useTypeReveal(typeTimelines.contact, 'contact')
  const choreoRef = useSectionChoreography(choreographyBuilders.contact, 'choreo-contact')
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const body = encodeURIComponent(
      `Hi Shane,\n\n${form.message}\n\n— ${form.name} (${form.email})`
    )
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}&body=${body}`,
      '_blank',
      'noopener'
    )
    setSent(true)
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contact.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section id="contact" className="section contact" ref={typeRef}>
      <AmbientFish sectionId="contact" defs={CONTACT_FISH} mode="ambient" speed={0.11} trimTo={2} />
      <div className="section__layout">
        <aside className="section__rail">
          <h2 className="section__title"><span className="contact-rail__l1">Contact</span><span className="contact-rail__l2">Me</span></h2>
          <p className="section__sub">
            Open to Software Developer internships, project collaboration, or research chat.
          </p>
        </aside>

        <div className="section__body">
          <div className="contact__grid" ref={choreoRef}>
            <div className="contact__info">
              <p className="contact__console-head">Contact details</p>
              <p className="contact__availability">
                <span className="contact__dot" aria-hidden="true" />
                {contact.availability}
              </p>
              <p className="contact__response">{contact.responseTime} · {contact.location}</p>

              <div className="contact__details">
                <div className="contact__item">
                  <span className="contact__label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414.05 3.555ZM0 4.697v7.104l5.803-3.558L0 4.697Zm6.761 4.132L.191 12.856A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144L9.238 8.83 8 9.586l-1.239-.757ZM16 4.697l-5.803 3.546L16 11.801V4.697Z" />
                    </svg>
                    Email
                  </span>
                  <span className="contact__row">
                    <span className="contact__value">{contact.email}</span>
                    <button
                      type="button"
                      className="contact__copy"
                      onClick={copyEmail}
                      aria-live="polite"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </span>
                </div>
                <a
                  className="contact__item"
                  href={contact.github}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="contact__label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                    </svg>
                    GitHub
                  </span>
                  <span className="contact__value contact__link">{contact.githubLabel}</span>
                </a>
                <a
                  className="contact__item"
                  href={contact.linkedin}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="contact__label" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146Zm4.943 12.248V6.169H2.542v7.225h2.401Zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.521-1.248-1.342-1.248-.821 0-1.358.54-1.358 1.248 0 .694.521 1.248 1.327 1.248h.015Zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.432.568-.88 1.232-.88.869 0 1.216.663 1.216 1.634v3.867h2.401V9.249c0-2.22-1.184-3.252-2.763-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169H6.25c.03.678 0 7.225 0 7.225h2.401Z" />
                    </svg>
                    LinkedIn
                  </span>
                  <span className="contact__value contact__link">{contact.linkedinLabel}</span>
                </a>
              </div>
            </div>

            <form className="contact__form" onSubmit={handleSubmit}>
              <p className="contact__transmission">Send a message</p>
              <div className="field-row">
                <label className="field">
                  <span className="field__label">Name</span>
                  <input
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                  />
                </label>
                <label className="field">
                  <span className="field__label">Email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="email@example.com"
                  />
                </label>
              </div>
              <label className="field">
                <span className="field__label">Message</span>
                <textarea
                  name="message"
                  rows="5"
                  required
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Role, timeline, and what you'd like to build together"
                />
              </label>

              <div className="contact__actions">
                <ActionButton as="button" type="submit" className="btn btn--primary">
                  Send via Gmail
                </ActionButton>
                <span className="contact__hint">Opens Gmail compose in a new tab — nothing is stored.</span>
              </div>
              {sent && <p className="contact__note" role="status">Opening Gmail compose…</p>}
            </form>
          </div>
        </div>
      </div>
    </section>
  )
}
