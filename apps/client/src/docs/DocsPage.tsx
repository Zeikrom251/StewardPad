import { Link, useDescription, useTitle } from '../router'
import { Icon } from '../ui/Icon'
import { NotFound } from '../layout/NotFound'
import { DOCS, SECTIONS, type Doc } from './registry'
import styles from './Docs.module.scss'

function Sidebar({ current }: { current: Doc }) {
  return (
    <nav className={styles.sidebar} aria-label="Documentation">
      {/* On a phone the sidebar folds away behind the current page's name. */}
      <details className={styles.menu}>
        <summary>
          <Icon name="menu" size={18} />
          {current.title}
        </summary>
        <SidebarLinks current={current} />
      </details>
      <div className={styles.full}>
        <SidebarLinks current={current} />
      </div>
    </nav>
  )
}

function SidebarLinks({ current }: { current: Doc }) {
  return (
    <>
      {SECTIONS.map(([section, docs]) => (
        <div key={section} className={styles.group}>
          <b>{section}</b>
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              to={`/docs/${doc.slug}`}
              aria-current={doc.slug === current.slug ? 'page' : undefined}
            >
              {doc.title}
            </Link>
          ))}
        </div>
      ))}
    </>
  )
}

function PrevNext({ index }: { index: number }) {
  const prev = DOCS[index - 1]
  const next = DOCS[index + 1]
  return (
    <div className={styles.prevNext}>
      {prev && (
        <Link to={`/docs/${prev.slug}`}>
          <span>Previous</span>
          {prev.title}
        </Link>
      )}
      {next && (
        <Link to={`/docs/${next.slug}`} className={styles.next}>
          <span>Next</span>
          {next.title}
        </Link>
      )}
    </div>
  )
}

/** /docs opens the first page; /docs/<slug> the one named. */
export function DocsPage({ slug }: { slug: string }) {
  const index = slug ? DOCS.findIndex((d) => d.slug === slug) : 0
  const doc = DOCS[index]
  useTitle(doc ? doc.title : 'Page not found')
  useDescription(doc?.summary ?? '')
  if (!doc) return <NotFound />
  const { Page } = doc
  return (
    <div className={styles.docs}>
      <Sidebar current={doc} />
      <article className={styles.article}>
        <span className={styles.section}>
          {SECTIONS.find(([, docs]) => docs.includes(doc))?.[0]}
        </span>
        <h1>{doc.title}</h1>
        <Page />
        <PrevNext index={index} />
      </article>
    </div>
  )
}
