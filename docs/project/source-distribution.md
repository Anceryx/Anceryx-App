# Client source distribution

The script `scripts/export-public-client.ps1` uses an explicit allowlist, rejects private paths, and can run installation, typecheck, build, and production-dependency audit checks. Its historical validation does not replace review of the current repository state or Git history.

Before any distribution, review the exact commit, dependencies, third-party notices, fonts, assets, license, and build output. Do not include real .env files, private keys or certificates, tokens, user data, logs, dumps, backups, or private Git history.

The client code is under Apache License 2.0 in the root `LICENSE`; official brand and artwork files have separate terms in [ASSETS_LICENSE.md](../../ASSETS_LICENSE.md). Confirm all rights and notices for the exact source snapshot and release artifact before public distribution. Technical preparation is not a substitute for rights clearance.
