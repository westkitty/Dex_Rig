# Dex Rig — Operational State

project_id: westkitty/Dex_Rig  
state_revision: 1  
last_reviewed: 2026-11-03  
primary_artifact: offline browser studio in repository root

## Current authority

- User's current task: analyze the supplied screen recording and apply useful code/techniques to `westkitty/Dex_Rig`.
- At initial inspection on 2026-11-03 the GitHub repository existed but was empty (`size: 0`, no commits; contents API returned 404 "This repository is empty"). This was a greenfield implementation, **not** an edit to an existing source tree.
- No approved Dexter reference art was supplied for this task. The shipped demo is generic and is not claimed to depict Dexter.
- The standalone `Dexter_Desk_Familiar` repository and its approved animation clips are out of scope.

## Implemented and validated

- [VERIFIED / unit] Numerical keyframe interpolation; deterministic oscillator motion; cycle rejection; parent transforms; visibility inheritance; seam analysis; data validation; GIF encoder smoke.
- [VERIFIED / Chromium about:blank test] Stage draws nontransparent demo art; play produces changing frames; layer controls/keyframes; polygon cut and original preservation; image import; JSON and PNG download events; sprite sheet dimensions/alpha; 30-frame animated GIF decoded through Pillow; desktop and mobile visuals with no 390px horizontal overflow; no uncaught page errors in tested flows.
- [VERIFIED / source static] No third-party script/style imports or network requests in runtime code; HTML/JS syntax passed.

## Implemented but not fully verified

- [UNVERIFIED] Direct `file://` launch on user's MacBook browser; test Chromium sandbox has an enterprise URL blocklist that rejects both file and localhost navigation. The exact source was tested after injection into `about:blank`.
- [UNVERIFIED] GitHub Pages hosting, device-specific large-project performance, import of complex multi-layer production art, Safari/WebKit rendering and download behavior.
- [UNVERIFIED] LocalStorage-based autosave in an ordinary origin; this environment's `about:blank` origin is opaque and localStorage is unavailable. Explicit JSON export tested.
- [UNVERIFIED] Pixel-level motion continuity beyond transform seam alignment.

## Known limitations / required honesty

- Polygon extraction works only on stationary, unparented source illustrations; it masks pixels and does not inpaint hidden portions.
- No automatically inferred bones, anatomical segmentation, mesh skinning, inverse kinematics or canonical character rendering.
- GIF color quantization is lossy, limited by size/frame caps; sprite sheets capped to avoid oversized canvases.
- Presets use layer-name semantics; original-motion state is not retained automatically when applying a preset.

## Protected invariants

- Keep core engine deterministic: preview and exports must evaluate the same transform at each timestamp.
- Keep source artwork private and local; no implicit cloud model, image upload or telemetry.
- Keep hierarchy cycle-safe; hidden parent hides descendants; layer transforms preserve pivots.
- Do not modify Dex Desk Familiar, its approved WebM clips or its delivery system without a separate explicit task.
- Preserve project JSON portability and original raster source during cutout workflows.

## Next validation gate

- Open the GitHub-hosted or locally opened files in the user's actual MacBook browser, import approved real artwork and compare the motion against existing approved clips. Do not claim that a generic geometric demo proves production-character likeness or animation quality.

## Delivery

- Local implementation in current work area, full source and tests. GitHub upload outcome must be verified independently before reporting this as deployed or published.
