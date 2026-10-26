import { useEffect, useRef, useState, type PointerEvent } from "react";
import { journey } from "../scene/journey";
import { CABIN, cabinToWorld, worldToCabin } from "../scene/architecture";
import { Vector3 } from "three/src/math/Vector3.js";
import { SceneQA } from "./SceneQA";
export function WorldControls({ disabled = false }: { disabled?: boolean }) {
  const [target, setTarget] = useState({
      distance: 0,
      angle: 0,
      indoors: false,
      upstairs: false,
    }),
    [locked, setLocked] = useState(false),
    [message, setMessage] = useState("");
  const stick = useRef<{ id: number; x: number; y: number } | null>(null),
    thumb = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const update = () => {
      const p = journey.position,
        local = worldToCabin(p.toArray()),
        door = cabinToWorld([CABIN.door.centerX, 0, 6]);
      const forward = new Vector3(0, 0, -1).applyQuaternion(journey.quaternion),
        dx = door[0] - p.x,
        dz = door[2] - p.z;
      let angle = Math.atan2(dx, -dz) - Math.atan2(forward.x, -forward.z);
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      setTarget({
        distance: Math.hypot(dx, dz),
        angle: (angle * 180) / Math.PI,
        indoors: Math.abs(local[0]) < 5.9 && Math.abs(local[2]) < 4.4,
        upstairs: local[1] > 5,
      });
    };
    update();
    const timer = setInterval(update, 200);
    const lock = () => setLocked(!!document.pointerLockElement);
    document.addEventListener("pointerlockchange", lock);
    return () => {
      clearInterval(timer);
      document.removeEventListener("pointerlockchange", lock);
      journey.clearMovement();
    };
  }, []);
  useEffect(() => {
    if (disabled) {
      stick.current = null;
      journey.clearMovement();
    }
  }, [disabled]);
  const lock = async () => {
    try {
      if (document.pointerLockElement) document.exitPointerLock();
      else await document.querySelector("canvas")?.requestPointerLock();
      setMessage("");
    } catch {
      setMessage("此浏览器未开启锁定，可继续拖动观察。");
    }
  };
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const s = stick.current;
    if (!s || s.id !== event.pointerId) return;
    const dx = event.clientX - s.x,
      dy = event.clientY - s.y,
      length = Math.max(42, Math.hypot(dx, dy));
    journey.setMoveInput(-dy / length, dx / length);
    if (thumb.current)
      thumb.current.style.transform = `translate(${(dx / length) * 32}px,${(dy / length) * 32}px)`;
  };
  const stop = () => {
    stick.current = null;
    journey.clearMovement();
    if (thumb.current) thumb.current.style.transform = "translate(0,0)";
  };
  return (
    <>
      <div
        className="world-wayfinding"
        aria-label={target.indoors ? "木屋位置" : "木屋方向与距离"}
      >
        {target.indoors ? (
          <span>
            {target.upstairs ? "二楼 · 阁楼与阅读区" : "一楼 · 楼梯在左后方"}
          </span>
        ) : (
          <>
            <i
              style={{ transform: `rotate(${target.angle}deg)` }}
              aria-hidden="true"
            >
              ↑
            </i>
            <span>湖畔木屋 · {Math.round(target.distance)}m</span>
          </>
        )}
      </div>
      <div className="look-mode">
        <button
          className="glass-button"
          disabled={disabled}
          onClick={() => void lock()}
        >
          {locked ? "解除鼠标锁定 · Esc" : "锁定鼠标观察"}
        </button>
        {message && <small role="status">{message}</small>}
      </div>
      <div className="touch-navigation" aria-label="触控自由行走">
        <div
          role="group"
          aria-label="移动摇杆"
          className="touch-stick"
          onPointerDown={(event) => {
            if (disabled) return;
            event.preventDefault();
            const r = event.currentTarget.getBoundingClientRect();
            stick.current = {
              id: event.pointerId,
              x: r.x + r.width / 2,
              y: r.y + r.height / 2,
            };
            event.currentTarget.setPointerCapture(event.pointerId);
            move(event);
          }}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={stop}
        >
          <span ref={thumb} />
          <small>移动</small>
        </div>
        <p>右侧拖动观察</p>
      </div>
      {new URLSearchParams(location.search).has("debug") && <SceneQA />}
    </>
  );
}
