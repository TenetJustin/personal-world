import { useEffect, useRef, useState } from "react";
import type { Entry, ImageAttachment } from "../library/model";
import { safeURL } from "../library/model";
import { Markdown } from "./Markdown";
import { ProjectImage } from "./ProjectMedia";
import { TarotGallery } from "./TarotGallery";
import "./projects-showcase.css";
const typeNames = {
  screenshot: "项目界面",
  prototype: "前端原型 · 演示数据",
  artwork: "原创牌面 / 角色资产",
  workflow: "工作流资料",
};
function Lightbox({
  entry,
  initial,
  onClose,
}: {
  entry: Entry;
  initial: string;
  onClose: () => void;
}) {
  const images = entry.images ?? [];
  const [index, setIndex] = useState(
    Math.max(
      0,
      images.findIndex((image) => image.id === initial),
    ),
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const image = images[index];
  const note = entry.projectShowcase?.imageNotes.find(
    (n) => n.imageId === image?.id,
  );
  const advance = (amount: number) =>
    setIndex((i) => (i + amount + images.length) % images.length);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      previous?.focus();
    };
  }, []);
  if (!image) return null;
  return (
    <dialog
      ref={dialog}
      className="project-lightbox"
      aria-label="项目图片大图"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          advance(1);
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          advance(-1);
        }
      }}
    >
      <div className="lightbox-frame">
        <header>
          <span>
            {index + 1} / {images.length}
          </span>
          <button onClick={onClose} aria-label="关闭大图">
            关闭 ×
          </button>
        </header>
        <ProjectImage image={image} alt={note?.title || image.name} eager />
        <footer>
          <button onClick={() => advance(-1)} aria-label="上一张">
            ←
          </button>
          <div>
            <h3>{note?.title || image.name}</h3>
            <p>{note?.caption}</p>
            {note && (
              <small>
                {typeNames[note.kind]} · {note.license}
              </small>
            )}
            {note?.sourceURL && (
              <a
                href={safeURL(note.sourceURL)!}
                target="_blank"
                rel="noreferrer"
              >
                素材来源 ↗
              </a>
            )}
          </div>
          <button onClick={() => advance(1)} aria-label="下一张">
            →
          </button>
        </footer>
      </div>
    </dialog>
  );
}
function cover(entry: Entry): ImageAttachment | undefined {
  return (
    entry.images?.find(
      (image) => image.id === entry.projectShowcase?.coverId,
    ) ?? entry.images?.[0]
  );
}
export function ProjectsShowcase({
  entries,
  selected,
  onSelect,
  loading,
  onReturnEditor,
}: {
  entries: Entry[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  loading: boolean;
  onReturnEditor?: () => void;
}) {
  const projects = entries
    .filter((entry) => entry.kind === "projects" && !entry.deletedAt)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const active = projects.find((entry) => entry.id === selected);
  const [query, setQuery] = useState("");
  const [lightbox, setLightbox] = useState<{
    entry: Entry;
    imageId: string;
  } | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo(0, 0);
    setLightbox(null);
  }, [selected]);
  const list = projects.filter((entry) =>
    `${entry.title} ${entry.tags} ${entry.technology} ${entry.projectDetails?.summaryZH ?? ""}`
      .toLocaleLowerCase()
      .includes(query.toLocaleLowerCase()),
  );
  return (
    <div className="projects-showcase" ref={scroll}>
      <header className="projects-toolbar">
        <div>
          <span className="project-wordmark">◈</span>
          <strong>作品</strong>
          <span>{projects.length} 个项目系列</span>
        </div>
        {active || selected ? (
          <button onClick={() => onSelect(null)}>← 全部作品</button>
        ) : (
          <label>
            <span className="sr-only">搜索作品</span>
            <input
              type="search"
              placeholder="搜索作品与技术"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        )}
        {onReturnEditor && (
          <button onClick={onReturnEditor}>返回本地编辑</button>
        )}
      </header>
      {loading ? (
        <p className="projects-empty" role="status">
          正在读取作品…
        </p>
      ) : selected && !active ? (
        <div className="projects-empty">
          <h1>这项作品暂不可用</h1>
          <button onClick={() => onSelect(null)}>浏览全部作品</button>
        </div>
      ) : active ? (
        <>
          <section
            className={`project-detail-hero ${active.projectShowcase?.galleryType === "tarot" ? "is-oracle" : ""}`}
          >
            <div className="project-hero-copy">
              <p className="project-kicker">
                {active.category || "SELECTED WORK"}
              </p>
              <h1>{active.title}</h1>
              <p className="project-subtitle">
                {active.projectShowcase?.subtitle ||
                  active.projectDetails?.summaryEN}
              </p>
              <p>
                {active.projectDetails?.summaryZH || active.body.split("\n")[0]}
              </p>
              <div className="project-tags">
                {(active.technology || active.tags)
                  .split(/[,，·]/)
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag}>{tag.trim()}</span>
                  ))}
              </div>
              <nav className="project-links" aria-label="项目链接">
                {[
                  ["GitHub", active.githubURL],
                  [
                    active.projectShowcase?.galleryType === "tarot"
                      ? "Explore MOIRAI"
                      : "在线体验",
                    active.demoURL,
                  ],
                  ["项目资料", active.url],
                ].map(([label, url]) =>
                  url && safeURL(url) ? (
                    <a
                      key={label}
                      href={safeURL(url)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {label} ↗
                    </a>
                  ) : null,
                )}
              </nav>
            </div>
            {cover(active) &&
              active.projectShowcase?.galleryType !== "tarot" && (
                <button
                  className="project-hero-image"
                  onClick={() =>
                    setLightbox({ entry: active, imageId: cover(active)!.id })
                  }
                  aria-label="放大项目封面"
                >
                  <ProjectImage
                    image={cover(active)!}
                    alt={`${active.title} 封面`}
                    eager
                  />
                </button>
              )}
          </section>
          {active.projectShowcase?.galleryType === "tarot" && (
            <TarotGallery
              entry={active}
              onOpen={(imageId) => setLightbox({ entry: active, imageId })}
            />
          )}
          <div className="project-detail-body">
            <div className="project-story">
              {active.projectDetails?.problem && (
                <section>
                  <p className="project-kicker">CONTEXT</p>
                  <h2>背景与问题</h2>
                  <Markdown text={active.projectDetails.problem} />
                </section>
              )}
              <section>
                <p className="project-kicker">THE PROJECT</p>
                <h2>产品与探索</h2>
                <Markdown text={active.body} />
              </section>
              {active.projectDetails?.features && (
                <section>
                  <h2>功能与方案</h2>
                  <Markdown text={active.projectDetails.features} />
                </section>
              )}
              {active.projectDetails?.results && (
                <section>
                  <h2>当前状态与边界</h2>
                  <Markdown text={active.projectDetails.results} />
                </section>
              )}
              {active.projectDetails?.awards && (
                <section>
                  <h2>团队成果</h2>
                  <Markdown text={active.projectDetails.awards} />
                </section>
              )}
            </div>
            <aside className="project-facts">
              <dl>
                <dt>我的角色</dt>
                <dd>{active.projectDetails?.contribution || "参与"}</dd>
                <dt>项目状态</dt>
                <dd>{active.projectDetails?.status || "作品展示"}</dd>
                <dt>协作与署名</dt>
                <dd>{active.projectShowcase?.credits || "项目作者及协作者"}</dd>
              </dl>
              {active.projectShowcase?.upstreamURL && (
                <a
                  href={safeURL(active.projectShowcase.upstreamURL)!}
                  target="_blank"
                  rel="noreferrer"
                >
                  上游项目与致谢 ↗
                </a>
              )}
            </aside>
          </div>
          <section className="project-screenshots">
            <header>
              <p className="project-kicker">A CLOSER LOOK</p>
              <h2>界面与作品细节</h2>
              <p>点击图片放大，使用左右方向键浏览。</p>
            </header>
            <div className="project-gallery-grid">
              {(active.images ?? [])
                .filter(
                  (image) =>
                    active.projectShowcase?.galleryType !== "tarot" ||
                    !active.projectShowcase.tarotIds.includes(image.id),
                )
                .map((image) => {
                  const note = active.projectShowcase?.imageNotes.find(
                    (n) => n.imageId === image.id,
                  );
                  return (
                    <figure key={image.id}>
                      <button
                        onClick={() =>
                          setLightbox({ entry: active, imageId: image.id })
                        }
                        aria-label={`放大 ${note?.title || image.name}`}
                      >
                        <ProjectImage
                          image={image}
                          alt={note?.title || image.name}
                        />
                      </button>
                      <figcaption>
                        <strong>{note?.title || image.name}</strong>
                        <span>{note?.caption}</span>
                        {note && <small>{typeNames[note.kind]}</small>}
                      </figcaption>
                    </figure>
                  );
                })}
            </div>
            {!active.images?.length && (
              <p className="projects-empty">真实素材待补充，不使用虚构截图。</p>
            )}
          </section>
          <footer className="project-detail-footer">
            <button onClick={() => onSelect(null)}>← 返回作品总览</button>
            <span>SELECTED WORK / PERSONAL WORLD</span>
          </footer>
        </>
      ) : (
        <>
          <section className="projects-intro">
            <p className="project-kicker">A COLLECTION OF EXPLORATIONS</p>
            <h1>把想法，变成可体验的作品。</h1>
            <p>城市、球场、内心与神话。记录参与和二次开发中的产品探索。</p>
          </section>
          <div className="project-card-grid">
            {list.map((entry, index) => (
              <article className="project-card" key={entry.id}>
                <button
                  className="project-card-cover"
                  onClick={() => onSelect(entry.id)}
                  aria-label={`查看 ${entry.title}`}
                >
                  {entry.projectShowcase?.galleryType === "tarot" ? (
                    <TarotGallery entry={entry} mini />
                  ) : cover(entry) ? (
                    <ProjectImage
                      image={cover(entry)!}
                      alt={`${entry.title} 封面`}
                      thumbnail
                      eager={index < 2}
                    />
                  ) : (
                    <div className="project-cover-pending">素材整理中</div>
                  )}
                  <span className="project-card-open">↗</span>
                </button>
                <div className="project-card-copy">
                  <p className="project-kicker">{entry.category}</p>
                  <h2>
                    <button onClick={() => onSelect(entry.id)}>
                      {entry.title}
                    </button>
                  </h2>
                  <p>
                    {entry.projectDetails?.summaryZH ||
                      entry.body.slice(0, 120)}
                  </p>
                  <div className="project-tags">
                    {(entry.technology || entry.tags)
                      .split(/[,，·]/)
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((tag) => (
                        <span key={tag}>{tag.trim()}</span>
                      ))}
                  </div>
                  <button
                    className="project-detail-link"
                    onClick={() => onSelect(entry.id)}
                  >
                    查看详情 <span>→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!list.length && (
            <p className="projects-empty">
              {query ? "没有匹配的作品" : "作品正在整理。"}
            </p>
          )}
        </>
      )}
      {lightbox && (
        <Lightbox
          entry={lightbox.entry}
          initial={lightbox.imageId}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
