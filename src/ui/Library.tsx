import {
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  type Entry,
  type Kind,
  LABELS,
  MAX_FILE,
  libraryBytes,
  newEntry,
  RESUME_LABELS,
  type ResumeSections,
  safeURL,
} from "../library/model";
import {
  decodeBackup,
  downloadFile,
  encodeBackup,
  validateAttachment,
  prepareImage,
} from "../library/storage";
import {
  PROJECT_FIELDS,
  entryMarkdown,
  emptyProjectDetails,
  publicationState,
  type ProjectDetails,
} from "../library/profile";
import { acknowledgeSavedDraft } from "../library/draftState";
import { ProfilePreview, ProfileImage } from "./ProfilePreview";
import { PublicationPanel } from "./PublicationPanel";
import "./library-v2.css";
import { Markdown } from "./Markdown";
const PDFReader = lazy(() => import("./PDFReader"));

export function useBlobURL(blob?: Blob) {
  const [value, setValue] = useState("");
  useEffect(() => {
    if (!blob) {
      setValue("");
      return;
    }
    const url = URL.createObjectURL(blob);
    setValue(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  return value;
}
function Thumbnail({ entry }: { entry: Entry }) {
  const media =
    entry.thumbnail ??
    entry.images?.[0]?.thumbnail ??
    entry.images?.[0]?.blob ??
    entry.blob;
  const url = useBlobURL(media?.type.startsWith("image/") ? media : undefined);
  return url ? (
    <img src={url} alt="" loading="lazy" />
  ) : (
    <span className="record-symbol">
      {entry.kind === "photos"
        ? "▧"
        : entry.kind === "projects"
          ? "↗"
          : entry.kind === "resume"
            ? "◎"
            : "≡"}
    </span>
  );
}
type Props = {
  /** Public Mac applications expose reading only; never mount editor controls. */
  readOnly?: boolean;
  workspace?: boolean;
  onOpenWorkspace?: () => void;
  onOpenProfile?: () => void;
  kind: Kind;
  selected: string | null;
  entries: Entry[];
  loading: boolean;
  error: string;
  onSelect: (id: string | null) => void;
  onSave: (entries: Entry[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (entries: Entry[]) => Promise<void>;
  published?: Entry[];
  publishedLoading?: boolean;
  onDirty: (dirty: boolean) => void;
  /** Unsaved edits in another mounted application. */
  otherDirty?: boolean;
};
export function Library({
  kind,
  readOnly = false,
  workspace,
  onOpenWorkspace,
  onOpenProfile,
  selected,
  entries,
  loading,
  error,
  onSelect,
  onSave,
  onDelete,
  onRestore,
  onDirty,
  otherDirty = false,
  published = [],
  publishedLoading = false,
}: Props) {
  const [source, setSource] = useState<"drafts" | "published" | null>(null),
    [publication, setPublication] = useState(false),
    [group, setGroup] = useState(""),
    [sort, setSort] = useState(readOnly ? "manual" : "updated");
  const [localWorkspace, setLocalWorkspace] = useState(false);
  const [previewFirst, setPreviewFirst] = useState(true);
  const inWorkspace = !readOnly && (workspace ?? localWorkspace);
  const isPublished = !inWorkspace || source === "published";
  const visibleEntries = isPublished ? published : entries;
  const [query, setQuery] = useState(""),
    [editing, setEditing] = useState(false),
    [trash, setTrash] = useState(false),
    [drafts, setDrafts] = useState<Record<string, Entry>>({});
  const [message, setMessage] = useState(""),
    [compressPhotos, setCompressPhotos] = useState(false),
    [busy, setBusy] = useState(false),
    [restore, setRestore] = useState<Entry[] | null>(null),
    [backup, setBackup] = useState<{ url: string; name: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null),
    restoreInput = useRef<HTMLInputElement>(null);
  const currentDrafts = useRef(drafts);
  currentDrafts.current = drafts;
  const dirtyCount = Object.keys(drafts).length;
  const guardedDirty = dirtyCount > 0 || otherDirty;
  const guardRef = useRef(guardedDirty);
  guardRef.current = guardedDirty;
  const requireSavedEditors = () => {
    if (guardRef.current)
      throw new Error(
        "请先保存或撤销所有应用中未保存的修改，再备份、恢复或审核公开内容",
      );
  };
  useEffect(() => {
    onDirty(dirtyCount > 0);
  }, [dirtyCount, onDirty]);
  useEffect(() => {
    setQuery("");
    setGroup("");
    setEditing(false);
    setMessage("");
  }, [kind, isPublished]);
  useEffect(
    () => () => {
      if (backup) URL.revokeObjectURL(backup.url);
    },
    [backup],
  );
  const groups = [
    ...new Set(
      visibleEntries
        .filter((e) => e.kind === kind && !e.deletedAt)
        .map((e) => (kind === "photos" ? e.album : e.category))
        .filter(Boolean),
    ),
  ] as string[];
  const items = visibleEntries
    .filter(
      (e) =>
        e.kind === kind &&
        (!group || (kind === "photos" ? e.album : e.category) === group) &&
        (trash ? !!e.deletedAt : !e.deletedAt) &&
        `${e.title} ${e.body} ${e.tags}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title)
        : sort === "created"
          ? b.createdAt.localeCompare(a.createdAt)
          : sort === "manual"
            ? (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
            : b.updatedAt.localeCompare(a.updatedAt),
    );
  const total = visibleEntries.filter(
    (e) => e.kind === kind && !e.deletedAt,
  ).length;
  const active = visibleEntries.find(
    (e) =>
      e.id === (selected ?? (readOnly && previewFirst ? items[0]?.id : null)) &&
      e.kind === kind &&
      (trash ? !!e.deletedAt : !e.deletedAt),
  );
  const getDraft = (id: string) =>
    Object.hasOwn(drafts, id) ? drafts[id] : undefined;
  const awaitingPublic = publishedLoading && isPublished && !active;
  const draft =
    active && (isPublished ? active : (getDraft(active.id) ?? active));
  const url = useBlobURL(active?.blob);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  const update = (field: keyof Entry, value: Entry[keyof Entry]) => {
    if (draft)
      setDrafts((old) => ({
        ...old,
        [draft.id]: { ...(old[draft.id] ?? draft), [field]: value },
      }));
  };
  const discard = (id: string) =>
    setDrafts((old) => {
      const next = { ...old };
      delete next[id];
      return next;
    });
  const create = () =>
    run(async () => {
      setSource("drafts");
      setTrash(false);
      const entry = newEntry(kind);
      await onSave([entry]);
      onSelect(entry.id);
      setEditing(true);
    });
  const save = () =>
    run(async () => {
      if (!draft) return;
      const snapshot = draft;
      await onSave([{ ...snapshot, updatedAt: new Date().toISOString() }]);
      const newerEdits =
        !!currentDrafts.current[snapshot.id] &&
        currentDrafts.current[snapshot.id] !== snapshot;
      setDrafts((old) => acknowledgeSavedDraft(old, snapshot.id, snapshot));
      if (!newerEdits) setEditing(false);
      setMessage(
        newerEdits
          ? "已保存提交时的版本；刚输入的修改仍未保存，请再次保存"
          : "已保存到此浏览器",
      );
    });
  const importFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    void run(async () => {
      if (files.length > 100) throw new Error("每次最多导入 100 个文件");
      const incoming: Entry[] = [];
      for (const file of files) {
        if (file.size > MAX_FILE) throw new Error(`${file.name} 超过 25 MB`);
        const entry = newEntry(kind, file.name.replace(/\.[^.]+$/, ""));
        if (
          kind === "photos" ||
          (kind === "resume" && file.name.toLowerCase().endsWith(".pdf"))
        ) {
          const attachment =
            kind === "resume"
              ? new Blob([file], { type: "application/pdf" })
              : file;
          await validateAttachment(attachment);
          if (kind === "photos") {
            const image = await prepareImage(attachment);
            entry.blob = compressPhotos ? image.blob : attachment;
            entry.thumbnail = image.thumbnail;
            entry.album = group;
            entry.fileName = compressPhotos
              ? file.name.replace(/\.[^.]+$/, "") + ".webp"
              : file.name;
          } else {
            entry.blob = attachment;
            entry.fileName = file.name;
          }
        } else {
          if (!/\.(md|markdown|txt)$/i.test(file.name))
            throw new Error("正文请使用 .md 或 .txt");
          if (file.size > 1_000_000) throw new Error("单篇正文不能超过 1 MB");
          entry.body = await file.text();
        }
        incoming.push(entry);
      }
      setSource("drafts");
      setTrash(false);
      await onSave(incoming);
      if (incoming[0]) onSelect(incoming[0].id);
      setMessage(
        `已导入 ${incoming.length} 项${kind === "photos" ? (compressPhotos ? "，已压缩并生成缩略图" : "，已保留原图并生成缩略图") : ""}；内容保存在当前浏览器`,
      );
    });
  };
  const exportBackup = () =>
    run(async () => {
      requireSavedEditors();
      const json = await encodeBackup(entries);
      requireSavedEditors();
      const name = `personal-world-${new Date().toLocaleDateString("sv-SE")}.json`;
      const blob = new Blob([json], { type: "application/json" });
      setBackup({ url: URL.createObjectURL(blob), name });
      downloadFile(blob, name);
      setMessage(
        "备份已生成，包含全部正文、照片、项目截图、结构化履历与 PDF 附件。请将下载文件保存在安全位置。",
      );
    });
  const readBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file)
      void run(async () => {
        requireSavedEditors();
        const incoming = await decodeBackup(file);
        requireSavedEditors();
        setRestore(incoming);
      });
  };
  const deleteCurrent = () => {
    if (
      !active ||
      !window.confirm(`将「${active.title}」移入回收站？可在回收站恢复。`)
    )
      return;
    void run(async () => {
      await onDelete(active.id);
      discard(active.id);
      onSelect(null);
      setMessage("已移入回收站，可随时恢复");
    });
  };
  return (
    <div className="library-app">
      {!readOnly && (
        <div className="source-switch" aria-label="资料来源">
          <button
            aria-pressed={inWorkspace && !isPublished}
            onClick={() => {
              if (!inWorkspace) {
                if (onOpenWorkspace) onOpenWorkspace();
                else setLocalWorkspace(true);
              }
              setSource("drafts");
              setTrash(false);
              onSelect(null);
            }}
          >
            {inWorkspace ? "本地草稿" : "进入本地编辑工作区"}
          </button>
          <button
            aria-pressed={isPublished}
            onClick={() => {
              setSource("published");
              setEditing(false);
              setTrash(false);
              onSelect(null);
            }}
          >
            已发布内容
          </button>
          <span>
            {isPublished
              ? "所有访客可见 · 只读"
              : "LOCAL EDITOR · 仅此浏览器，非管理员登录"}
          </span>
          {!isPublished && onOpenProfile && (
            <button onClick={onOpenProfile}>个人资料填写中心</button>
          )}
          {!isPublished && (
            <button
              disabled={busy || guardedDirty}
              onClick={() => setPublication((v) => !v)}
            >
              审核公开内容
            </button>
          )}
        </div>
      )}
      {publication && !isPublished && (
        <PublicationPanel
          entries={entries}
          dirty={guardedDirty}
          onClose={() => setPublication(false)}
        />
      )}

      <div className="library-toolbar">
        <div>
          <strong>
            {LABELS[kind]}
            {trash ? " · 回收站" : ""}
          </strong>
          <span>
            {total} 项{!readOnly && ` · ${isPublished ? "已发布" : "本地草稿"}`}
          </span>
        </div>
        <div className="toolbar-actions">
          {!isPublished && kind === "photos" && (
            <label>
              <input
                type="checkbox"
                checked={compressPhotos}
                onChange={(e) => setCompressPhotos(e.target.checked)}
              />
              导入时压缩为 WebP（不保留原文件）
            </label>
          )}
          {!isPublished && kind !== "photos" && (
            <button
              className="accent"
              disabled={busy || loading || !!error}
              onClick={create}
            >
              新建
              {kind === "notes"
                ? "笔记"
                : kind === "projects"
                  ? "项目"
                  : "履历"}
            </button>
          )}
          {!isPublished && kind !== "projects" && (
            <button
              disabled={busy || loading || !!error}
              onClick={() => fileInput.current?.click()}
            >
              导入{kind === "photos" ? "照片" : "文件"}
            </button>
          )}
          {!isPublished && (
            <button
              onClick={() => {
                setTrash((v) => !v);
                onSelect(null);
              }}
            >
              {trash ? "返回资料" : "回收站"}
            </button>
          )}
          {!isPublished && (
            <button
              disabled={busy || loading || !!error || guardedDirty}
              onClick={exportBackup}
            >
              导出全部备份
            </button>
          )}
          {!isPublished && (
            <button
              disabled={busy || loading || !!error || guardedDirty}
              onClick={() => restoreInput.current?.click()}
            >
              恢复备份
            </button>
          )}
        </div>
        {!readOnly && (
          <>
            <input
              ref={fileInput}
              type="file"
              aria-label="导入资料文件"
              hidden
              multiple
              accept={
                kind === "photos"
                  ? "image/jpeg,image/png,image/webp,image/gif"
                  : kind === "resume"
                    ? ".md,.txt,.markdown,.pdf"
                    : ".md,.markdown,.txt"
              }
              onChange={importFiles}
            />
            <input
              ref={restoreInput}
              type="file"
              aria-label="选择备份文件"
              hidden
              accept=".json,application/json"
              onChange={readBackup}
            />
          </>
        )}
      </div>
      {(message || error || busy) && (
        <div className={`app-message ${error ? "error" : ""}`} role="status">
          {error || message || (busy ? "正在处理，请稍候…" : "")}
        </div>
      )}
      {otherDirty && !isPublished && (
        <p className="app-message" role="status">
          其他应用有未保存修改；可继续保存本窗口，全部保存后再备份、恢复或审核。
        </p>
      )}
      {backup && !isPublished && !guardedDirty && (
        <a className="backup-link" href={backup.url} download={backup.name}>
          再次下载刚生成的完整备份
        </a>
      )}
      {restore && !isPublished && (
        <section className="restore-preview" aria-label="恢复备份预览">
          <strong>即将恢复 {restore.length} 项</strong>
          <p>
            合并到当前资料库；相同 ID 的记录会被备份中的版本替换，其余资料保留。
          </p>
          <button
            className="accent"
            disabled={busy || guardedDirty}
            onClick={() =>
              run(async () => {
                requireSavedEditors();
                await onRestore(restore);
                setRestore(null);
                setMessage("备份恢复完成");
              })
            }
          >
            确认合并恢复
          </button>
          <button onClick={() => setRestore(null)}>取消恢复</button>
        </section>
      )}
      <div className={`library-layout ${active ? "has-selection" : ""}`}>
        <aside className="record-list" aria-label={`${LABELS[kind]} 资料列表`}>
          <label className="search-label">
            <span className="sr-only">搜索资料</span>
            <input
              type="search"
              placeholder="搜索标题、正文、标签"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="list-filters">
            <label>
              {kind === "photos" ? "相册" : "分类"}
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                <option value="">全部</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              排序
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="updated">最近更新</option>
                <option value="created">创建时间</option>
                <option value="title">标题</option>
                <option value="manual">自定义顺序</option>
              </select>
            </label>
          </div>
          {awaitingPublic ? (
            <p className="list-empty" role="status">
              正在读取公开资料…
            </p>
          ) : loading && !isPublished ? (
            <p className="list-empty">正在打开本地资料库…</p>
          ) : items.length === 0 ? (
            <p className="list-empty">
              {query
                ? "没有匹配的资料"
                : isPublished
                  ? "这里的内容正在整理，稍后再来看看。"
                  : "还没有资料。请新建或导入你自己的内容。"}
            </p>
          ) : (
            items.map((entry) => (
              <button
                className={`record-row ${active?.id === entry.id ? "selected" : ""}`}
                key={entry.id}
                onClick={() => {
                  onSelect(entry.id);
                }}
                aria-current={active?.id === entry.id ? "true" : undefined}
              >
                <Thumbnail entry={entry} />
                <span>
                  <strong>
                    {entry.title}
                    {!isPublished && getDraft(entry.id) ? " · 未保存" : ""}
                  </strong>
                  <small>
                    {entry.tags ||
                      entry.body.replace(/[#*`>]/g, "").slice(0, 65) ||
                      (entry.blob
                        ? `${(entry.blob.size / 1024 / 1024).toFixed(1)} MB`
                        : "点击填写内容")}
                  </small>
                  <time dateTime={entry.updatedAt}>
                    {new Date(entry.updatedAt).toLocaleDateString()}
                  </time>
                </span>
              </button>
            ))
          )}
          <p className="storage-note">
            {isPublished ? (
              readOnly ? (
                "作者的文字与生活片段。"
              ) : (
                "此处显示作者已审核并构建到网站的公开资料。访客本地草稿不会自动公开。"
              )
            ) : (
              <>
                共 {(libraryBytes(entries) / 1024 / 1024).toFixed(1)} / 100 MB
                <br />
                资料仅保存在当前浏览器与本站地址下。清除网站数据会移除资料，请定期导出备份。
              </>
            )}
          </p>
        </aside>
        <section className="record-detail" aria-label="资料内容">
          {awaitingPublic ? (
            <div className="empty-detail">
              <p role="status">正在读取公开资料…</p>
            </div>
          ) : !active || !draft ? (
            <div className="empty-detail">
              <span className="empty-icon">
                {kind === "notes"
                  ? "≡"
                  : kind === "photos"
                    ? "▧"
                    : kind === "projects"
                      ? "↗"
                      : "◎"}
              </span>
              <h1>
                {selected
                  ? isPublished
                    ? "此条公开资料不存在"
                    : "这条资料不在当前浏览器中"
                  : LABELS[kind]}
              </h1>
              <p>
                {selected
                  ? isPublished
                    ? "内容可能已取消发布，请选择其他资料。"
                    : "资料链接需要相应本地记录。请恢复备份，或从列表选择其他资料。"
                  : isPublished
                    ? items.length
                      ? "选择列表中的资料开始阅读。"
                      : "这里的内容正在整理，可以先去其他应用看看。"
                    : kind === "photos"
                      ? "导入照片，添加说明，保存属于你的瞬间。"
                      : kind === "projects"
                        ? "记录项目、过程与链接，让作品有一个安静的归处。"
                        : kind === "resume"
                          ? "写下你的经历，或导入已有的 Markdown / PDF 履历。"
                          : "写下想法，或导入已有的 Markdown / TXT 笔记。"}
              </p>
              {!isPublished &&
                (kind === "photos" ? (
                  <button
                    className="accent"
                    disabled={busy || loading || !!error}
                    onClick={() => fileInput.current?.click()}
                  >
                    导入第一张照片
                  </button>
                ) : (
                  <button
                    className="accent"
                    disabled={busy || loading || !!error}
                    onClick={create}
                  >
                    开始创建
                  </button>
                ))}
              {!readOnly && (
                <p className="quiet">
                  不包含虚构的个人资料。所有内容由你添加。
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="detail-actions">
                <button
                  className="mobile-back"
                  onClick={() => {
                    setPreviewFirst(false);
                    onSelect(null);
                  }}
                >
                  ← 列表
                </button>
                <span>
                  {isPublished
                    ? readOnly
                      ? LABELS[kind]
                      : "已公开 · 只读"
                    : getDraft(active.id)
                      ? "有未保存的修改"
                      : "已保存在本地"}
                </span>
                {!isPublished && (
                  <button onClick={() => setEditing((v) => !v)}>
                    {editing ? "阅读" : "编辑"}
                  </button>
                )}
                {!isPublished && getDraft(active.id) && (
                  <>
                    <button className="accent" disabled={busy} onClick={save}>
                      保存修改
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("撤销此条资料未保存的修改？"))
                          discard(active.id);
                      }}
                    >
                      撤销修改
                    </button>
                  </>
                )}
                {!isPublished &&
                  (trash ? (
                    <button
                      className="accent"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          const { deletedAt, ...rest } = active;
                          await onSave([rest]);
                          setTrash(false);
                          setMessage("资料已恢复");
                        })
                      }
                    >
                      恢复此资料
                    </button>
                  ) : (
                    <button
                      className="danger"
                      disabled={busy}
                      onClick={deleteCurrent}
                    >
                      移入回收站
                    </button>
                  ))}
              </div>
              {editing && !isPublished ? (
                <form
                  className="editor"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void save();
                  }}
                >
                  <label>
                    标题
                    <input
                      value={draft.title}
                      maxLength={240}
                      onChange={(e) => update("title", e.target.value)}
                      required
                    />
                  </label>
                  <label>
                    {kind === "photos" ? "相册" : "分类"}
                    <input
                      value={
                        (kind === "photos" ? draft.album : draft.category) ?? ""
                      }
                      maxLength={1000}
                      onChange={(e) =>
                        update(
                          kind === "photos" ? "album" : "category",
                          e.target.value,
                        )
                      }
                    />
                  </label>
                  <label>
                    自定义顺序（较小的排在前面）
                    <input
                      type="number"
                      value={draft.sortOrder ?? 0}
                      onChange={(e) =>
                        update("sortOrder", Number(e.target.value))
                      }
                    />
                  </label>
                  <label>
                    标签
                    <input
                      value={draft.tags}
                      maxLength={1000}
                      placeholder="以逗号分隔，例如：旅行, 生活"
                      onChange={(e) => update("tags", e.target.value)}
                    />
                  </label>
                  {kind === "projects" && (
                    <label>
                      项目网址
                      <input
                        type="url"
                        placeholder="https://"
                        value={draft.url}
                        maxLength={2048}
                        onChange={(e) => update("url", e.target.value)}
                      />
                    </label>
                  )}
                  <label>
                    公开准备状态
                    <select
                      value={draft.publicationStatus ?? "draft"}
                      onChange={(e) =>
                        update(
                          "publicationStatus",
                          e.target.value as "draft" | "ready",
                        )
                      }
                    >
                      <option value="draft">
                        本地草稿（默认，不自动公开）
                      </option>
                      <option value="ready">已准备好，仍需审核导出</option>
                    </select>
                    <small>{publicationState(active, published)}</small>
                  </label>
                  {kind === "photos" && (
                    <>
                      <label>
                        图片时间
                        <input
                          type="datetime-local"
                          value={draft.photoTakenAt ?? ""}
                          onChange={(e) =>
                            update("photoTakenAt", e.target.value)
                          }
                        />
                      </label>
                      <label>
                        地点（选填，默认仅本地）
                        <input
                          value={draft.photoLocation ?? ""}
                          onChange={(e) =>
                            update("photoLocation", e.target.value)
                          }
                        />
                      </label>
                      <label className="privacy-choice">
                        <input
                          type="checkbox"
                          checked={draft.photoLocationPublic ?? false}
                          onChange={(e) =>
                            update("photoLocationPublic", e.target.checked)
                          }
                        />
                        公开时一并包含这个地点（默认不勾选）
                      </label>
                      <label className="privacy-choice">
                        <input
                          type="checkbox"
                          checked={draft.isAlbumCover ?? false}
                          onChange={(e) =>
                            update("isAlbumCover", e.target.checked)
                          }
                        />
                        设为相册封面
                      </label>
                      <p className="quiet">
                        公开图片会重新编码以移除
                        EXIF；本地原图与完整备份可能保留原始元数据，请妥善保管。
                      </p>
                    </>
                  )}
                  {kind === "notes" && (
                    <ProjectImages
                      entry={draft}
                      editing
                      onChange={(images) =>
                        setDrafts((old) => ({
                          ...old,
                          [draft.id]: {
                            ...(old[draft.id] ?? draft),
                            images,
                            coverImageId: images[0]?.id ?? "",
                          },
                        }))
                      }
                      onError={setMessage}
                      onBusy={setBusy}
                    />
                  )}
                  {kind === "projects" && (
                    <>
                      {(
                        Object.keys(PROJECT_FIELDS) as (keyof ProjectDetails)[]
                      ).map((key) => (
                        <label key={key}>
                          {PROJECT_FIELDS[key]}
                          <textarea
                            rows={3}
                            maxLength={100_000}
                            value={draft.projectDetails?.[key] ?? ""}
                            onChange={(e) =>
                              update("projectDetails", {
                                ...emptyProjectDetails(),
                                ...draft.projectDetails,
                                [key]: e.target.value,
                              })
                            }
                          />
                        </label>
                      ))}
                      <label>
                        技术栈
                        <input
                          value={draft.technology ?? ""}
                          maxLength={1000}
                          placeholder="React, TypeScript, Three.js"
                          onChange={(e) => update("technology", e.target.value)}
                        />
                      </label>
                      <label>
                        GitHub 链接
                        <input
                          type="url"
                          value={draft.githubURL ?? ""}
                          onChange={(e) => update("githubURL", e.target.value)}
                        />
                      </label>
                      <label>
                        Demo 链接
                        <input
                          type="url"
                          value={draft.demoURL ?? ""}
                          onChange={(e) => update("demoURL", e.target.value)}
                        />
                      </label>
                      <ProjectImages
                        entry={draft}
                        editing
                        onChange={(images) => update("images", images)}
                        onError={setMessage}
                        onBusy={setBusy}
                      />
                    </>
                  )}
                  {kind === "resume" && (
                    <>
                      {(
                        Object.keys(RESUME_LABELS) as (keyof ResumeSections)[]
                      ).map((key) => (
                        <label key={key}>
                          {RESUME_LABELS[key]}
                          <textarea
                            rows={4}
                            value={draft.resume?.[key] ?? ""}
                            maxLength={100_000}
                            onChange={(e) =>
                              update("resume", {
                                ...Object.fromEntries(
                                  Object.keys(RESUME_LABELS).map((k) => [
                                    k,
                                    "",
                                  ]),
                                ),
                                ...draft.resume,
                                [key]: e.target.value,
                              } as ResumeSections)
                            }
                          />
                        </label>
                      ))}
                      <label>
                        替换或添加 PDF 附件
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              void run(async () => {
                                const pdf = new Blob([file], {
                                  type: "application/pdf",
                                });
                                await validateAttachment(pdf);
                                setDrafts((old) => ({
                                  ...old,
                                  [draft.id]: {
                                    ...draft,
                                    blob: pdf,
                                    fileName: file.name,
                                  },
                                }));
                              });
                            e.target.value = "";
                          }}
                        />
                      </label>
                      {draft.blob && (
                        <button
                          type="button"
                          onClick={() =>
                            setDrafts((old) => ({
                              ...old,
                              [draft.id]: {
                                ...draft,
                                blob: undefined,
                                fileName: undefined,
                              },
                            }))
                          }
                        >
                          移除此 PDF 附件
                        </button>
                      )}
                    </>
                  )}
                  <label>
                    {kind === "photos"
                      ? "照片说明 / 替代文本"
                      : "正文 · 支持基础 Markdown"}
                    <textarea
                      value={draft.body}
                      maxLength={1_000_000}
                      rows={kind === "photos" ? 6 : 18}
                      onChange={(e) => update("body", e.target.value)}
                    />
                  </label>
                  <button className="accent" disabled={busy} type="submit">
                    保存修改
                  </button>
                </form>
              ) : (
                <article className="reading">
                  <p className="eyebrow">
                    {LABELS[kind]} /{" "}
                    {new Date(active.updatedAt).toLocaleDateString()}
                  </p>
                  <h1>{active.title}</h1>
                  {active.tags && <p className="tags">{active.tags}</p>}
                  <p className="quiet">
                    创建 {new Date(active.createdAt).toLocaleDateString()} ·
                    更新 {new Date(active.updatedAt).toLocaleDateString()} ·{" "}
                    {isPublished
                      ? "已发布"
                      : publicationState(active, published)}
                  </p>
                  {active.coverImageId && (
                    <ProfileImage
                      entry={active}
                      id={active.coverImageId}
                      alt={`${active.title} 封面`}
                    />
                  )}
                  {active.structuredProfile && (
                    <ProfilePreview entry={active} />
                  )}
                  {kind === "photos" && (
                    <p className="quiet">
                      {active.album && `相册：${active.album} · `}
                      {active.photoTakenAt &&
                        `图片时间：${active.photoTakenAt} · `}
                      {active.photoLocation &&
                        `地点：${active.photoLocation}${!isPublished && !active.photoLocationPublic ? "（仅本地）" : ""}`}
                      {active.isAlbumCover && " · 相册封面"}
                    </p>
                  )}
                  {kind === "photos" && url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title="在新标签页查看照片"
                    >
                      <img
                        className="photo-full"
                        src={url}
                        alt={active.body || active.title}
                      />
                    </a>
                  )}
                  {kind === "resume" && url && (
                    <>
                      <Suspense fallback={<p>正在准备本地 PDF 阅读器…</p>}>
                        <PDFReader blob={active.blob!} title={active.title} />
                      </Suspense>
                      <a
                        className="file-download"
                        href={url}
                        download={active.fileName || "resume.pdf"}
                      >
                        下载 PDF 原文件
                      </a>
                    </>
                  )}
                  {kind === "projects" && (
                    <>
                      <ProjectImages entry={active} />
                      {active.projectDetails &&
                        (
                          Object.keys(
                            PROJECT_FIELDS,
                          ) as (keyof ProjectDetails)[]
                        ).map(
                          (key) =>
                            active.projectDetails?.[key] && (
                              <section key={key}>
                                <h2>{PROJECT_FIELDS[key]}</h2>
                                <Markdown text={active.projectDetails[key]} />
                              </section>
                            ),
                        )}
                      <p className="tags">{active.technology}</p>
                      {(
                        [
                          ["GitHub", active.githubURL],
                          ["Demo", active.demoURL],
                        ] as const
                      ).map(([name, link]) =>
                        link && safeURL(link) ? (
                          <a
                            className="project-link"
                            key={name}
                            href={safeURL(link)!}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {name} ↗
                          </a>
                        ) : null,
                      )}
                    </>
                  )}
                  {kind === "resume" &&
                    active.resume &&
                    (
                      Object.keys(RESUME_LABELS) as (keyof ResumeSections)[]
                    ).map(
                      (key) =>
                        active.resume?.[key] && (
                          <section key={key}>
                            <h2>{RESUME_LABELS[key]}</h2>
                            <Markdown text={active.resume[key]} />
                          </section>
                        ),
                    )}
                  {active.body ? (
                    <Markdown text={active.body} />
                  ) : (
                    !active.blob &&
                    !active.resume && (
                      <p className="quiet">
                        {readOnly
                          ? "内容正在整理。"
                          : "正文还是空的，点击编辑开始填写。"}
                      </p>
                    )
                  )}
                  {active.url && safeURL(active.url) && (
                    <a
                      className="project-link"
                      href={safeURL(active.url)!}
                      target="_blank"
                      rel="noreferrer"
                    >
                      访问项目 ↗<small>{active.url}</small>
                    </a>
                  )}
                  {active.blob && kind === "photos" && (
                    <a
                      className="file-download"
                      href={url}
                      download={active.fileName || active.title}
                    >
                      下载照片
                    </a>
                  )}
                  {!readOnly && (!active.blob || kind === "resume") && (
                    <button
                      className="text-button"
                      onClick={() =>
                        downloadFile(
                          new Blob([entryMarkdown(active)], {
                            type: "text/markdown;charset=utf-8",
                          }),
                          `${active.title.replace(/[\\/:*?"<>|]/g, "-")}.md`,
                        )
                      }
                    >
                      导出此篇 Markdown ↓
                    </button>
                  )}
                </article>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
function AttachmentImage({ blob, title }: { blob: Blob; title: string }) {
  const url = useBlobURL(blob);
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img className="project-image" src={url} alt={title} loading="lazy" />
    </a>
  );
}
function ProjectImages({
  entry,
  editing = false,
  onChange,
  onError,
  onBusy,
}: {
  entry: Entry;
  editing?: boolean;
  onChange?: (images: NonNullable<Entry["images"]>) => void;
  onError?: (message: string) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const [processing, setProcessing] = useState(false);
  const images = entry.images ?? [];
  const maxImages = entry.kind === "notes" ? 1 : 12;
  return (
    <div className="project-gallery">
      {editing && (
        <label>
          {entry.kind === "notes"
            ? "随笔封面（选填，最多 1 张）"
            : "项目封面与截图（第一张为封面，最多 12 张）"}
          <input
            type="file"
            multiple
            disabled={processing}
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              setProcessing(true);
              onBusy?.(true);
              void (async () => {
                try {
                  if (images.length + files.length > maxImages)
                    throw new Error(`此类资料最多 ${maxImages} 张图片`);
                  const added = [];
                  for (const file of files) {
                    const prepared = await prepareImage(file);
                    added.push({
                      id: crypto.randomUUID(),
                      name: file.name.replace(/\.[^.]+$/, "") + ".webp",
                      ...prepared,
                    });
                  }
                  onChange?.([...images, ...added]);
                } catch (error) {
                  onError?.(
                    error instanceof Error ? error.message : String(error),
                  );
                } finally {
                  setProcessing(false);
                  onBusy?.(false);
                }
              })();
            }}
          />
          {processing && <span role="status">正在压缩图片…</span>}
        </label>
      )}
      {images.map((image, index) => (
        <figure key={image.id}>
          <AttachmentImage
            blob={image.blob}
            title={`${entry.title} · ${index === 0 ? "封面" : `截图 ${index}`}`}
          />
          {editing && (
            <figcaption>
              {index === 0 ? "封面" : "截图"}
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const reordered = [...images];
                  [reordered[index - 1], reordered[index]] = [
                    reordered[index],
                    reordered[index - 1],
                  ];
                  onChange?.(reordered);
                }}
              >
                前移
              </button>
              <button
                type="button"
                onClick={() =>
                  onChange?.(images.filter((x) => x.id !== image.id))
                }
              >
                移除此图
              </button>
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
