import { useEffect, useState } from "react";
import { type Entry, LABELS } from "../library/model";
import { createPublicPackage } from "../library/publishing";
import { downloadFile } from "../library/storage";
export function PublicationPanel({
  entries,
  dirty,
  onClose,
}: {
  entries: Entry[];
  dirty: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]),
    [reviewed, setReviewed] = useState(false),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [exportURL, setExportURL] = useState("");
  useEffect(() => {
    setReviewed(false);
  }, [entries, selected]);
  useEffect(
    () => () => {
      if (exportURL) URL.revokeObjectURL(exportURL);
    },
    [exportURL],
  );
  const visible = entries.filter((e) => !e.deletedAt);
  const exportSelected = async () => {
    setBusy(true);
    setMessage("");
    try {
      if (dirty) throw new Error("请先保存或撤销未保存的修改，再审核公开内容");
      const pack = await createPublicPackage(entries, selected, reviewed);
      const blob = new Blob([JSON.stringify(pack, null, 2)], {
        type: "application/json",
      });
      setExportURL(URL.createObjectURL(blob));
      downloadFile(blob, "personal-world-public-package.json");
      setMessage(
        `已生成 ${pack.records.length} 项已审核公开内容。下载后按下方步骤提交，浏览器编辑不会自动上线。`,
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="publication-panel" aria-label="审核并导出公开内容">
      <header>
        <h2>草稿 → 审核 → 公开内容</h2>
        <button onClick={onClose}>关闭发布面板</button>
      </header>
      <p>
        逐项检查正文、照片、附件与链接。仅勾选的资料会进入公开内容包；完整备份包含私密草稿，不能用于发布。
      </p>
      <div className="publication-list">
        {visible.length ? (
          visible.map((e) => (
            <label className="publication-item" key={e.id}>
              <input
                type="checkbox"
                checked={selected.includes(e.id)}
                onChange={(v) =>
                  setSelected((ids) =>
                    v.target.checked
                      ? [...ids, e.id]
                      : ids.filter((id) => id !== e.id),
                  )
                }
              />
              <span>
                <strong>
                  {LABELS[e.kind]} · {e.title}
                </strong>
                <small>
                  {e.body.slice(0, 180) || "无正文"}
                  {e.blob ? ` · 附件：${e.fileName}` : ""}
                  {e.images?.length ? ` · ${e.images.length} 张项目图片` : ""}
                </small>
                <small>
                  公开范围：此条所有已保存字段、正文及附件。请在资料阅读视图完整检查。
                </small>
              </span>
            </label>
          ))
        ) : (
          <p>还没有本地草稿。请先添加真实资料，再选择公开范围。</p>
        )}
      </div>
      <label className="review-consent">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        我已完整检查所选 {selected.length}{" "}
        项，确认这些内容和附件有权公开，可供所有访客访问。
      </label>
      <button
        className="accent"
        disabled={!reviewed || !selected.length || busy || dirty}
        onClick={() => void exportSelected()}
      >
        导出已审核公开内容包
      </button>
      {exportURL && (
        <a href={exportURL} download="personal-world-public-package.json">
          再次下载公开内容包
        </a>
      )}
      {message && <p role="status">{message}</p>}
      <details open>
        <summary>将内容更新到网站</summary>
        <ol>
          <li>导出并检查公开内容包。它与完整备份用途不同。</li>
          <li>
            在项目目录执行{" "}
            <code>
              node scripts/import_public_content.mjs
              /完整路径/personal-world-public-package.json
            </code>
            。
          </li>
          <li>
            检查 <code>git diff -- public/content</code>
            ，提交这些已审核静态文件并推送开发分支。
          </li>
          <li>
            GitHub Actions
            构建并部署后，其他浏览器可直接读取公开资料。重新导入会替换整套公开内容；取消发布时请移除相应记录并重新构建。
          </li>
        </ol>
      </details>
    </section>
  );
}
