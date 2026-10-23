// Official production trust key. The matching private key exists only in the
// protected GitHub Actions secret and must never be copied into this repository.
export const UPDATE_MANIFEST_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAWtvd5/en3Vvs5GxfJ4uNLcVof2CoB33qU4D+CKf9EKc=
-----END PUBLIC KEY-----`

// The separate enablement gate lives in updateUtils.ts. A missing key also
// makes the verifier fail closed.
