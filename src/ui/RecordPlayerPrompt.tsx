import { useEffect, useState } from "react";
import { ambience } from "../audio/ambience";

export function RecordPlayerPrompt({ visible }: { visible: boolean }) {
  const [audio, setAudio] = useState(() => ambience.snapshot());

  useEffect(() => {
    const update = () => setAudio(ambience.snapshot());
    const timer = setInterval(update, 400);
    window.addEventListener("record-player-change", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("record-player-change", update);
    };
  }, []);

  if (!visible) return null;
  return (
    <aside className="record-player-prompt" aria-live="polite">
      <span className={audio.recordPlaying ? "record-dot playing" : "record-dot"} />
      <div>
        <strong>书桌旁的唱片机</strong>
        <small>
          {audio.recordPlaying
            ? "《Backbay Lounge》正在播放"
            : "唱片机控制室内爵士乐"}
        </small>
      </div>
      <button
        className="glass-button"
        aria-pressed={audio.recordPlaying}
        onClick={() => void ambience.toggleRecordPlayer()}
      >
        {audio.recordPlaying ? "暂停" : "播放"} · E
      </button>
    </aside>
  );
}
