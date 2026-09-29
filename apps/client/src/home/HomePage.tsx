import { useTitle } from '../router'
import { Button } from '../ui/Button'
import { Faq } from './Faq'
import { Features } from './Features'
import { Hero } from './Hero'
import { Privacy, Steps, Team } from './Sections'
import styles from './Home.module.scss'

/** The final call: the brand's alt tile red, the one place the site goes loud. */
function CallToAction() {
  return (
    <section className={styles.cta}>
      <h2>Ready for race day?</h2>
      <p>Install StewardPad, open the simulator, and log your first incident in two minutes.</p>
      <div className={styles.actions}>
        <Button to="/download" kind="secondary" icon="windows" large>
          Download for Windows
        </Button>
        <Button to="/docs/install" kind="ghost" icon="book" large>
          Getting started
        </Button>
      </div>
    </section>
  )
}

export function HomePage() {
  useTitle('')
  return (
    <>
      <Hero />
      <Features />
      <Team />
      <Steps />
      <Privacy />
      <Faq />
      <CallToAction />
    </>
  )
}
