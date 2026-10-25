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
  safeURL,
} from "../library/model";
import {
  decodeBackup,
  downloadFile,
  encodeBackup,
  validateAttachment,
} from "../library/storage";
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
  const url = useBlobURL(entry.blob);
  return url && entry.blob?.type.startsWith("image/") ? (
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
  kind: Kind;
  selected: string | null;
  entries: Entry[];
  loading: boolean;
  error: string;
  onSelect: (id: string | null) => void;
  onSave: (entries: Entry[]) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onRestore: (entries: Entry[]) => Promise<void>;
  onDirty: (dirty: boolean) => void;
};
export function Library({
  kind,
  selected,
  entries,
  loading,
  error,
  onSelect,
  onSave,
  onDelete,
  onRestore,
  onDirty,
}: Props) {
  const [query, setQuery] = useState(""),
    [editing, setEditing] = useState(false),
    [trash, setTrash] = useState(false),
    [drafts, setDrafts] = useState<Record<string, Entry>>({});
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [restore, setRestore] = useState<Entry[] | null>(null),
    [backup, setBackup] = useState<{ url: string; name: string } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null),
    restoreInput = useRef<HTMLInputElement>(null);
  const active = entries.find(
    (e) =>
      e.id === selected &&
      e.kind === kind &&
      (trash ? !!e.deletedAt : !e.deletedAt),
  );
  const getDraft = (id: string) =>
    Object.hasOwn(drafts, id) ? drafts[id] : undefined;
  const draft = active && (getDraft(active.id) ?? active);
  const url = useBlobURL(active?.blob);
  const dirtyCount = Object.keys(drafts).length;
  useEffect(() => {
    onDirty(dirtyCount > 0);
  }, [dirtyCount, onDirty]);
  useEffect(() => {
    setQuery("");
    setEditing(false);
    setMessage("");
  }, [kind]);
  useEffect(
    () => () => {
      if (backup) URL.revokeObjectURL(backup.url);
    },
    [backup],
  );
  const items = entries
    .filter(
      (e) =>
        e.kind === kind &&
        (trash ? !!e.deletedAt : !e.deletedAt) &&
        `${e.title} ${e.body} ${e.tags}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const total = entries.filter((e) => e.kind === kind && !e.deletedAt).length;
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
  const update = (field: "title" | "body" | "tags" | "url", value: string) => {
    if (draft)
      setDrafts((old) => ({
        ...old,
        [draft.id]: { ...draft, [field]: value },
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
      setTrash(false);
      const entry = newEntry(kind);
      await onSave([entry]);
      onSelect(entry.id);
      setEditing(true);
    });
  const save = () =>
    run(async () => {
      if (!draft) return;
      await onSave([{ ...draft, updatedAt: new Date().toISOString() }]);
      discard(draft.id);
      setEditing(false);
      setMessage("已保存到此浏览器");
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
          entry.blob = attachment;
          entry.fileName = file.name;
        } else {
          if (!/\.(md|markdown|txt)$/i.test(file.name))
            throw new Error("正文请使用 .md 或 .txt");
          if (file.size > 1_000_000) throw new Error("单篇正文不能超过 1 MB");
          entry.body = await file.text();
        }
        incoming.push(entry);
      }
      setTrash(false);
      await onSave(incoming);
      if (incoming[0]) onSelect(incoming[0].id);
      setMessage(`已导入 ${incoming.length} 项，原文件保留在浏览器本地`);
    });
  };
  const exportBackup = () =>
    run(async () => {
      if (dirtyCount) throw new Error("请先保存或撤销未保存的修改，再导出备份");
      const json = await encodeBackup(entries);
      const name = `personal-world-${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([json], { type: "application/json" });
      setBackup({ url: URL.createObjectURL(blob), name });
      downloadFile(blob, name);
      setMessage(
        "备份已生成，包含全部正文与照片 / PDF 原文件。请将下载文件保存在安全位置。",
      );
    });
  const readBackup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file)
      void run(async () => {
        if (dirtyCount)
          throw new Error("请先保存或撤销未保存的修改，再恢复备份");
        setRestore(await decodeBackup(file));
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
      <div className="library-toolbar">
        <div>
          <strong>
            {LABELS[kind]}
            {trash ? " · 回收站" : ""}
          </strong>
          <span>{total} 项 · 本地资料</span>
        </div>
        <div className="toolbar-actions">
          {kind !== "photos" && (
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
          {kind !== "projects" && (
            <button
              disabled={busy || loading || !!error}
              onClick={() => fileInput.current?.click()}
            >
              导入{kind === "photos" ? "照片" : "文件"}
            </button>
          )}
          <button
            onClick={() => {
              setTrash((v) => !v);
              onSelect(null);
            }}
          >
            {trash ? "返回资料" : "回收站"}
          </button>
          <button disabled={busy || loading || !!error} onClick={exportBackup}>
            导出全部备份
          </button>
          <button
            disabled={busy || loading || !!error}
            onClick={() => restoreInput.current?.click()}
          >
            恢复备份
          </button>
        </div>
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
      </div>
      {(message || error || busy) && (
        <div className={`app-message ${error ? "error" : ""}`} role="status">
          {error || message || (busy ? "正在处理，请稍候…" : "")}
        </div>
      )}
      {backup && (
        <a className="backup-link" href={backup.url} download={backup.name}>
          再次下载刚生成的完整备份
        </a>
      )}
      {restore && (
        <section className="restore-preview" aria-label="恢复备份预览">
          <strong>即将恢复 {restore.length} 项</strong>
          <p>
            合并到当前资料库；相同 ID 的记录会被备份中的版本替换，其余资料保留。
          </p>
          <button
            className="accent"
            disabled={busy}
            onClick={() =>
              run(async () => {
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
          {loading ? (
            <p className="list-empty">正在打开本地资料库…</p>
          ) : items.length === 0 ? (
            <p className="list-empty">
              {query
                ? "没有匹配的资料"
                : "还没有资料。请新建或导入你自己的内容。"}
            </p>
          ) : (
            items.map((entry) => (
              <button
                className={`record-row ${selected === entry.id ? "selected" : ""}`}
                key={entry.id}
                onClick={() => {
                  onSelect(entry.id);
                }}
                aria-current={selected === entry.id ? "true" : undefined}
              >
                <Thumbnail entry={entry} />
                <span>
                  <strong>
                    {entry.title}
                    {getDraft(entry.id) ? " · 未保存" : ""}
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
            共 {(libraryBytes(entries) / 1024 / 1024).toFixed(1)} / 100 MB
            <br />
            资料仅保存在当前浏览器与本站地址下。清除网站数据会移除资料，请定期导出备份。
          </p>
        </aside>
        <section className="record-detail" aria-label="资料内容">
          {!active || !draft ? (
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
                  ? "这条资料不在当前浏览器中"
                  : "A place for your " + LABELS[kind].toLowerCase() + "."}
              </h1>
              <p>
                {selected
                  ? "资料链接需要相应本地记录。请恢复备份，或从列表选择其他资料。"
                  : kind === "photos"
                    ? "导入照片，添加说明，保存属于你的瞬间。"
                    : kind === "projects"
                      ? "记录项目、过程与链接，让作品有一个安静的归处。"
                      : kind === "resume"
                        ? "写下你的经历，或导入已有的 Markdown / PDF 履历。"
                        : "写下想法，或导入已有的 Markdown / TXT 笔记。"}
              </p>
              {kind === "photos" ? (
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
              )}
              <p className="quiet">不包含虚构的个人资料。所有内容由你添加。</p>
            </div>
          ) : (
            <>
              <div className="detail-actions">
                <button className="mobile-back" onClick={() => onSelect(null)}>
                  ← 列表
                </button>
                <span>
                  {getDraft(active.id) ? "有未保存的修改" : "已保存在本地"}
                </span>
                <button onClick={() => setEditing((v) => !v)}>
                  {editing ? "阅读" : "编辑"}
                </button>
                {getDraft(active.id) && (
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
                {trash ? (
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
                )}
              </div>
              {editing ? (
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
                  {kind === "photos" && url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      title="在新标签页查看原图"
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
                  {active.body ? (
                    <Markdown text={active.body} />
                  ) : (
                    !active.blob && (
                      <p className="quiet">正文还是空的，点击编辑开始填写。</p>
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
                      下载照片原文件
                    </a>
                  )}
                  {!active.blob && (
                    <button
                      className="text-button"
                      onClick={() =>
                        downloadFile(
                          new Blob(
                            [
                              `# ${active.title}\n\n${active.body}${active.url ? `\n\n${active.url}` : ""}`,
                            ],
                            { type: "text/markdown;charset=utf-8" },
                          ),
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
