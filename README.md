# Dex Rig

A dependency-free, offline 2D character-motion workbench. Import your own character art, organize it as a hierarchy, animate with keyframes and procedural motion, and export reusable animation files.

**Status:** working initial browser studio. This is layered 2D transform rigging, not a skeletal mesh-deformation system. No approved Dexter character art is bundled. The starting scene is deliberately generic geometric test artwork.

## Start

Open `index.html` in a modern desktop browser. All required scripts and styles are local files. No build, npm install, account, network connection, or remote API is needed. For a local development server, run `python3 -m http.server 8080` in this folder and open `http://127.0.0.1:8080/`.

To publish as GitHub Pages, enable Pages for this repository's default branch and root folder in repository settings. The repo being present does not mean Pages is already enabled.

## Workflow

1. Choose **New** to remove the geometric demo, or keep it for an animation exercise.
2. **Add image layer** imports PNG, JPEG, or WebP (up to 8 MB per file). Use transparent individual parts where possible. Imported images stay embedded locally as raster data.
3. Select a layer to adjust its **parent**, z-order, opacity, anchor/pivot, transform, and size. Drag an unlocked layer on the stage or use the numeric fields for keyboard access.
4. For a flattened source illustration, select its stationary root layer and choose **Cut out region**. Mark a polygon on the stage, or enter points by keyboard. Extracting creates a new movable layer, masks that region from the original, and keeps a copy of the original for recovery. It does *not* inpaint missing art behind the cut.
5. Add **keyframes** at points along the timeline and **micro-motion oscillators** on layers. Keyframes store complete transforms. Presets address semantically named layers, so renaming can influence which oscillator a preset chooses.
6. Use the **Motion readout** to check whether start and end transforms align. Scrub the timeline or play the loop.
7. Use **Export** for a still PNG, transparent PNG sprite sheet, animated GIF, or editable `.dexrig.json` backup.

## Features

- Parent-child scene graph with validated cycle-free hierarchies, normalized pivots, visibility/lock/z-order, alpha compositing, and time-based transforms.
- Eased keyframe interpolation and reusable motions: breathing, bobbing, sway, blink, ear twitch, tail sway, and float.
- Configurable duration and export FPS; playback has a single animation-frame clock and pauses when the document becomes hidden.
- Scene-accurate transparent raster exports. GIFs use local palette quantization and in-browser LZW encoding; the output is limited to 360 px, 90 frames, and at most 15 FPS. Sprite sheets have a 40-million-pixel safety limit.
- Local browser autosave for small projects; oversized projects require explicit **Save project** backups. JSON embeds source artwork and may grow large. No remote storage or telemetry.
- Responsive editing, keyboard numerical editing, keyboard polygon points, reduced-motion CSS support, and live status messages.

## Limitations and decisions

- **No automatic anatomical auto-rigging.** Cutout selection is manual and restricted to an unanimated, unparented source layer. Separating a flattened figure cannot reveal occluded ears, limbs or fur without additional source art.
- **Rigid transformations, not skinning.** Rotations/scales translate each image layer as a unit. There is no mesh warp, inverse kinematics, bone-weight solver, or 3D model generation.
- **Pixel-perfect loop verification is not implied.** The loop check evaluates world transform boundaries, not animated pixel similarity, and image palette reductions can change colors in GIF output.
- **No WebM or APNG exporter yet.** GIF and sprite sheets were the highest-value self-contained formats for the initial port.
- **Local file compatibility can be host-policy dependent.** Development tests used inline code injection into an empty Chromium page because the test environment blocks direct file/localhost navigation; actual GitHub Pages hosting and user-device `file://` opening remain separate verification tasks.
- **Do not import unapproved character likenesses as examples.** Add approved artwork explicitly to keep the reusable engine separate from any single character's identity.

## Code layout

- `index.html`: semantic layout and controls
- `styles.css`: dark workbench UI and responsive rules
- `engine.js`: deterministic layer transforms, animation and loop analysis
- `gif.js`: browser/Node-compatible GIF encoding
- `studio.js`: UI, file import, polygon extraction, timeline, preview, persistence and exports
- `SOURCE_ADAPTATION.md`: observations and implementation provenance from the supplied screen recording
- `OPERATIONAL_STATE.md`: verified and unverified project state
- `tests/test_engine.cjs`: dependency-free Node tests
- `tests/integration_browser.py`, `tests/export_browser.py`: optional Playwright/Pillow UI/export smoke checks

## Verify

```sh
node --test tests/test_engine.cjs
```

The optional browser tests need Python Playwright, Pillow and a working Chromium installation. They load the exact shipped markup, styles and scripts into an about:blank page rather than navigating a filesystem URL, to accommodate this test environment's browser policy.

## Scope boundary

Dex Rig is its own repository and does **not** replace or modify `Dexter_Desk_Familiar`. Any future integration with the familiar requires a separate preview comparing motion and visual quality against its approved animation clips.
