import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from './Markdown'

const render = (text: string) => renderToStaticMarkup(createElement(Markdown, { text }))

test('renders the Markdown the How to pay text uses', () => {
  const html = render(
    '## How to pay\n\n1. Pick **1, 2 or 3 months**\n2. Write to [billing@stewardpad.com](mailto:billing@stewardpad.com)',
  )
  assert.match(html, /<h3>How to pay<\/h3>/)
  assert.match(html, /<ol><li>.*<strong>1, 2 or 3 months<\/strong>/)
  assert.match(html, /billing@stewardpad.com/)
})

test('never renders raw HTML, a script or a link the webview would follow', () => {
  const html = render(
    '<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n[click](javascript:alert(1)) [site](https://stewardpad.com)',
  )
  assert.doesNotMatch(html, /<script|<img|onerror|javascript:|<a /i)
  assert.match(html, /click/)
  assert.match(html, /site/)
})
