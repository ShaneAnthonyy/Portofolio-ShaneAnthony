import { useEffect, useRef, useState } from 'react'
import useSectionProgress from '../hooks/useSectionProgress.js'
import { scrollToSection } from '../animation/scrollTo.js'
import { useGSAP } from '../animation/gsap.js'
import { nudgeActiveLabel, playNavEntry, syncIndicator } from '../animation/navbar.js'

const LINKS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'certificates', label: 'Certificates' },
  { id: 'contact', label: 'Contact' },
]

function getInitialTheme() {
  if (typeof window === 'undefined') return 'light'
  const stored = window.localStorage.getItem('shane-theme')
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}

export default function Navbar({ diveActive = false, entered = true, diveProgress = 1, performanceMode = 'normal', onPerformanceModeChange = null }) {
  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState(getInitialTheme)
  const themeToggleRef = useRef(null)
  const headerRef = useRef(null)
  const linksRef = useRef(null)
  const logoRef = useRef(null)
  const linkRefs = useRef([])
  const entryPlayedRef = useRef(false)
  const prevActiveRef = useRef(null)
  const [travelOn, setTravelOn] = useState(false)
  // Pending click target: visual truth while smooth-scroll is in flight.
  // Ephemeral (null on load); cleared on observer confirm or interruption.
  const [pendingNavId, setPendingNavId] = useState(null)
  // DEV-only nav sync trace (?nav-debug=1). Query-gated, zero prod impact.
  const isNavDebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('nav-debug')
  // Single source of section/scroll state shared with the portfolio.
  const { activeId, scrollY, reduced } = useSectionProgress()
  // Single visual truth: clicked target while navigating, otherwise the
  // shared section detector. No second tracking system.
  const displayedActiveId = pendingNavId ?? activeId
  const scrolled = scrollY > 12
  const introHidden = diveActive && !entered
  const holdNavbarPosition = diveActive && diveProgress < 1
  
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('shane-theme', theme)
  }, [theme])

  // Dive lock: keep the mobile menu closed while the navbar position is
  // held for the cinematic. No scroll-phase state remains (no capsule).
  useEffect(() => {
    if (!holdNavbarPosition) return
    setOpen(false)
  }, [holdNavbarPosition])

  const handleLinkClick = (id) => {
    setOpen(false)
    // Navigation-intent lock: the click claims the visual state and keeps
    // it until physically interrupted or superseded by a newer click.
    // Navigation behavior below is unchanged. Newest click always wins.
    setPendingNavId(id)
    if (isNavDebug) {
      const target = document.getElementById(id)
      const targetTop = target ? Math.round(target.getBoundingClientRect().top + window.scrollY) : null
      // eslint-disable-next-line no-console
      console.log(
        '[NAV]',
        'CLICK',
        `target=${id}`,
        `pending=${id}`,
        `active=${activeId}`,
        `displayed=${id}`,
        `targetElement=#${id}`,
        `targetTop=${targetTop}`
      )
    }
    scrollToSection(id)
  }

  // Navigation-intent lock: while a claim is pending it stays authoritative.
  // Intermediate activeIds during smooth scroll are expected journey states
  // (including transient matches of the target itself) — never clearance.
  // The lock releases only on physical interruption below or a newer click.
  // No timers, no heuristics, no observer confirmation.
  useEffect(() => {
    if (!pendingNavId) return
    if (isNavDebug) {
      // eslint-disable-next-line no-console
      console.log('[NAV]', 'ACTIVE', `active=${activeId}`, `pending=${pendingNavId}`, `displayed=${pendingNavId}`)
    }
  }, [activeId, pendingNavId, isNavDebug])

  // Genuine manual interruption: physical input while a claim is pending.
  // Programmatic smooth scroll emits none of these, so the journey can
  // never cancel itself. Mounted only during pending — never global.
  useEffect(() => {
    if (!pendingNavId) return
    const cancel = () => {
      if (isNavDebug) {
        // eslint-disable-next-line no-console
        console.log('[NAV]', 'USER-INPUT', 'pending=null', `displayed follows shared activeId`)
      }
      setPendingNavId(null)
    }
    const onKey = (event) => {
      if (
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)
      ) {
        cancel()
      }
    }
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchmove', cancel, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchmove', cancel)
      window.removeEventListener('keydown', onKey)
    }
  }, [pendingNavId, isNavDebug])

  // GSAP settling entrance: once per unlock, after the dive releases the
  // portfolio. Visual tween only — dive/unlock/docking state logic is
  // untouched. Played-flag sets on completion so a killed/unmounted run
  // (StrictMode dev, replay) correctly replays instead of going missing.
  useGSAP(
    () => {
      if (reduced || entryPlayedRef.current || !entered) return
      const header = headerRef.current
      if (!header) return
      // Suppress the CSS intro transitions while GSAP owns these properties.
      header.classList.add('gsap-entry')
      const tl = playNavEntry({
        header,
        logo: logoRef.current,
        items: linkRefs.current.filter(Boolean),
        toggle: themeToggleRef.current,
      })
      tl.eventCallback('onComplete', () => {
        entryPlayedRef.current = true
        header.classList.remove('gsap-entry')
      })
      return () => {
        tl.kill()
        header.classList.remove('gsap-entry')
      }
    },
    { scope: headerRef, dependencies: [entered, reduced] }
  )

  // Traveling active indicator: discrete sync on section change.
  // No scroll listeners, no per-frame state; reduced motion keeps the
  // instant per-link underline instead.
  useGSAP(
    () => {
      if (reduced) return
      const container = linksRef.current
      const moved = prevActiveRef.current !== null && prevActiveRef.current !== displayedActiveId
      prevActiveRef.current = displayedActiveId
      const ok = syncIndicator(container, { animate: moved })
      if (ok) {
        setTravelOn((v) => (v ? v : true))
        if (moved) {
          nudgeActiveLabel(container.querySelector('.navbar__link.is-active'))
        }
      }
      const onResize = () => syncIndicator(container, { animate: false })
      window.addEventListener('resize', onResize)
      return () => window.removeEventListener('resize', onResize)
    },
    { scope: headerRef, dependencies: [displayedActiveId, reduced, entered] }
  )

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  // Phase 12: adaptive performance toggle. OFF = NORMAL, ON = LITE.
  const lite = performanceMode === 'lite'

  return (
    <header
      ref={headerRef}
      className={`navbar ${scrolled ? 'is-scrolled' : ''}`}
      data-intro-hidden={introHidden || undefined}
      data-dive-locked={(diveActive && !entered) || undefined}
    >
      <div className="navbar__inner">
        <a
          href="#home"
          className="navbar__logo"
          ref={logoRef}
          inert={introHidden ? '' : undefined}
          aria-hidden={introHidden || undefined}
          onClick={(e) => {
            e.preventDefault()
            handleLinkClick('home')
          }}
        >
          Shane<span className="dot">.</span>
        </a>

        <nav
          className={`navbar__links${travelOn ? ' has-travel-indicator' : ''}`}
          aria-label="Primary"
          ref={linksRef}
          inert={introHidden ? '' : undefined}
          aria-hidden={introHidden || undefined}
        >
          <span className="navbar__indicator" aria-hidden="true" />
          {LINKS.map((link, i) => (
            <button
              key={link.id}
              ref={(el) => {
                linkRefs.current[i] = el
              }}
              className={`navbar__link ${displayedActiveId === link.id ? 'is-active' : ''}`}
              aria-current={displayedActiveId === link.id ? 'page' : undefined}
              onClick={() => handleLinkClick(link.id)}
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="navbar__actions">
          <button
            type="button"
            className="theme-toggle"
            ref={themeToggleRef}
            onClick={toggleTheme}
            aria-pressed={theme === 'dark'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            className={`lite-toggle${lite ? ' is-on' : ''}`}
            onClick={() => onPerformanceModeChange && onPerformanceModeChange(lite ? 'normal' : 'lite')}
            aria-pressed={lite}
            aria-label={lite ? 'Switch to normal performance mode' : 'Switch to lite performance mode'}
            title={lite ? 'Lite mode on: switch to normal' : 'Switch to lite mode'}
            inert={introHidden ? '' : undefined}
            aria-hidden={introHidden || undefined}
          >
            <span className="lite-toggle__dot" aria-hidden="true" />
            <span className="lite-toggle__label" aria-hidden="true">
              Lite
            </span>
          </button>
          <button
            className={`navbar__toggle ${open ? 'is-open' : ''}`}
            aria-label="Open menu"
            aria-expanded={open}
            inert={introHidden ? '' : undefined}
            aria-hidden={introHidden || undefined}
            onClick={() => setOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      <div
        className={`navbar__mobile ${open ? 'is-open' : ''}`}
        inert={introHidden ? '' : undefined}
        aria-hidden={introHidden || undefined}
      >
        {LINKS.map((link) => (
          <button
            key={link.id}
            className={`navbar__mobile-link ${displayedActiveId === link.id ? 'is-active' : ''}`}
            onClick={() => handleLinkClick(link.id)}
          >
            {link.label}
          </button>
        ))}
      </div>
    </header>
  )
}
