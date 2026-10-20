# Windows installation and updates

No official installer has been published by the review workflow yet. Do not treat CI artifacts as official releases.

Once a version is approved, download the NSIS installer only from the `Anceryx/Anceryx-App` Releases page and check its notes and version. To update an existing installation, run the installer over the current installation and keep the app data. Do not uninstall the app or remove `%APPDATA%` during the transition.

## First update after the feed migration

Version `0.15.0` points to the old feed and cannot discover the new source automatically. The recommended transition version is stable `0.15.1`. The first update requires manually downloading and running the official installer; later versions may use the in-app updater after signed Windows QA.

Stable versions use the `latest` channel; beta versions use `beta.yml`. RC releases are for manual QA only. The app checks after 10 seconds and every six hours, without automatic downloads. The user chooses when to download and restart to install.

See also the [security model](UPDATE_SECURITY_MODEL.md), [QA checklist](UPDATE_QA_CHECKLIST.md), and [artifact pipeline](WINDOWS_RELEASE_PIPELINE.md).
