import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import useSectionProgress from '../hooks/useSectionProgress.js'
import { scrollToSection } from '../animation/scrollTo.js'
import { gsap, useGSAP } from '../animation/gsap.js'
import { nudgeActiveLabel, playNavEntry, syncIndicator } from '../animation/navbar.js'
import { dockProgress } from '../animation/diveArrival.js'
import WorldTimeController from './WorldTimeController.jsx'

const LINKS = [
  { id: 'about', label: 'About' },
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'certificates', label: 'Certifications' },
  { id: 'contact', label: 'Contact' },
]

function SpeakerOnIcon() {
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
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.6 5.4a9 9 0 0 1 0 13.2" />
    </svg>
  )
}

function SpeakerOffIcon() {
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
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="m22 9-6 6M16 9l6 6" />
    </svg>
  )
}

export default function Navbar({ diveActive = false, entered = true, diveProgress = 1, arrivalRef, performanceMode = 'normal', onPerformanceModeChange = null, musicOn = false, musicLoading = false, musicFailed = false, onMusicToggle = null }) {
  const [open, setOpen] = useState(false)
  const worldTimeRef = useRef(null)
  const dockRef = useRef(null)
  const dockSourceRef = useRef(null)
  const headerRef = useRef(null)
  const linksRef = useRef(null)
  const logoRef = useRef(null)
  const linkRefs = useRef([])
  const entryPlayedRef = useRef(false)
  const prevActiveRef = useRef(null)
  const [travelOn, setTravelOn] = useState(false)
  const [pendingNavId, setPendingNavId] = useState(null)
  const isNavDebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('nav-debug')
  const { activeId, scrollY, reduced } = useSectionProgress()
  const displayedActiveId = pendingNavId ?? activeId
  const scrolled = entered && scrollY > 12
  const introHidden = diveActive && !entered
  const holdNavbarPosition = diveActive && diveProgress < 1

  useEffect(() => {
    if (!holdNavbarPosition) return
    setOpen(false)
  }, [holdNavbarPosition])

  useLayoutEffect(() => {
    const dock = dockRef.current
    if (!dock || !arrivalRef) return
    let timeline
    const update = value => {
      headerRef.current.style.setProperty('--arrival-progress', value)
      const p = reduced ? Number(value === 1) : dockProgress(value)
      if (!diveActive || p === 1) {
        timeline?.progress(1)
        gsap.set(dock, { clearProps: 'transform' })
      } else {
        timeline?.progress(p)
      }
    }
    const measure = () => {
      timeline?.kill()
      gsap.set(dock, { clearProps: 'transform' })
      headerRef.current.style.removeProperty('--arrival-progress')
      if (!diveActive) return
      const to = dock.getBoundingClientRect()
      const from = dockSourceRef.current.getBoundingClientRect()
      timeline = gsap.fromTo(dock, { x: from.x - to.x, y: from.y - to.y }, { x: 0, y: 0, duration: 1, ease: 'none', paused: true })
      update(arrivalRef.current.progress)
    }
    arrivalRef.current.update = update
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(headerRef.current)
    observer.observe(dock.parentElement)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      arrivalRef.current.update = null
      timeline?.kill()
      gsap.set(dock, { clearProps: 'transform' })
    }
  }, [arrivalRef, diveActive, reduced])

  const handleLinkClick = (id) => {
    if (introHidden) return
    setOpen(false)
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

  useEffect(() => {
    if (!pendingNavId) return
    if (isNavDebug) {
      // eslint-disable-next-line no-console
      console.log('[NAV]', 'ACTIVE', `active=${activeId}`, `pending=${pendingNavId}`, `displayed=${pendingNavId}`)
    }
  }, [activeId, pendingNavId, isNavDebug])

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

  useGSAP(
    () => {
      if (diveActive || reduced || entryPlayedRef.current || !entered) return
      const header = headerRef.current
      if (!header) return
      header.classList.add('gsap-entry')
      const tl = playNavEntry({
        header,
        logo: logoRef.current,
        items: linkRefs.current.filter(Boolean),
        toggle: worldTimeRef.current,
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
    { scope: headerRef, dependencies: [entered, reduced, diveActive] }
  )

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

  const lite = performanceMode === 'lite'

  return (
    <header
      ref={headerRef}
      className={`navbar ${scrolled ? 'is-scrolled' : ''}`}
      data-intro-hidden={introHidden || undefined}

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
          <span className="navbar__dock-source" ref={dockSourceRef} aria-hidden="true" />
          <div className="navbar__dock" ref={dockRef}>
          <button
            type="button"
            className="audio-toggle"
            onClick={() => onMusicToggle && onMusicToggle()}
            disabled={musicFailed || undefined}
            aria-pressed={musicOn}
            aria-busy={musicLoading || undefined}
            aria-label={
              musicFailed
                ? 'Background music unavailable'
                : musicLoading
                  ? 'Loading background music…'
                  : musicOn
                    ? 'Turn background music off'
                    : 'Turn background music on'
            }
            title={
              musicFailed
                ? 'Background music unavailable'
                : musicLoading
                  ? 'Loading background music…'
                  : musicOn
                    ? 'Turn background music off'
                    : 'Turn background music on'
            }
          >
            {musicOn ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
          </button>
          <WorldTimeController triggerRef={worldTimeRef} />
          </div>
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
