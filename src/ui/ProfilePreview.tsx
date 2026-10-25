import "./profile-center.css";
import { useEffect, useState } from "react";
import type { Entry } from "../library/model";
import { safeURL } from "../library/model";
import { Markdown } from "./Markdown";
export function ProfileImage({
  entry,
  id,
  alt,
}: {
  entry: Entry;
  id?: string;
  alt: string;
}) {
  const blob = entry.images?.find((x) => x.id === id)?.blob;
  const [url, setURL] = useState("");
  useEffect(() => {
    if (!blob) {
      setURL("");
      return;
    }
    const u = URL.createObjectURL(blob);
    setURL(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url ? <img className="profile-media" src={url} alt={alt} /> : null;
}
export function ProfilePreview({ entry }: { entry: Entry }) {
  const p = entry.structuredProfile;
  if (!p) return null;
  const a = p.about;
  return (
    <article className="profile-preview">
      <div className="profile-preview-about">
        <ProfileImage
          entry={entry}
          id={a.avatarId}
          alt={a.displayName || "个人头像"}
        />
        <div>
          <p className="profile-kicker">ABOUT</p>
          <h1>
            {a.displayName || "你的展示名称"}
            {a.displayNameEN && <small>{a.displayNameEN}</small>}
          </h1>
          <p className="profile-headline">
            {a.headline || "填写一句话身份介绍"}
          </p>
          {a.city && <p>{a.city}</p>}
        </div>
      </div>
      {a.introZH && <Markdown text={a.introZH} />}{" "}
      {a.introEN && (
        <section lang="en">
          <Markdown text={a.introEN} />
        </section>
      )}
      {a.focus && (
        <p>
          <strong>当前关注：</strong>
          {a.focus}
        </p>
      )}
      <div className="profile-links">
        {a.githubURL && safeURL(a.githubURL) && (
          <a href={safeURL(a.githubURL)!} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        )}
        {[...a.socialLinks, ...a.otherLinks].map(
          (l) =>
            safeURL(l.url) && (
              <a
                key={l.id}
                href={safeURL(l.url)!}
                target="_blank"
                rel="noreferrer"
              >
                {l.label || l.url} ↗
              </a>
            ),
        )}
        {a.publicEmail && (
          <a href={`mailto:${a.publicEmail}`}>{a.publicEmail}</a>
        )}
      </div>
      {p.education.length > 0 && (
        <section>
          <h2>教育背景</h2>
          {p.education.map((r) => (
            <div className="profile-preview-row" key={r.id}>
              <h3>
                {r.school}{" "}
                <small>
                  {r.degree} · {r.major}
                </small>
              </h3>
              <p className="profile-period">
                {r.startDate} — {r.endDate || "至今"}
              </p>
              {r.research && <p>研究兴趣：{r.research}</p>}
              {r.courses && <p>相关课程：{r.courses}</p>}
              {r.honors && <p>荣誉：{r.honors}</p>}
            </div>
          ))}
        </section>
      )}
      {p.experience.length > 0 && (
        <section>
          <h2>实习与经历</h2>
          {p.experience.map((r) => (
            <div className="profile-preview-row" key={r.id}>
              <h3>
                {r.role} <small>{r.organization}</small>
              </h3>
              <p className="profile-period">
                {r.startDate} — {r.endDate || "至今"} {r.location}
              </p>
              {(
                [
                  "responsibilities",
                  "contributions",
                  "outcomes",
                  "tools",
                ] as const
              ).map(
                (k, i) =>
                  r[k] && (
                    <div key={k}>
                      <strong>
                        {["职责", "核心贡献", "可公开成果", "技术与工具"][i]}
                      </strong>
                      <Markdown text={r[k]} />
                    </div>
                  ),
              )}
            </div>
          ))}
        </section>
      )}
      {p.skills.length > 0 && (
        <section>
          <h2>技能与工具</h2>
          {[...p.skills]
            .sort((x, y) => x.sortOrder - y.sortOrder)
            .map((r) => (
              <div className="profile-preview-row" key={r.id}>
                <h3>
                  {r.name} <small>{r.category}</small>
                </h3>
                <p>{r.context}</p>
                {r.relatedProjects && <p>相关项目：{r.relatedProjects}</p>}
              </div>
            ))}
        </section>
      )}
      {p.awards.length > 0 && (
        <section>
          <h2>荣誉与证明</h2>
          {p.awards.map((r) => (
            <div className="profile-preview-row" key={r.id}>
              <h3>
                {r.name} <small>{r.organization}</small>
              </h3>
              <p className="profile-period">{r.date}</p>
              <Markdown text={r.contribution} />
              {safeURL(r.proofURL) && (
                <a href={safeURL(r.proofURL)!} target="_blank" rel="noreferrer">
                  查看证明 ↗
                </a>
              )}
              <div className="profile-award-images">
                {r.imageIds.map((id) => (
                  <ProfileImage
                    key={id}
                    entry={entry}
                    id={id}
                    alt={`${r.name} 证明图片`}
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}
