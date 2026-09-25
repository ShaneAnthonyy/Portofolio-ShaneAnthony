import { profile } from '../data/content.js'

export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="footer__inner">
        <p>
          {profile.name} · {profile.location}
        </p>
        <p>&copy; {year}. Designed & Built by Shane Anthony.</p>
      </div>
    </footer>
  )
}
