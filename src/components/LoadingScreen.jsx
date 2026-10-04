const BLOCKS = 20

export default function LoadingScreen({ progress = 0, ready = false, onEnter = null }) {
  const pct = Math.round(Math.min(Math.max(progress, 0), 1) * 100)
  const filled = Math.round((pct / 100) * BLOCKS)
  return (
    <div className="loading-screen" role="status" aria-label="Loading portfolio">
      <div className="loading-screen__inner">
        <p className="loading-screen__label">{ready ? 'READY' : 'LOADING...'}</p>
        <div
          className={`loading-screen__bar${ready ? ' is-ready' : ''}`}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Initialization progress"
          aria-hidden={ready || undefined}
        >
          {Array.from({ length: BLOCKS }, (_, i) => (
            <span
              key={i}
              className={`loading-screen__block${i < filled ? ' is-on' : ''}`}
            />
          ))}
        </div>
        <p className="loading-screen__pct" aria-live="polite">{ready ? 'READY' : `${pct}%`}</p>
        {ready && (
          <button type="button" className="loading-screen__enter" onClick={onEnter} autoFocus>
            ENTER PORTFOLIO
          </button>
        )}
      </div>
    </div>
  )
}
