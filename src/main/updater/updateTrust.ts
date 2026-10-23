// A trusted release key is intentionally absent until the owner provisions and
// reviews the Ed25519 key pair. Never replace this with an example/test key.
export const UPDATE_MANIFEST_PUBLIC_KEY_PEM = ``

// This remains false until a pinned production public key and Windows QA are
// complete. A missing key also makes the verifier fail closed.
export const UPDATE_MANIFEST_SIGNATURE_VERIFICATION_ENABLED = false
