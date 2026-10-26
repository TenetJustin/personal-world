import { useEffect, useState } from "react";
import { ambience } from "../audio/ambience";
export function AmbienceControl({ desktop = false }: { desktop?: boolean }) {
  const [audio, setAudio] = useState(() => ambience.snapshot()),
    [open, setOpen] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setAudio(ambience.snapshot()), 500);
    return () => clearInterval(timer);
  }, []);
  const toggle = async () => {
    await ambience.enable(!audio.enabled);
    setAudio(ambience.snapshot());
  };
  return (
    <div className={"ambience-control " + (desktop ? "on-desktop" : "")}>
      <button
        className="quiet-button"
        aria-pressed={audio.enabled}
        onClick={() => void toggle()}
        aria-label={audio.enabled ? "关闭环境音" : "开启环境音"}
      >
        {audio.enabled ? "◖ 环境音开" : "◌ 开启环境音"}
      </button>
      <button
        className="quiet-button"
        aria-expanded={open}
        aria-label="环境音设置"
        onClick={() => setOpen(!open)}
      >
        ⌄
      </button>
      {open && (
        <section className="ambience-popover" aria-label="环境音设置面板">
          <strong>{audio.zone}</strong>
          <label>
            音量{" "}
            <input
              aria-label="环境音音量"
              type="range"
              min="0"
              max="1"
              step=".05"
              value={audio.volume}
              onChange={(e) => {
                ambience.setVolume(Number(e.target.value));
                setAudio(ambience.snapshot());
              }}
            />
          </label>
          <small>进出木屋时柔和过渡 · 切到后台暂停</small>
          <small role="status">
            {audio.error ||
              (!audio.enabled
                ? "尚未开启声音"
                : audio.state === "running"
                  ? "环境音播放中"
                  : "声音已暂停，请点击重新开启")}
          </small>
          {new URLSearchParams(location.search).has("debug") && (
            <output data-audio-diagnostic>{JSON.stringify(audio)}</output>
          )}
        </section>
      )}
    </div>
  );
}
