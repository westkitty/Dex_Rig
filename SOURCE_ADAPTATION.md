# StillBreath Studio → Dex Rig: source adaptation record

**Evidence:** user-provided `BetterCapture_2026-11-03-02.06.50.mov` (366 seconds, 1280×686 screen recording). The recording shows code displayed in Google Flow's tool editor for a project titled **StillBreath Studio**. It is not a source repository, export archive, or executable test of the original app. Observations are confined to visible UI/code and should not be mistaken for complete source retrieval.

| Clip region (approx.) | Visible system | Dex Rig adaptation | Evidence state |
| --- | --- | --- | --- |
| 00:00–00:25 | `types.ts`: layer, transform, keyframe and easing types | `engine.js` layer transform model, normalized pivots and keyframe interpolation | Seen in video; reimplemented independently |
| 00:45–02:15 | `services/sampleCharacter...`: vector-like character composed of named layers, hierarchy and recurring micro-motions | Generic geometric rig demo with body, head, ears, tail and blink layers | Seen in video; demo artwork is original and deliberately noncanonical |
| 02:20–02:50 | `services/animationEngine...`: oscillator types and evaluated layer transform | Deterministic breath, bob, sway, blink, twitch, tail sway, float signals | Seen in video; behavior tested in Dex Rig |
| 02:55–04:05 | Layer editor, timeline, reaction presets, seamless-loop and export UI components | Pose inspector, keyframe track, semantic motion presets, boundary check and local export | Seen in video; adapted UI implemented |
| 04:05–04:35 | `components/RegionSelect...`: polygon point bounds, feather radius, region canvas extraction | Manual polygon extraction, image masking, saved original source; not full auto-segmentation | Core concept implemented; feathering/auto-segmentation omitted |
| 04:35–05:35 | `App.tsx`: scene state, playback, canvas, export, image/region modal hookups | Independent browser editor and single-clock canvas renderer | Visible architecture; adapted without framework dependency |
| 05:35–06:06 | Auto-rigging UI/services and component connections | Deferred; no claims of inferred anatomy | Concept identified, not implemented |

## Deliberate design differences

1. Vanilla browser JavaScript with no runtime dependencies or cloud services, instead of copying the Flow/React tool structure.
2. Local data-URI raster assets and editable JSON backups, so the user's original character images are not fetched by network.
3. A single deterministic animation evaluation path for preview, GIF, PNG and sprite sheet, preventing playback/export divergence.
4. Strict hierarchy-cycle validation and visibility propagation, local backup boundaries, renderer cleanup on page hide, and transparent image exports.
5. No claim that automatically segmented parts reconstruct hidden anatomy or match a character's approved canonical artwork.

## External precedent consulted (conceptual only)

Rive's documented separation of timeline animation and state-machine inputs reinforces keeping motion data separate from character artwork: <https://rive.app/>. Live2D Cubism's eye-blink parameter guidance supports treating eye closure as a separately controlled parameter rather than a hard-coded frame sequence: <https://docs.live2d.com/en/cubism-sdk-tutorials/eyeblink/>. No code or assets from either project were incorporated.

## Unavailable original-source proof

The recording shows code *on screen*, but it does not furnish an original source archive, repository URL, dependency lockfile, full context of all source files, successful original build, or rights/usage grant for redistribution of the original project code. Accordingly, Dex Rig contains an original implementation of observed ideas, not a verbatim code transplant.
