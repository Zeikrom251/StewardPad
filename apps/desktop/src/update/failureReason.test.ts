import { test } from 'node:test'
import assert from 'node:assert/strict'
import { failureReason } from './failureReason'

test('names the real reason a check failed, not always the network', () => {
  const noLinuxBuild =
    'the platform `linux-x86_64` was not found in the response `platforms` object'
  assert.match(failureReason(noLinuxBuild), /built for Windows/)
  assert.match(failureReason('Could not fetch a valid release JSON from the remote'), /No release/)
  assert.match(
    failureReason('error sending request for url (https://github.com/…)'),
    /reach GitHub/,
  )
  assert.equal(failureReason(new Error('odd')), 'Could not check for updates: odd')
})
