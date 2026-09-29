import styles from './Home.module.scss'

/** A real screen of the app (captured at 2×), in a window frame. */
export function Screenshot({
  src,
  alt,
  eager,
  tall,
}: {
  src: string
  alt: string
  /** The hero's image: fetched first, not lazily. */
  eager?: boolean
  /** A portrait sheet (the decisions document) instead of the 16:10 window. */
  tall?: boolean
}) {
  return (
    <figure className={styles.frame} data-tall={tall || undefined}>
      <img
        src={src}
        alt={alt}
        width={tall ? 1440 : 2880}
        height={tall ? 2040 : 1800}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
      />
    </figure>
  )
}
