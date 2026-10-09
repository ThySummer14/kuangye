# v7.5.1 candidate: touch furniture positioning

This is a source/export candidate on the original Godot recovery branch. It does not change the stable v7.4 Site or publish over the v7.5 photo candidate.

## Interaction

Select inventory furniture (or tap existing furniture first), then tap or drag the room floor to position its preview. Release leaves the preview where it is; only **放下** changes furniture/inventory and saves. Touch uses the same floor projection as the desktop pointer. No new buttons or persistent instructions were added.

The first world finger owns positioning. A second finger cannot move or release it, and cannot confirm while it remains held. Joystick movement is separate. Gestures that start on toolbar UI never become positioning gestures. Releasing over UI/outside the scene, cancellation, focus loss, or navigation restores the starting preview; leaving the room clears it. Emulated mouse events cannot duplicate touch movement. Repeated samples within the same grid cell reuse preview geometry.

## Validation, 2026-10-09

The regression test `tests/test_touch_furnishing.gd` exercises both 375×812 and 1125×2436 viewports (density 1/3), including two-finger ownership, explicit confirmation, save/reopen, moved-furniture cancellation and room exit. These are synthetic Godot event/logic tests, not actual phone touch or mobile browser integration.

All 21 aggregate groups passed, including 38 touch-furnishing assertions. Three package-safety tests and eight browser-picker unit cases also passed. Peak measured RSS was 149.4 MiB for headless tests and 678.2 MiB for the final import; the pack export used 677.8 MiB. Minimum available RAM during the final suite/export was 7.86 GiB. Full aggregate and resource receipts are supplied with the candidate archive. Headless runs use isolated test storage, serialized execution and a 400 MiB/60 second cap (import/export: 768 MiB/60 seconds), preserving at least 7 GiB available RAM.

Unverified: physical-device finger occlusion/comfort, mobile browser event ordering, native mobile focus changes, WebGL game integration and browser IndexedDB reopen. The cloud browser's WebGL2 limitation remains; passing headless checks is not phone acceptance. No preview offset is guessed before device validation.

## Phone acceptance when available

1. Enter home and choose a stool. Drag across empty and blocked floor cells; verify green/red preview follows your finger and the mascot stays still.
2. Keep one finger held and add another; drag/release the second. First finger must retain control, and no furniture may be placed by the second finger.
3. Release the first finger; tap 放下. Reopen the candidate and verify position and inventory persist once.
4. Select the stool again, drag, then cancel or leave the room. Existing furniture must retain its previous saved location.
5. Scroll the furniture toolbar, drag across it, switch apps mid-drag and return. No accidental placement or stuck joystick should occur.
