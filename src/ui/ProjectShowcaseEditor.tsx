import type { Entry } from "../library/model";
import {
  emptyShowcase,
  type ProjectShowcaseData,
  type ProjectImageNote,
} from "../library/projectShowcase";
export function ProjectShowcaseEditor({
  entry,
  onChange,
}: {
  entry: Entry;
  onChange: (data: ProjectShowcaseData) => void;
}) {
  const data = entry.projectShowcase ?? emptyShowcase();
  const patch = (
    field: keyof ProjectShowcaseData,
    value: ProjectShowcaseData[keyof ProjectShowcaseData],
  ) => onChange({ ...data, [field]: value });
  const note = (imageId: string): ProjectImageNote =>
    data.imageNotes.find((n) => n.imageId === imageId) ?? {
      imageId,
      title: entry.images?.find((i) => i.id === imageId)?.name ?? "",
      caption: "",
      kind: "screenshot",
      sourceURL: "",
      revision: "",
      license: "",
    };
  const updateNote = (
    imageId: string,
    field: keyof ProjectImageNote,
    value: string,
  ) =>
    patch("imageNotes", [
      ...data.imageNotes.filter((n) => n.imageId !== imageId),
      { ...note(imageId), [field]: value },
    ]);
  return (
    <fieldset className="showcase-editor">
      <legend>作品展示与画廊</legend>
      <label>
        副标题
        <input
          value={data.subtitle}
          maxLength={4000}
          onChange={(e) => patch("subtitle", e.target.value)}
        />
      </label>
      <label>
        画廊样式
        <select
          value={data.galleryType}
          onChange={(e) => patch("galleryType", e.target.value)}
        >
          <option value="screenshots">项目截图</option>
          <option value="tarot">连续艺术牌廊</option>
        </select>
      </label>
      <label>
        团队、署名与展示许可
        <textarea
          aria-label="团队、署名与展示许可"
          value={data.credits}
          maxLength={8000}
          onChange={(e) => patch("credits", e.target.value)}
        />
      </label>
      <label>
        上游项目链接（如有）
        <input
          type="url"
          value={data.upstreamURL}
          onChange={(e) => patch("upstreamURL", e.target.value)}
        />
      </label>
      <label>
        封面
        <select
          value={data.coverId}
          onChange={(e) => patch("coverId", e.target.value)}
        >
          <option value="">第一张图片</option>
          {entry.images?.map((image) => (
            <option key={image.id} value={image.id}>
              {image.name}
            </option>
          ))}
        </select>
      </label>
      {data.galleryType === "tarot" && (
        <label>
          循环秒数（25–60）
          <input
            type="number"
            min={25}
            max={60}
            value={data.cycleSeconds}
            onChange={(e) => patch("cycleSeconds", Number(e.target.value))}
          />
        </label>
      )}
      <p>图片、说明、来源与精选牌面会随完整备份保存；公开发布仍须逐项审核。</p>
      {entry.images?.map((image) => {
        const n = note(image.id);
        return (
          <details className="image-meta" key={image.id}>
            <summary>{n.title || image.name} · 图片说明与来源</summary>
            {data.galleryType === "tarot" && (
              <label>
                <input
                  type="checkbox"
                  checked={data.tarotIds.includes(image.id)}
                  onChange={(e) =>
                    patch(
                      "tarotIds",
                      e.target.checked
                        ? [...data.tarotIds, image.id].slice(0, 12)
                        : data.tarotIds.filter((id) => id !== image.id),
                    )
                  }
                />
                加入动态精选（最多 12 张，顺序随勾选顺序）
              </label>
            )}
            <label>
              牌名／图片标题
              <input
                value={n.title}
                maxLength={240}
                onChange={(e) => updateNote(image.id, "title", e.target.value)}
              />
            </label>
            <label>
              图片说明
              <textarea
                aria-label="图片说明"
                value={n.caption}
                onChange={(e) =>
                  updateNote(image.id, "caption", e.target.value)
                }
              />
            </label>
            <label>
              素材类型
              <select
                value={n.kind}
                onChange={(e) => updateNote(image.id, "kind", e.target.value)}
              >
                <option value="screenshot">项目界面截图</option>
                <option value="prototype">前端原型／演示数据</option>
                <option value="artwork">原创牌面或角色</option>
                <option value="workflow">工作流资料</option>
              </select>
            </label>
            <label>
              来源链接
              <input
                type="url"
                value={n.sourceURL}
                onChange={(e) =>
                  updateNote(image.id, "sourceURL", e.target.value)
                }
              />
            </label>
            <label>
              提交／版本
              <input
                value={n.revision}
                maxLength={120}
                onChange={(e) =>
                  updateNote(image.id, "revision", e.target.value)
                }
              />
            </label>
            <label>
              许可／公开展示依据
              <textarea
                aria-label="许可／公开展示依据"
                value={n.license}
                onChange={(e) =>
                  updateNote(image.id, "license", e.target.value)
                }
              />
            </label>
          </details>
        );
      })}
    </fieldset>
  );
}
