import styles from './Wordmark.module.scss'

/** "Steward Pad": two words, two colours, 0.22 em apart. "Pad" goes Medium below 20 px. */
export function Wordmark({ size }: { size: number }) {
  return (
    <span className={styles.wordmark} style={{ fontSize: size }}>
      <b>Steward</b>
      <span className={size < 20 ? styles.padSmall : styles.pad}>Pad</span>
    </span>
  )
}
