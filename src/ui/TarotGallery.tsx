import { useRef, useState, type CSSProperties } from "react";
import type { Entry, ImageAttachment } from "../library/model";
import { ProjectImage } from "./ProjectMedia";
export function TarotGallery({
  entry,
  mini = false,
  onOpen,
}: {
  entry: Entry;
  mini?: boolean;
  onOpen?: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const loaded = useRef(new Set<string>());
  const ids = entry.projectShowcase?.tarotIds ?? [];
  const images = ids
    .map((id) => entry.images?.find((image) => image.id === id))
    .filter((image): image is ImageAttachment => !!image);
  if (!images.length) return null;
  const note = (image: ImageAttachment) =>
    entry.projectShowcase?.imageNotes.find((n) => n.imageId === image.id);
  return (
    <section
      className={`tarot-gallery ${mini ? "is-mini" : ""} ${paused ? "is-paused" : ""} ${!ready ? "is-loading" : ""}`}
      aria-label={mini ? "精选牌面预览" : `${entry.title} 精选原创牌廊`}
    >
      {!mini && (
        <header className="tarot-heading">
          <div>
            <span>THE SELECTED ARCANA</span>
            <h2>命运，在此交汇。</h2>
            <p>精选 {images.length} 张牌面，走近神话与象征。</p>
          </div>
          <button
            className="tarot-pause"
            onClick={() => setPaused((value) => !value)}
            aria-pressed={paused}
          >
            {paused ? "继续流动" : "暂停流动"}
          </button>
        </header>
      )}
      <div
        className="tarot-viewport"
        tabIndex={mini ? -1 : 0}
        aria-label={mini ? undefined : "牌廊，聚焦暂停；触摸可横向滑动"}
      >
        <div
          className="tarot-track"
          style={
            {
              "--tarot-duration": `${entry.projectShowcase?.cycleSeconds ?? 36}s`,
            } as CSSProperties
          }
        >
          {[0, 1].map((copy) => (
            <div
              className="tarot-group"
              key={copy}
              aria-hidden={copy === 1 || mini ? true : undefined}
            >
              {images.map((image) => {
                const title = note(image)?.title || image.name;
                const contents = (
                  <>
                    <ProjectImage
                      image={image}
                      alt={copy || mini ? "" : title}
                      thumbnail={mini}
                      eager
                      onLoad={() => {
                        loaded.current.add(image.id);
                        if (loaded.current.size >= images.length)
                          setReady(true);
                      }}
                      onError={() => setFailed(true)}
                      sizes={mini ? "150px" : "(max-width: 650px) 110px, 260px"}
                    />
                    <span>{title}</span>
                  </>
                );
                return mini || copy ? (
                  <div
                    className="tarot-card"
                    key={image.id}
                    onClick={mini ? undefined : () => onOpen?.(image.id)}
                  >
                    {contents}
                  </div>
                ) : (
                  <button
                    className="tarot-card"
                    key={image.id}
                    onClick={() => onOpen?.(image.id)}
                    aria-label={`放大 ${title}`}
                  >
                    {contents}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {!mini && !ready && (
        <p className="tarot-hint" role="status">
          {failed ? "有牌面暂未加载，请刷新重试。" : "正在准备完整牌廊…"}
        </p>
      )}
      {!mini && (
        <p className="tarot-hint">
          悬停或聚焦暂停 · 点击牌面放大 · 触摸横滑浏览
        </p>
      )}
    </section>
  );
}
