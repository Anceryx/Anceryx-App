import assert from 'node:assert/strict'
import { getAvatarInitials, resolveAvatarName } from '../src/renderer/utils/avatar.ts'

assert.equal(getAvatarInitials(undefined), '?')
assert.equal(getAvatarInitials(null), '?')
assert.equal(getAvatarInitials('   '), '?')
assert.equal(getAvatarInitials('ana silva'), 'AS')
assert.equal(getAvatarInitials('  ana  clara silva '), 'AC')
assert.equal(getAvatarInitials('anceryx'), 'A')
// Restored authentication is rendered before social profile hydration finishes.
assert.equal(resolveAvatarName('', 'Ana Silva', 'ana'), 'Ana Silva')
assert.equal(resolveAvatarName(undefined, undefined, 'ana'), 'ana')
assert.equal(resolveAvatarName('', '', ''), 'Anceryx')
process.stdout.write('Avatar/session restoration regression checks passed (9 cases).\n')
