# Brand and artwork

The Anceryx Source-Available License covers only the client source code identified in that license. It does not grant rights to the Anceryx name, logos, Kaoli, mascots, banners, icons, illustrations, visual identity, domain names, or other brand and artwork assets.

The official client repository includes some artwork required to build the official application. Inclusion in the source tree does not grant permission to use those materials to identify, market, or endorse an unofficial product. Third-party assets remain subject to their own terms.

Ownership, permitted uses, trademark policy, redistribution, and replacement-asset rules require separate review. This document is not legal advice.

## Repository inventory

Before public publication or binary distribution, obtain and record confirmation from the rights holder for each asset group below. The current repository snapshot does not contain that evidence.

The current client snapshot contains 60 tracked raster/vector assets:

| Group and paths | Count | Purpose | Source and rights evidence in this repository |
| --- | ---: | --- | --- |
| `.github/assets/anceryx-banner.png` | 1 PNG | README banner | Identified as the official Anceryx banner; no source file, creator record, or separate asset license is recorded here. Preserve the original artwork. Owner confirmation of authorship and publication rights is still required. |
| `resources/icon.png`, `src/renderer/assets/icon.png` | 2 PNG | Windows/build and in-app icon use | No per-file creator record or separate asset license is recorded. Confirm authorship and redistribution rights. |
| `src/renderer/assets/mascot/*.png` | 24 PNG | Kaoli mascot states, themes, and promotional/feature illustrations | The filenames and UI references identify these as Anceryx/Kaoli artwork. That identification is not proof of authorship, AI-generation terms, or ownership. Confirm each source and right to publish and distribute. |
| `src/renderer/assets/emojis/*.png` | 24 PNG | Client reaction/emote illustrations | No per-file source or third-party license is recorded. Confirm whether each is original, commissioned, or third-party and retain required attribution. |
| `src/renderer/assets/badges/*.svg` | 9 SVG | Client badge illustrations | No per-file source or third-party license is recorded. Confirm authorship, source files, and redistribution rights. |

The inventory was counted from the tracked tree. The 51 PNGs contain no embedded EXIF, text, or international-text metadata chunks; the 9 SVGs contain no creator metadata or external asset links. This metadata check does not establish authorship or clear copyright. No font files are tracked; UI icon glyphs are provided through the separately licensed `lucide-react` dependency.

All listed assets are part of the public source snapshot, and the client build references the application assets. Removing an asset without tracing its consumers may break the interface, so unresolved rights should be reviewed and replacements prepared before publication rather than deleting files blindly. The banner and Kaoli artwork must not be modified without the owner's approval.

| Asset group | Required confirmation | Current status |
| --- | --- | --- |
| Official banner | Authorship and permission to publish the original image in this repository | Pending human confirmation |
| Application icons | Authorship and permission to include in source and official builds | Pending human confirmation |
| Kaoli and mascot artwork | Authorship, commissioned-work terms, and source/publication rights | Pending human confirmation |
| Emoji artwork | Original or third-party origin, redistribution rights, and attribution requirements | Pending human confirmation |
| Badge illustrations | Authorship, source files, and source/build redistribution rights | Pending human confirmation |

Do not treat a successful build, file metadata, or the custom source license as clearance for these separate assets.
