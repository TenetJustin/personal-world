# Welcome, soundscape and record player

This increment adds a visitor-facing welcome dialog, removes the development
label `FIRST PERSON / THRESHOLD`, replaces the indistinct generated outdoor bed
with a real bird field recording, and adds an interactive record player beside
the desk.

The primary “开始探索” action is the explicit browser gesture that enables
sound. “静音进入” remains available. Outdoors uses the licensed bird recording;
inside, the ambient layer crossfades softly while jazz remains off until the
visitor clicks the record player or presses `E` near it. The same action pauses
the record. Background tabs still suspend the shared audio context.

The turntable is an existing CC BY model rather than an AI-generated substitute.
Exact source, transformations and audio licenses are recorded in
`licenses/media-attribution.md`.
