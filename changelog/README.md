# Changelog

One Markdown file per release, named after its version: `0.2.0.md`, or `0.2.0-beta.1.md`
for a pre-release (a leading `v`, as in the git tag, is fine too). The website's
`/changelog` page lists them, newest first. A file whose name is not a version (like this
one) is not shown.

Each file starts with a short front matter block, then the notes in plain Markdown:

```markdown
---
version: 0.2.0
date: 2026-10-14
title: Faster review, cleaner exports
---

### Added

- Something a steward can now do, in their words.

### Fixed

- What was wrong, and what happens now.
```

- `version` matches the file name and the app version in `tauri.conf.json`. Pre-releases
  sort before their release: `0.1.0-alpha.1` comes before `0.1.0`.
- `date` is the release day, `YYYY-MM-DD`.
- `title` is one short line that sums the release up.
- Use `###` headings (Added, Changed, Fixed) for the sections.

Paste the same notes into the GitHub release: the app shows them when it offers the update.
`pnpm test` checks every file here, so a broken front matter fails the pull request.
