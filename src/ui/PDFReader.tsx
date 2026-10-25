import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist";
import workerURL from "pdfjs-dist/build/pdf.worker.min.mjs?url";
GlobalWorkerOptions.workerSrc = workerURL;
export default function PDFReader({
  blob,
  title,
}: {
  blob: Blob;
  title: string;
}) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(""),
    [text, setText] = useState(""),
    [width, setWidth] = useState(600);
  const canvas = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let alive = true;
    let task: ReturnType<typeof getDocument> | undefined;
    setDoc(null);
    setPage(1);
    setError("");
    void blob
      .arrayBuffer()
      .then((data) => {
        if (!alive) return;
        task = getDocument({
          data: new Uint8Array(data),
          standardFontDataUrl: "/pdfjs/standard_fonts/",
          cMapUrl: "/pdfjs/cmaps/",
          cMapPacked: true,
          wasmUrl: "/pdfjs/wasm/",
          enableXfa: false,
        });
        return task.promise.then((pdf) => {
          if (alive) setDoc(pdf);
        });
      })
      .catch((e) => {
        if (alive) setError(`PDF 无法预览：${e.message}。仍可下载原文件。`);
      });
    return () => {
      alive = false;
      void task?.destroy();
    };
  }, [blob]);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(150, Math.min(900, entry.contentRect.width))),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!doc || !canvas.current) return;
    let alive = true;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    const node = canvas.current;
    setText("");
    void doc
      .getPage(page)
      .then(async (p) => {
        if (!alive) return;
        const viewport = p.getViewport({
          scale: width / p.getViewport({ scale: 1 }).width,
        });
        const dpr = Math.min(devicePixelRatio, 2);
        node.width = Math.ceil(viewport.width * dpr);
        node.height = Math.ceil(viewport.height * dpr);
        node.style.width = "100%";
        render = p.render({
          canvas: node,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        });
        await render.promise;
        const content = await p.getTextContent();
        if (alive)
          setText(
            content.items
              .map((item) => ("str" in item ? item.str : ""))
              .join(" "),
          );
      })
      .catch((e) => {
        if (alive && e.name !== "RenderingCancelledException")
          setError(`PDF 页面无法显示：${e.message}`);
      });
    return () => {
      alive = false;
      render?.cancel();
    };
  }, [doc, page, width]);
  return (
    <div className="pdf-reader" ref={host}>
      <div className="pdf-controls">
        <button
          disabled={!doc || page <= 1}
          onClick={() => setPage((n) => n - 1)}
        >
          上一页
        </button>
        <span>{doc ? `${page} / ${doc.numPages}` : "正在打开 PDF…"}</span>
        <button
          disabled={!doc || page >= doc.numPages}
          onClick={() => setPage((n) => n + 1)}
        >
          下一页
        </button>
      </div>
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <canvas
          ref={canvas}
          role="img"
          aria-label={`${title}，第 ${page} 页`}
        />
      )}
      <details>
        <summary>本页文字（辅助阅读）</summary>
        <p>{text || "此页没有可提取的文字，可能为扫描件。"}</p>
      </details>
    </div>
  );
}
