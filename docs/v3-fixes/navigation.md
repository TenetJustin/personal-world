# V3 navigation and door repair

## Fixed behavior

- Upstairs visitors can resume a route to the desk or lakeshore without the lower stair-guard turn cancelling their route.
- The safe path planner and connecting-route follower now use the same complete-XZ capsule sweep and floor samples. The follower no longer applies residual manual velocity or decomposes the planned diagonal into world-axis steps.
- Connection movement is bounded to 2.2 m/s, with 1.05 m/s on the real internal stairs. Camera yaw follows at a capped 1.65 rad/s rather than an initial exponential orientation jump. The visitor still controls the sole Journey position and can interrupt at any time.
- Proximity opens the door only when entering the approach area. A manual close remains authoritative while the visitor stays there.
- Closing samples the entire rotating door-leaf sweep against the same capsule used for movement. A blocked door waits before the visitor and continues closing once they move clear; it does not push or pass through them.
- Completing a connection exactly at an anchor now sets the correct arrival label.

The 5-second once-only guide, authored faster cinematic sequence, stair collision geometry, reduced-motion shortcut, explicit computer activation and exact desk-return behavior remain intact.

## Regression checks

`node --test tests/navigation-integration.test.ts tests/locomotion.test.ts tests/journey.test.ts`

20 tests passed. Six new state-machine integration tests execute the actual Journey updates, rather than only inspecting A* waypoints:

1. Upper landing → every real stair tread → desk, including the previously failing bottom turn.
2. Upper landing → stairwell → actual doorway → original lakeshore anchor.
3. An off-route outdoor pose → safe connection → complete cinematic arrival.
4. Manual input interrupts a connection at the retained position; clearMovement stops it immediately.
5. Manual closing survives ongoing proximity, with auto-open restored on a later approach.
6. Closing-door collision checks both the intermediate angular sweep and an occupied threshold.

Each moving-route frame is checked for body clearance and a bounded translation below 0.24 m; this includes the authored 0.18 m stair rise. Arrival remains outside the DOM desktop until the visitor activates the computer. These are Node state-machine and collision results; separate browser verification is required for rendered movement.

## Integration contract

Existing Journey APIs are unchanged. The parent application can call `journey.clearMovement()` when losing focus instead of merely submitting zero input, avoiding residual damping motion. `Walker.follow(position, target, distance, door)` is internal to safe connecting-route execution. `canMoveDoor()` and `doorIntersectsCapsule()` are shared collision helpers and have direct safety tests.
