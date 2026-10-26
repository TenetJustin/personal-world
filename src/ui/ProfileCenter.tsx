import { useEffect, useRef, useState } from "react";
import {
  type Entry,
  type Kind,
  newEntry,
  validateEntry,
} from "../library/model";
import {
  emptyProfile,
  profileProgress,
  PROFILE_SECTIONS,
  type ProfileSection,
  type StructuredProfile,
  type AboutProfile,
  type ProfileLink,
  publicationState,
} from "../library/profile";
import {
  decodeBackup,
  encodeBackup,
  downloadFile,
  prepareImage,
} from "../library/storage";
import { moveProfileRow } from "../library/draftState";
import { ProfilePreview, ProfileImage } from "./ProfilePreview";
import { PublicationPanel } from "./PublicationPanel";
import "./profile-center.css";
export type ProfileCenterProps = {
  entries: Entry[];
  published: Entry[];
  onSave: (entries: Entry[]) => Promise<void>;
  onDirty: (dirty: boolean) => void;
  otherDirty?: boolean;
  onRestore?: (entries: Entry[]) => Promise<void>;
  onOpenLibrary?: (kind: Kind, id?: string) => void;
  onClose?: () => void;
};
const fields = {
  education: [
    ["school", "学校 *"],
    ["degree", "学位 *"],
    ["major", "专业 *"],
    ["startDate", "开始时间"],
    ["endDate", "结束时间（在读可留空）"],
    ["research", "研究兴趣"],
    ["courses", "相关课程（选填）"],
    ["honors", "荣誉（选填）"],
  ],
  experience: [
    ["organization", "组织或公司 *"],
    ["role", "岗位 *"],
    ["startDate", "开始日期"],
    ["endDate", "结束日期（在职可留空）"],
    ["location", "工作方式及地点（选填）"],
    ["responsibilities", "职责"],
    ["contributions", "核心贡献 *"],
    ["outcomes", "可公开成果"],
    ["tools", "技术与工具"],
  ],
  skills: [
    ["category", "技能类别 *"],
    ["name", "技术或工具名称 *"],
    ["context", "实际应用场景 *"],
    ["relatedProjects", "相关项目"],
    ["sortOrder", "展示排序"],
  ],
  awards: [
    ["name", "荣誉名称 *"],
    ["organization", "比赛或颁发组织 *"],
    ["date", "获得日期"],
    ["contribution", "个人或团队贡献"],
    ["proofURL", "证明链接（选填）"],
  ],
} as const;
function blankRow(section: Exclude<ProfileSection, "about">) {
  return Object.fromEntries([
    ["id", crypto.randomUUID()],
    ...fields[section].map(([key]) => [key, key === "sortOrder" ? 0 : ""]),
    ...(section === "awards" ? [["imageIds", []]] : []),
  ]);
}
const longFields = new Set([
  "introZH",
  "introEN",
  "research",
  "responsibilities",
  "contributions",
  "outcomes",
  "contribution",
  "context",
]);
export function ProfileCenter({
  entries,
  published,
  onSave,
  onDirty,
  otherDirty = false,
  onRestore,
  onOpenLibrary,
  onClose,
}: ProfileCenterProps) {
  const [profileID, setProfileID] = useState<string | null>(null);
  const profiles = entries.filter((e) => e.structuredProfile && !e.deletedAt);
  const saved = profiles.find((e) => e.id === profileID) ?? profiles[0];
  const [entry, setEntry] = useState<Entry>(
      () =>
        saved ?? {
          ...newEntry("resume", "个人资料"),
          structuredProfile: emptyProfile(),
        },
    ),
    [section, setSection] = useState<ProfileSection>("about"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [preview, setPreview] = useState(false),
    [publicView, setPublicView] = useState(false),
    [review, setReview] = useState(false),
    [restore, setRestore] = useState<Entry[] | null>(null);
  const editRevision = useRef(0);
  const restoreInput = useRef<HTMLInputElement>(null);
  const guardedDirty = dirty || otherDirty;
  const guardRef = useRef(guardedDirty);
  guardRef.current = guardedDirty;
  const requireSavedEditors = () => {
    if (guardRef.current)
      throw new Error(
        "请先保存或撤销所有应用中未保存的修改，再备份、恢复或审核公开内容",
      );
  };
  useEffect(() => {
    if (!dirty && saved) setEntry(saved);
  }, [saved, dirty]);
  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);
  const profile = entry.structuredProfile ?? emptyProfile(),
    progress = profileProgress(profile),
    readyCount = Object.values(progress).reduce((n, p) => n + p.done, 0),
    totalCount = Object.values(progress).reduce((n, p) => n + p.total, 0);
  const mutate = (fn: (old: Entry) => Entry) => {
    editRevision.current++;
    setEntry((old) => fn(old));
    setDirty(true);
    setMessage("尚未保存 · 可随时分次填写");
  };
  const setProfile = (p: StructuredProfile) =>
    mutate((old) => ({ ...old, structuredProfile: p }));
  const about = (
    key: keyof AboutProfile,
    value: AboutProfile[keyof AboutProfile],
  ) => setProfile({ ...profile, about: { ...profile.about, [key]: value } });
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };
  const save = () =>
    run(async () => {
      const revision = editRevision.current;
      const referenced = new Set([
        profile.about.avatarId,
        ...profile.awards.flatMap((a) => a.imageIds),
      ]);
      const next = validateEntry({
        ...entry,
        title: profile.about.displayName
          ? `${profile.about.displayName} · 个人资料`
          : "个人资料",
        structuredProfile: profile,
        images: entry.images?.filter((i) => referenced.has(i.id)),
        updatedAt: new Date().toISOString(),
      });
      await onSave([next]);
      setProfileID(next.id);
      if (editRevision.current === revision) {
        setEntry(next);
        setDirty(false);
        setMessage("已保存到当前浏览器；公开网站尚未改变");
      } else {
        setMessage("已保存提交时的版本；刚输入的修改仍未保存，请再次保存");
      }
    });
  const upload = async (file: File, purpose: "avatar" | string) =>
    run(async () => {
      const referenced = new Set([
        profile.about.avatarId,
        ...profile.awards.flatMap((a) => a.imageIds),
      ]);
      if (
        (entry.images ?? []).filter(
          (i) =>
            referenced.has(i.id) &&
            i.id !== (purpose === "avatar" ? profile.about.avatarId : ""),
        ).length >= 50
      )
        throw new Error("个人资料最多 50 张图片，请先移除不用的证明图片");
      if (
        purpose !== "avatar" &&
        (profile.awards.find((a) => a.id === purpose)?.imageIds.length ?? 0) >=
          12
      )
        throw new Error("每项荣誉最多 12 张证明图片");
      const image = await prepareImage(file),
        id = crypto.randomUUID();
      mutate((old) => {
        const p = old.structuredProfile ?? emptyProfile();
        const previous = purpose === "avatar" ? p.about.avatarId : "";
        const refs = new Set([
          p.about.avatarId,
          ...p.awards.flatMap((a) => a.imageIds),
        ]);
        const media = (old.images ?? []).filter(
          (x) =>
            refs.has(x.id) &&
            (x.id !== previous ||
              p.awards.some((a) => a.imageIds.includes(x.id))),
        );
        return {
          ...old,
          images: [
            ...media,
            { id, name: file.name.replace(/\.[^.]+$/, "") + ".webp", ...image },
          ],
          structuredProfile:
            purpose === "avatar"
              ? { ...p, about: { ...p.about, avatarId: id } }
              : {
                  ...p,
                  awards: p.awards.map((a) =>
                    a.id === purpose
                      ? { ...a, imageIds: [...a.imageIds, id] }
                      : a,
                  ),
                },
        };
      });
      setMessage("图片已在本地压缩并移除 EXIF；请保存修改");
    });
  const publicProfile = published.find(
    (e) => e.structuredProfile && !e.deletedAt,
  );
  return (
    <div className="profile-center">
      <header className="profile-center-header">
        <div>
          <p className="profile-kicker">LOCAL EDITOR WORKSPACE</p>
          <h1>个人资料填写中心</h1>
          <p>
            仅编辑当前浏览器草稿。这不是管理员登录，不能直接更改作者公开网站。
          </p>
        </div>
        {onClose && <button onClick={onClose}>返回桌面</button>}
      </header>
      {profiles.length > 1 && (
        <label className="profile-choose">
          当前资料档案
          <select
            disabled={busy}
            value={saved?.id ?? ""}
            onChange={(e) => {
              if (!dirty || confirm("切换档案会放弃尚未保存的修改，继续？")) {
                setDirty(false);
                setProfileID(e.target.value);
              }
            }}
          >
            {profiles.map((p) => (
              <option value={p.id} key={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="profile-center-toolbar">
        <button
          className="accent"
          disabled={busy || !dirty}
          onClick={() => void save()}
        >
          保存资料
        </button>
        <button onClick={() => setPreview((v) => !v)}>
          {preview ? "返回填写" : "实时公开预览"}
        </button>
        <button onClick={() => setPublicView((v) => !v)}>
          {publicView ? "返回本地草稿" : "查看已发布版本"}
        </button>
        <button
          disabled={busy || guardedDirty}
          onClick={() => setReview((v) => !v)}
        >
          审核公开内容
        </button>
        <button
          disabled={busy || guardedDirty}
          onClick={() =>
            void run(async () => {
              requireSavedEditors();
              const json = await encodeBackup(entries);
              requireSavedEditors();
              downloadFile(
                new Blob([json], {
                  type: "application/json",
                }),
                `personal-world-backup-${new Date().toLocaleDateString("sv-SE")}.json`,
              );
              setMessage(
                "完整备份已生成，包含全部应用、图片和附件；不可提交至公开仓库",
              );
            })
          }
        >
          导出全部备份
        </button>
        <button
          disabled={busy || guardedDirty}
          onClick={() => restoreInput.current?.click()}
        >
          恢复旧版或新版备份
        </button>
        <input
          type="file"
          accept=".json,application/json"
          hidden
          ref={restoreInput}
          aria-label="填写中心恢复备份"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file)
              void run(async () => {
                requireSavedEditors();
                const incoming = await decodeBackup(file);
                requireSavedEditors();
                setRestore(incoming);
              });
          }}
        />
      </div>
      <div className="profile-save-status" role="status">
        {busy
          ? "正在处理…"
          : message ||
            `${publicationState(entry, published)} · ${dirty ? "尚未保存" : saved ? "已保存" : "首次使用：先填写展示名称与一句话介绍，可分次保存"}`}
      </div>
      {otherDirty && (
        <p className="profile-save-status" role="status">
          其他应用有未保存修改；可继续保存本窗口，全部保存后再备份、恢复或审核。
        </p>
      )}
      {restore && (
        <section className="profile-restore">
          <strong>恢复预览：{restore.length} 项资料</strong>
          <p>合并到同一资料库，相同 ID 使用备份版本替换，其他本地资料保留。</p>
          <button
            disabled={busy || guardedDirty}
            onClick={() =>
              void run(async () => {
                requireSavedEditors();
                await (onRestore ?? onSave)(restore);
                setRestore(null);
                setMessage("恢复完成，旧资料和新增字段均保留");
              })
            }
          >
            确认合并恢复备份
          </button>
          <button onClick={() => setRestore(null)}>取消</button>
        </section>
      )}
      {review && (
        <PublicationPanel
          entries={entries}
          dirty={guardedDirty}
          onClose={() => setReview(false)}
        />
      )}
      {publicView ? (
        publicProfile ? (
          <ProfilePreview entry={publicProfile} />
        ) : (
          <div className="profile-empty">
            <h2>尚未发布个人介绍</h2>
            <p>
              本地保存不会自动公开。请保存、逐项审核，再导出公开内容包，提交并构建网站。
            </p>
          </div>
        )
      ) : (
        <div className="profile-center-layout">
          <aside className="profile-center-nav">
            <p>
              填写进度 {readyCount}/{totalCount}
            </p>
            {(Object.keys(PROFILE_SECTIONS) as ProfileSection[]).map((key) => (
              <button
                key={key}
                aria-current={section === key ? "step" : undefined}
                onClick={() => {
                  setSection(key);
                  setPreview(false);
                }}
              >
                <span>{PROFILE_SECTIONS[key]}</span>
                <small>
                  {progress[key].done}/{progress[key].total}
                </small>
                <progress
                  value={progress[key].done}
                  max={progress[key].total}
                />
              </button>
            ))}
            <div className="profile-app-links">
              <p>继续整理你的内容</p>
              {(["projects", "photos", "notes"] as Kind[]).map((kind) => (
                <button key={kind} onClick={() => onOpenLibrary?.(kind)}>
                  {kind === "projects"
                    ? "作品与项目"
                    : kind === "photos"
                      ? "相册与照片"
                      : "思考随笔"}{" "}
                  <small>
                    {
                      entries.filter((e) => e.kind === kind && !e.deletedAt)
                        .length
                    }{" "}
                    项 ↗
                  </small>
                </button>
              ))}
            </div>
          </aside>
          <main className="profile-center-main">
            {preview ? (
              <ProfilePreview
                entry={{ ...entry, structuredProfile: profile }}
              />
            ) : (
              <>
                <div className="profile-section-heading">
                  <h2>{PROFILE_SECTIONS[section]}</h2>
                  <p>
                    *
                    为该栏目的核心信息。可保存未完成草稿；选填栏目不必一次填完。
                  </p>
                  {progress[section].missing.length > 0 && (
                    <p className="profile-missing">
                      {progress[section].missing.join(" · ")}
                    </p>
                  )}
                </div>
                {section === "about" ? (
                  <>
                    <div className="profile-field-grid">
                      {(
                        [
                          ["displayName", "展示名称 *"],
                          ["displayNameEN", "English display name（选填）"],
                          ["headline", "一句话身份介绍 *"],
                          ["introZH", "中文个人介绍 *"],
                          ["introEN", "English introduction（选填）"],
                          ["focus", "当前关注领域（选填）"],
                          ["city", "所在城市（选填）"],
                          ["githubURL", "GitHub（选填）"],
                          ["publicEmail", "公开联系邮箱（选填）"],
                        ] as const
                      ).map(([key, label]) => (
                        <label
                          className={longFields.has(key) ? "wide" : ""}
                          key={key}
                        >
                          {label}
                          {longFields.has(key) ? (
                            <textarea
                              value={profile.about[key]}
                              rows={6}
                              maxLength={100_000}
                              onChange={(e) => about(key, e.target.value)}
                            />
                          ) : (
                            <input
                              value={profile.about[key]}
                              type={
                                key === "publicEmail"
                                  ? "email"
                                  : key === "githubURL"
                                    ? "url"
                                    : "text"
                              }
                              maxLength={1000}
                              onChange={(e) => about(key, e.target.value)}
                            />
                          )}
                        </label>
                      ))}
                    </div>
                    <div className="profile-avatar-edit">
                      <ProfileImage
                        entry={entry}
                        id={profile.about.avatarId}
                        alt="当前头像预览"
                      />
                      <label>
                        个人头像（选填）
                        <input
                          type="file"
                          disabled={busy}
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) void upload(f, "avatar");
                          }}
                        />
                      </label>
                      {profile.about.avatarId && (
                        <button onClick={() => about("avatarId", "")}>
                          移除头像
                        </button>
                      )}
                    </div>
                    {(["socialLinks", "otherLinks"] as const).map((key) => (
                      <LinkEditor
                        key={key}
                        label={
                          key === "socialLinks" ? "社交链接" : "其他个人链接"
                        }
                        links={profile.about[key]}
                        onChange={(links) => about(key, links)}
                      />
                    ))}
                  </>
                ) : (
                  <>
                    <button
                      className="accent"
                      onClick={() =>
                        setProfile({
                          ...profile,
                          [section]: [...profile[section], blankRow(section)],
                        } as StructuredProfile)
                      }
                    >
                      添加{PROFILE_SECTIONS[section]}
                    </button>
                    {profile[section].length === 0 && (
                      <p className="profile-empty">
                        尚未填写。你可以稍后添加，不会自动生成虚构经历。
                      </p>
                    )}
                    {profile[section].map((item, index) => (
                      <fieldset className="profile-row-editor" key={item.id}>
                        <legend>
                          {PROFILE_SECTIONS[section]} {index + 1}
                        </legend>
                        <div className="profile-field-grid">
                          {fields[section].map(([key, label]) => {
                            const value =
                              (
                                item as unknown as Record<
                                  string,
                                  string | number
                                >
                              )[key] ?? "";
                            return (
                              <label
                                className={longFields.has(key) ? "wide" : ""}
                                key={key}
                              >
                                {label}
                                {longFields.has(key) ? (
                                  <textarea
                                    rows={4}
                                    value={value}
                                    maxLength={100_000}
                                    onChange={(e) =>
                                      setProfile({
                                        ...profile,
                                        [section]: profile[section].map(
                                          (row) =>
                                            row.id === item.id
                                              ? {
                                                  ...row,
                                                  [key]: e.target.value,
                                                }
                                              : row,
                                        ),
                                      } as StructuredProfile)
                                    }
                                  />
                                ) : (
                                  <input
                                    type={
                                      key === "sortOrder"
                                        ? "number"
                                        : key === "proofURL"
                                          ? "url"
                                          : "text"
                                    }
                                    value={value}
                                    maxLength={1000}
                                    onChange={(e) =>
                                      setProfile({
                                        ...profile,
                                        [section]: profile[section].map(
                                          (row) =>
                                            row.id === item.id
                                              ? {
                                                  ...row,
                                                  [key]:
                                                    key === "sortOrder"
                                                      ? Number(e.target.value)
                                                      : e.target.value,
                                                }
                                              : row,
                                        ),
                                      } as StructuredProfile)
                                    }
                                  />
                                )}
                              </label>
                            );
                          })}
                        </div>
                        {section === "awards" && (
                          <div>
                            <label>
                              荣誉证明图片（选填，公开前检查隐私）
                              <input
                                type="file"
                                disabled={busy}
                                accept="image/jpeg,image/png,image/webp"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (f) void upload(f, item.id);
                                }}
                              />
                            </label>
                            {profile.awards
                              .find((a) => a.id === item.id)
                              ?.imageIds.map((id) => (
                                <div key={id}>
                                  <ProfileImage
                                    entry={entry}
                                    id={id}
                                    alt="证明图片"
                                  />
                                  <button
                                    onClick={() =>
                                      setProfile({
                                        ...profile,
                                        awards: profile.awards.map((a) =>
                                          a.id === item.id
                                            ? {
                                                ...a,
                                                imageIds: a.imageIds.filter(
                                                  (x) => x !== id,
                                                ),
                                              }
                                            : a,
                                        ),
                                      })
                                    }
                                  >
                                    移除此证明图片
                                  </button>
                                </div>
                              ))}
                          </div>
                        )}
                        <div className="profile-row-actions">
                          <button
                            disabled={index === 0}
                            onClick={() => {
                              const rows = moveProfileRow(
                                profile[section] as Array<{
                                  id: string;
                                  sortOrder?: number;
                                }>,
                                index,
                                index - 1,
                              );
                              setProfile({
                                ...profile,
                                [section]: rows,
                              } as StructuredProfile);
                            }}
                          >
                            上移
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  "从当前草稿移除此行？保存前可重新加载已保存版本。",
                                )
                              )
                                setProfile({
                                  ...profile,
                                  [section]: profile[section].filter(
                                    (row) => row.id !== item.id,
                                  ),
                                } as StructuredProfile);
                            }}
                          >
                            移除此行
                          </button>
                        </div>
                      </fieldset>
                    ))}
                  </>
                )}
                <div className="profile-section-footer">
                  <button
                    className="accent"
                    disabled={busy || !dirty}
                    onClick={() => void save()}
                  >
                    保存当前填写
                  </button>
                  <button onClick={() => setPreview(true)}>查看完整预览</button>
                </div>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
function LinkEditor({
  label,
  links,
  onChange,
}: {
  label: string;
  links: ProfileLink[];
  onChange: (links: ProfileLink[]) => void;
}) {
  return (
    <section className="profile-link-editor">
      <h3>{label}（选填）</h3>
      {links.map((l) => (
        <div key={l.id}>
          <input
            aria-label={`${label}名称`}
            placeholder="显示名称"
            value={l.label}
            onChange={(e) =>
              onChange(
                links.map((x) =>
                  x.id === l.id ? { ...x, label: e.target.value } : x,
                ),
              )
            }
          />
          <input
            aria-label={`${label}网址`}
            type="url"
            placeholder="https://"
            value={l.url}
            onChange={(e) =>
              onChange(
                links.map((x) =>
                  x.id === l.id ? { ...x, url: e.target.value } : x,
                ),
              )
            }
          />
          <button onClick={() => onChange(links.filter((x) => x.id !== l.id))}>
            移除
          </button>
        </div>
      ))}
      <button
        onClick={() =>
          onChange([...links, { id: crypto.randomUUID(), label: "", url: "" }])
        }
      >
        添加{label}
      </button>
    </section>
  );
}
