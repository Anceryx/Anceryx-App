// A trusted release key is intentionally absent until the owner provisions and
// reviews the Ed25519 key pair. Never replace this with an example/test key.
export const UPDATE_MANIFEST_PUBLIC_KEY_PEM = ``

// The separate enablement gate lives in updateUtils.ts. A missing key also
// makes the verifier fail closed.
