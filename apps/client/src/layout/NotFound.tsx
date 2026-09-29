import { useTitle } from '../router'
import { Button } from '../ui/Button'
import styles from './NotFound.module.scss'

export function NotFound() {
  useTitle('Page not found')
  return (
    <section className={styles.notFound}>
      <span className={styles.flag}>Red flag</span>
      <h1>This page is off track.</h1>
      <p>The link may be old, or the page moved. The docs and the download are one click away.</p>
      <div className={styles.actions}>
        <Button to="/" kind="primary">
          Back to the home page
        </Button>
        <Button to="/docs" icon="book">
          Documentation
        </Button>
      </div>
    </section>
  )
}
