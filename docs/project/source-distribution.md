# Client source distribution

The script `scripts/export-public-client.ps1` uses an explicit allowlist, rejects private paths, and can run installation, typecheck, build, and production-dependency audit checks. Its historical validation does not replace review of the current repository state or Git history.

Before any distribution, review the exact commit, dependencies, third-party notices, fonts, assets, license, and build output. Do not include real .env files, private keys or certificates, tokens, user data, logs, dumps, backups, or private Git history.

The source-available terms are in the root LICENSE, with review context in [licensing notes](../legal/licensing-notes.md). Technical preparation is not authorization to publish or distribute.
