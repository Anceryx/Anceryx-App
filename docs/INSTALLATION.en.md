# Windows installation and updates

The `v0.15.0` Release has no official installer. CI artifacts are temporary, expire after three days, and are for review only; do not treat them as official Releases.

Once a version is approved, download the NSIS installer only from the `Anceryx/Anceryx-App` Releases page and check its notes and version. To update an existing installation, run the installer over the current installation and keep the app data. Do not uninstall the app or remove `%APPDATA%` during the transition.

## First update after the feed migration

Older installations may use a feed that is not fully represented in this repository; do not assume they will discover the new source. Transition requires manually downloading and running an approved official installer over the current installation. Do not uninstall the app or remove `%APPDATA%`.

The in-app updater is disabled until stable Ed25519 manifest verification is available and a trusted public key is embedded in the app. Stable, beta, and RC versions are not checked automatically right now. After review and QA, stable can use `latest`, beta can use `beta.yml`, and RC remains manual QA only.

See also the [security model](UPDATE_SECURITY_MODEL.md), [QA checklist](UPDATE_QA_CHECKLIST.md), and [artifact pipeline](WINDOWS_RELEASE_PIPELINE.md).
