/** "Steward Pad": two words, two colours, 0.22 em apart. "Pad" goes Medium below 20 px. */
export function Wordmark({ size }: { size: number }) {
  return (
    <span className="sp-wordmark" style={{ fontSize: size }}>
      <b>Steward</b>
      <span className="sp-wordmark-pad" data-small={size < 20 || undefined}>
        Pad
      </span>
    </span>
  )
}
