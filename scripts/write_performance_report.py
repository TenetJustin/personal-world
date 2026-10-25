"""Summarize actual browser JSON without dropping slow frames or inventing GPU metrics."""
from pathlib import Path
import json, math
ROOT=Path(__file__).resolve().parents[1];D=ROOT/'docs/phase-01';T=D/'tests'
final=[];baseline=[]
for p in sorted(T.glob('*.json')):
 if '-60s' not in p.name and '-before-shadow-cache' not in p.name:continue
 d=json.loads(p.read_text());a=d['frames'];times=sorted(f['ms'] for f in a);total=sum(times);fps=len(a)*1000/total;p95=times[math.ceil(len(times)*.95)-1]
 assert abs(fps-d['averageFPS'])<1e-6 and abs(p95-d['p95ms'])<1e-6
 row={'file':p.name,'fps':fps,'p95':p95,'p99':times[math.ceil(len(times)*.99)-1],'maxMs':max(times),'slow33':sum(t>33.333 for t in times),'slow100':sum(t>100 for t in times),'samples':len(a),'seconds':total/1000,'calls':max(f['calls']for f in a),'triangles':max(f['triangles']for f in a),'readyMs':d['navigationToFirstFrameMs'],'encodedBytes':sum(r['encodedBytes']for r in d['resources']),'transferBytes':sum(r['transferBytes']for r in d['resources']),'viewport':d['viewport'],'renderBuffer':d['renderBuffer'],'quality':d['quality'],'pathRange':[min(f['t']for f in a),max(f['t']for f in a)],'errors':d['errors']}
 (baseline if 'before-shadow-cache' in p.name else final).append(row)
summary={'device':'Apple M5 MacBook Air, 10-core GPU, 24GB, macOS 27.0.1','browser':'Codex IAB Chromium 155','renderBuffer':[1440,900],'final':final,'baseline':baseline,'photorealAcceptance':'PENDING USER'}
(T/'performance-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
lines=['# Phase 01 · 性能与加载实测','','真实设备 / 方法 / 限制见 [测试协议](05_Test_Protocol.md)。所有数据来自生产构建的原始 JSON；没有删除慢帧。固定实际缓冲 1440×900、渲染 DPR 1。这里是本轮可用 M5 的测量，不能当作最低硬件或公网 SLA。','','## 最终构建','','| 测试 / 原始文件 | 帧数 / 秒 | 平均 FPS | p95 / p99 ms | 最慢 ms | >33.3 / >100 ms | 最大 Draw Calls | 最大三角面（全部通道） |','|---|---:|---:|---:|---:|---:|---:|---:|']
for r in final:lines.append(f"| [{r['file']}](tests/{r['file']}) | {r['samples']} / {r['seconds']:.2f} | {r['fps']:.2f} | {r['p95']:.2f} / {r['p99']:.2f} | {r['maxMs']:.2f} | {r['slow33']} / {r['slow100']} | {r['calls']} | {r['triangles']:,} |")
lines+=['','每次预热 10 秒后采样约 60 秒。静态 A / B 中水和草仍开启轻微动态。运动样本的 path t 范围见 summary。Draw Calls / 三角面计入主画面与实时镜像，阴影缓存初始化在预热期间完成；这些值不是只取主通道。高质量 B 未达到平均 50–60 FPS 目标。18.76M 的多通道三角面总量和过大的传输体积仍是明显欠账，不能因为部分镜头锁 60 FPS 就标记完整性能验收通过。','','## 保留画质的优化对照','','| 优化前基线 | 平均 FPS | p95 ms | 最大 Draw Calls | 最大三角面 |','|---|---:|---:|---:|---:|']
for r in baseline:lines.append(f"| [{r['file']}](tests/{r['file']}) | {r['fps']:.2f} | {r['p95']:.2f} | {r['calls']} | {r['triangles']:,} |")
lines+=['','唯一影响此组对照的渲染修改为静态太阳阴影缓存。A / B 优化前后实际 PNG 逐像素相同，见 `tests/shadow-cache-pixel-comparison.json`。复用固定阴影后，稳态 Draw Calls 从 88 降至 71。A 高档从约 45.5 提升到 60；B 的提升较小，不能将 A 的结论推广给 B。','','## 资源与加载','','| 最终样本 | 导航到首帧 ms | Resource Timing encoded MB | transfer MB（含估算响应头） | 缓存 / 解释 |','|---|---:|---:|---:|---|']
for r in final:lines.append(f"| {r['file']} | {r['readyMs']:.2f} | {r['encodedBytes']/1e6:.2f} | {r['transferBytes']/1e6:.2f} | 实际缓存状态以原始逐资源记录为准；localhost 无网络限速 |")
manifest=json.loads((ROOT/'public/assets/manifest.json').read_text());sizes={x['file']:x['bytes']for x in manifest['files']};common=sum(v for k,v in sizes.items()if not k.startswith('alps-background'))
lines += ['',f"最终运行资产目录合计 {sum(sizes.values()):,} 字节（{sum(sizes.values())/1e6:.2f} MB），包含两档互斥背景。每次实际选择的资产原始体积约为标准 {(common+sizes['alps-background.hdr'])/1e6:.2f} MB、高档 {(common+sizes['alps-background-4k.hdr'])/1e6:.2f} MB，不含 HTML / JS / CSS。HTTP 压缩后的 encodedBytes 是另一口径，不能与磁盘文件体积混用。MB 使用 1,000,000 字节。",'', '首次访问新生产端口的基线：标准导航到首帧约 1348.9ms，transfer约31.24MB；高档约1795.6ms，transfer约47.17MB。之后 warm reload 的 304 / 缓存体现在逐资源 timing 中。HTML 导航本身不在 resource 条目合计内。上述加载来自本机 SSD 与 loopback，不能据此推断 4G / CDN 加载速度。','','| 运行模型 | 压缩前字节 | 最终字节 |','|---|---:|---:|']
for r in json.loads((D/'compression.json').read_text())['files']:lines.append(f"| {r['file']} | {r['beforeBytes']:,} | {r['afterBytes']:,} |")
lines+=['','4K HDR 单文件 26.52MB、树文件约11.24MB，是主要传输负担。Meshopt 和 WebP 已实施；WebP 不等于 GPU 纹理压缩，KTX2 尚未完成。`renderer.info.memory` 的 30 张纹理 / 36 个几何仅是对象计数，未测得真实 GPU 字节，不宣称显存预算通过。','','## 判定','','- 原始帧时间和技术检查：数据有效，浏览器无已捕获的 WebGL / JS 错误。','- 平均 FPS：标准静态 A / B 与高档 A 的本机表现可用；标准运动约 48.8 FPS、高档 B 约 46.9 FPS，仍低于 50 FPS 下限。','- p95：本机采样见表；没有推广到未测试设备。','- 体积、GPU 存储与多设备覆盖：未达到完整验收目标。','- 照片级视觉：独立待用户验收，当前问题清单明确指出未达门槛；不建议进入 Phase 02。','']
(D/'06_Performance_And_Loading.md').write_text('\n'.join(lines))
print('Wrote performance report:',len(final),'final runs,',len(baseline),'baseline runs')
