import { Link } from '../router'
import { Icon } from '../ui/Icon'
import { FEATURES, type Feature } from './features'
import { Screenshot } from './Screenshot'
import styles from './Home.module.scss'

function FeatureBlock({ feature }: { feature: Feature }) {
  return (
    <article className={styles.feature} id={feature.id} data-tall={feature.tall || undefined}>
      <div className={styles.featureText}>
        <span className={styles.featureLabel}>
          <Icon name={feature.icon} size={16} />
          {feature.label}
        </span>
        <h3>{feature.title}</h3>
        <p>{feature.body}</p>
        <ul>
          {feature.points.map((point) => (
            <li key={point}>
              <Icon name="check" size={16} />
              {point}
            </li>
          ))}
        </ul>
        <Link className={styles.more} to={feature.doc}>
          How it works <Icon name="arrow" size={16} />
        </Link>
      </div>
      <Screenshot src={feature.image} alt={feature.alt} tall={feature.tall} />
    </article>
  )
}

export function Features() {
  return (
    <section className={styles.features} id="features">
      <header className={styles.sectionHead}>
        <span className={styles.eyebrow}>Features</span>
        <h2>Built for the steward’s whole race weekend.</h2>
        <p>
          From the first lap to the published decision, one app for the job, laid out like race
          control: the standings never leave the screen.
        </p>
      </header>
      {FEATURES.map((feature) => (
        <FeatureBlock key={feature.id} feature={feature} />
      ))}
    </section>
  )
}
