export default function FishSkill({ fish, hovered, held, below, selected, outerRef }) {
  return (
    <div
      ref={outerRef}
      className={`fish${hovered ? ' is-hovered' : ''}${held ? ' is-held' : ''}${selected ? ' is-selected' : ''}`}
      aria-hidden="true"
      style={{ width: fish.w }}
    >
      <span className="fish__visual">
        <span className="fish__wiggle">
          <img
            src={fish.img}
            alt=""
            className="pixelated"
            draggable="false"
            style={{ width: '100%', display: 'block' }}
          />
        </span>
      </span>
      {held && (
        <span className="capture-bubbles" aria-hidden="true">
          {[-14, -7, 0, 7, 14].map((x, n) => (
            <span
              key={n}
              className="capture-bubble"
              style={{
                '--cb-x': `${x}px`,
                '--cb-size': `${[4, 6, 5, 7, 4][n]}px`,
                '--cb-delay': `${-(n * 0.35)}s`,
                '--cb-dur': `${1.4 + (n % 3) * 0.3}s`,
              }}
            />
          ))}
        </span>
      )}
      {hovered && !selected && (
        <span
          className="fish-tip"
          style={
            below
              ? { top: 'calc(100% + 6px)', bottom: 'auto' }
              : { bottom: 'calc(100% + 8px)', top: 'auto' }
          }
        >
          {fish.skill} · {fish.tier}
        </span>
      )}
    </div>
  )
}
