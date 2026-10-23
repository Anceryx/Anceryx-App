import { createPrivateKey, createPublicKey } from 'node:crypto'

const TRUST_KEY_PATTERN = /UPDATE_MANIFEST_PUBLIC_KEY_PEM\s*=\s*`([\s\S]*?)`/

export function assertUpdateSigningKeyMatches(trustSource, privateKeyPem) {
  if (typeof privateKeyPem !== 'string' || !privateKeyPem.trim()) {
    throw new Error('The protected Ed25519 signing key is not configured.')
  }

  const match = TRUST_KEY_PATTERN.exec(trustSource)
  if (!match?.[1]?.trim()) {
    throw new Error('A production update-manifest public key is not pinned in the app.')
  }

  try {
    const pinnedPublic = createPublicKey(match[1].replace(/\\n/g, '\n'))
    const derivedPublic = createPublicKey(createPrivateKey(privateKeyPem))
    if (pinnedPublic.asymmetricKeyType !== 'ed25519' || derivedPublic.asymmetricKeyType !== 'ed25519') {
      throw new Error('The update signing key must use Ed25519.')
    }
    const pinnedDer = pinnedPublic.export({ type: 'spki', format: 'der' })
    const derivedDer = derivedPublic.export({ type: 'spki', format: 'der' })
    if (!derivedDer.equals(pinnedDer)) throw new Error('The protected signing key does not match the app public key.')
  } catch (error) {
    if (error instanceof Error && /^(The protected signing key|The update signing key)/.test(error.message)) throw error
    throw new Error('The configured update signing key is invalid or incompatible.')
  }

  return true
}
