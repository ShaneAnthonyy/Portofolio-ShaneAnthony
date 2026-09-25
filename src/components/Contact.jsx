import { useState } from 'react'
import MagneticButton from './MagneticButton.jsx'
import { contact } from '../data/content.js'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Internship / collaboration — ${form.name || 'website'}`)
    const body = encodeURIComponent(
      `Hi Shane,\n\n${form.message}\n\n— ${form.name} (${form.email})`
    )
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}&su=${subject}&body=${body}`,
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
    <section id="contact" className="section contact">
      <div className="section__layout">
        <aside className="section__rail">
          <p className="section__eyebrow">06 — Contact</p>
          <h2 className="section__title">Get in touch</h2>
          <p className="section__sub">
            Open to frontend internships, project collaboration, or research chat.
          </p>
        </aside>

        <div className="section__body">
          <div className="contact__grid">
            <div className="contact__info">
              <p className="contact__availability">
                <span className="contact__dot" aria-hidden="true" />
                {contact.availability}
              </p>
              <p className="contact__response">{contact.responseTime} · {contact.location}</p>

              <div className="contact__details">
                <div className="contact__item">
                  <span className="contact__label">Email</span>
                  <span className="contact__row">
                    <a className="contact__value contact__link" href={`mailto:${contact.email}`}>
                      {contact.email}
                    </a>
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
                <div className="contact__item contact__item--static">
                  <span className="contact__label">Phone / WhatsApp</span>
                  <span className="contact__value">{contact.phoneDisplay}</span>
                </div>
                <a
                  className="contact__item"
                  href={contact.linkedin}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="contact__label">LinkedIn</span>
                  <span className="contact__value contact__link">{contact.linkedinLabel}</span>
                </a>
              </div>
            </div>

            <form className="contact__form" onSubmit={handleSubmit}>
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
                <MagneticButton as="button" type="submit" className="btn btn--primary">
                  Send via Gmail
                </MagneticButton>
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
