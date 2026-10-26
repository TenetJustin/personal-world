# Indoor / outdoor ambience

The new audio is original Web Audio synthesis, with no downloaded recording, music,
Apple artwork, microphone, geolocation, API key, or additional network request.

- Exterior: layered soft forest wind, lake wash and sparse original bird phrases.
- Interior: low room air, soft hearth bed and irregular crackles. Outdoors remains
  faintly audible at 12% gain; fireplace level attenuates by listener distance,
  including upstairs. Crossing the actual cabin footprint fades between mixes.
- Default is silent. Sound starts only after the visitor clicks **开启环境音**.
  The same engine survives application/window transitions; UI controls do not
  create competing indoor/outdoor sources. Volume and mute remain available in
  the world HUD and desktop menu bar. Background tabs suspend the audio context.
- A gentle output compressor and bounded source noise limit unexpected peaks.
- `?debug=1` shows context state, zone, layer mix and measured output RMS, and can
  record six seconds of the app's generated output. It never records a microphone
  or other applications. This is diagnostic functionality, not an author login.

Source: `src/audio/ambience.ts`; controls: `src/ui/AmbienceControl.tsx`.
Licence: original project code/content, same project ownership as other original
assets. The MIT Three.js attribution remains unchanged. These sounds are an
art-directed synthesis, not claimed to be location field recordings.
