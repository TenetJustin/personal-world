import type { Entry } from "./model.ts";
export type ProfileLink = { id: string; label: string; url: string };
export type AboutProfile = {
  displayName: string;
  displayNameEN: string;
  headline: string;
  introZH: string;
  introEN: string;
  focus: string;
  city: string;
  avatarId: string;
  githubURL: string;
  publicEmail: string;
  socialLinks: ProfileLink[];
  otherLinks: ProfileLink[];
};
export type EducationRow = {
  id: string;
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate: string;
  research: string;
  courses: string;
  honors: string;
};
export type ExperienceRow = {
  id: string;
  organization: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
  responsibilities: string;
  contributions: string;
  outcomes: string;
  tools: string;
};
export type SkillRow = {
  id: string;
  category: string;
  name: string;
  context: string;
  relatedProjects: string;
  sortOrder: number;
};
export type AwardRow = {
  id: string;
  name: string;
  organization: string;
  date: string;
  contribution: string;
  proofURL: string;
  imageIds: string[];
};
export type StructuredProfile = {
  version: 1;
  about: AboutProfile;
  education: EducationRow[];
  experience: ExperienceRow[];
  skills: SkillRow[];
  awards: AwardRow[];
};
export type ProjectDetails = {
  summaryZH: string;
  summaryEN: string;
  problem: string;
  contribution: string;
  features: string;
  results: string;
  awards: string;
  time: string;
  status: string;
};
export const PROJECT_FIELDS: Record<keyof ProjectDetails, string> = {
  summaryZH: "中文简介",
  summaryEN: "English summary",
  problem: "解决的问题",
  contribution: "我的个人贡献",
  features: "关键功能",
  results: "项目结果",
  awards: "获奖情况（选填）",
  time: "项目时间",
  status: "项目进展（例如：进行中、已完成）",
};
export const emptyProjectDetails = (): ProjectDetails =>
  Object.fromEntries(
    Object.keys(PROJECT_FIELDS).map((k) => [k, ""]),
  ) as ProjectDetails;
export function emptyProfile(): StructuredProfile {
  return {
    version: 1,
    about: {
      displayName: "",
      displayNameEN: "",
      headline: "",
      introZH: "",
      introEN: "",
      focus: "",
      city: "",
      avatarId: "",
      githubURL: "",
      publicEmail: "",
      socialLinks: [],
      otherLinks: [],
    },
    education: [],
    experience: [],
    skills: [],
    awards: [],
  };
}
export type ProfileSection =
  | "about"
  | "education"
  | "experience"
  | "skills"
  | "awards";
export const PROFILE_SECTIONS: Record<ProfileSection, string> = {
  about: "个人介绍",
  education: "教育背景",
  experience: "实习与经历",
  skills: "技能与工具",
  awards: "荣誉与证明",
};
const safe = (v: unknown, max = 100_000) => {
  if (typeof v !== "string" || v.length > max)
    throw new Error("结构化资料文本无效或过长");
  return v;
};
const url = (v: unknown) => {
  const t = safe(v ?? "", 2048);
  if (t) {
    try {
      const u = new URL(t);
      if (!["https:", "http:"].includes(u.protocol)) throw new Error();
    } catch {
      throw new Error("资料链接必须使用 http:// 或 https://");
    }
  }
  return t;
};
const id = (v: unknown) => {
  const s = safe(v, 80);
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(s)) throw new Error("资料行 ID 无效");
  return s;
};
function array(value: unknown, max = 100): Record<string, unknown>[] {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((x) => !x || typeof x !== "object")
  )
    throw new Error("结构化资料列表无效或过长");
  return value;
}
function row(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries([
    ["id", id(value.id)],
    ...keys.map((k) => [k, safe(value[k] ?? "")]),
  ]);
}
export function validateProfile(value: unknown): StructuredProfile {
  if (!value || typeof value !== "object") throw new Error("个人资料结构无效");
  const p = value as Record<string, unknown>;
  if (p.version !== 1 || !p.about || typeof p.about !== "object")
    throw new Error("个人资料版本无效");
  const a = p.about as Record<string, unknown>;
  const about = Object.fromEntries(
    [
      "displayName",
      "displayNameEN",
      "headline",
      "introZH",
      "introEN",
      "focus",
      "city",
      "avatarId",
      "publicEmail",
    ].map((k) => [
      k,
      safe(a[k] ?? "", k === "introZH" || k === "introEN" ? 100_000 : 1000),
    ]),
  ) as unknown as AboutProfile;
  about.githubURL = url(a.githubURL);
  if (about.avatarId) id(about.avatarId);
  if (
    about.publicEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(about.publicEmail)
  )
    throw new Error("公开联系邮箱格式无效");
  for (const key of ["socialLinks", "otherLinks"] as const)
    about[key] = array(a[key] ?? [], 30).map((x) => ({
      id: id(x.id),
      label: safe(x.label ?? "", 240),
      url: url(x.url),
    }));
  const education = array(p.education ?? []).map((x) =>
    row(x, [
      "school",
      "degree",
      "major",
      "startDate",
      "endDate",
      "research",
      "courses",
      "honors",
    ]),
  ) as EducationRow[];
  const experience = array(p.experience ?? []).map((x) =>
    row(x, [
      "organization",
      "role",
      "startDate",
      "endDate",
      "location",
      "responsibilities",
      "contributions",
      "outcomes",
      "tools",
    ]),
  ) as ExperienceRow[];
  const skills = array(p.skills ?? []).map((x) => {
    const v = row(x, ["category", "name", "context", "relatedProjects"]);
    const order = x.sortOrder ?? 0;
    if (typeof order !== "number" || !Number.isFinite(order))
      throw new Error("技能排序无效");
    return { ...v, sortOrder: order };
  }) as SkillRow[];
  const awards = array(p.awards ?? []).map((x) => {
    if (
      !Array.isArray(x.imageIds ?? []) ||
      ((x.imageIds as unknown[]) ?? []).length > 12
    )
      throw new Error("荣誉图片引用无效");
    return {
      ...row(x, ["name", "organization", "date", "contribution"]),
      proofURL: url(x.proofURL),
      imageIds: ((x.imageIds ?? []) as unknown[]).map(id),
    };
  }) as AwardRow[];
  for (const rows of [
    education,
    experience,
    skills,
    awards,
    about.socialLinks,
    about.otherLinks,
  ])
    if (new Set(rows.map((x) => x.id)).size !== rows.length)
      throw new Error("资料列表包含重复 ID");
  return { version: 1, about, education, experience, skills, awards };
}
export function profileProgress(p: StructuredProfile) {
  return {
    about: {
      done: [p.about.displayName, p.about.headline, p.about.introZH].filter(
        (x) => x.trim(),
      ).length,
      total: 3,
      missing: [
        !p.about.displayName.trim() ? "展示名称" : "",
        !p.about.headline.trim() ? "一句话身份介绍" : "",
        !p.about.introZH.trim() ? "中文个人介绍" : "",
      ].filter(Boolean),
    },
    education: {
      done: p.education.filter((x) => x.school && x.degree && x.major).length,
      total: Math.max(1, p.education.length),
      missing: p.education.length
        ? p.education.flatMap((r, i) =>
            [
              !r.school ? `教育 ${i + 1}：学校` : "",
              !r.degree ? `教育 ${i + 1}：学位` : "",
              !r.major ? `教育 ${i + 1}：专业` : "",
            ].filter(Boolean),
          )
        : ["尚未添加教育背景（可稍后填写）"],
    },
    experience: {
      done: p.experience.filter(
        (x) => x.organization && x.role && x.contributions,
      ).length,
      total: Math.max(1, p.experience.length),
      missing: p.experience.length
        ? p.experience.flatMap((r, i) =>
            [
              !r.organization ? `经历 ${i + 1}：组织或公司` : "",
              !r.role ? `经历 ${i + 1}：岗位` : "",
              !r.contributions ? `经历 ${i + 1}：核心贡献` : "",
            ].filter(Boolean),
          )
        : ["尚未添加经历（可稍后填写）"],
    },
    skills: {
      done: p.skills.filter((x) => x.category && x.name && x.context).length,
      total: Math.max(1, p.skills.length),
      missing: p.skills.length
        ? p.skills.flatMap((r, i) =>
            [
              !r.category ? `技能 ${i + 1}：类别` : "",
              !r.name ? `技能 ${i + 1}：名称` : "",
              !r.context ? `技能 ${i + 1}：实际场景` : "",
            ].filter(Boolean),
          )
        : ["尚未添加技能（可稍后填写）"],
    },
    awards: {
      done: p.awards.filter((x) => x.name && x.organization).length,
      total: Math.max(1, p.awards.length),
      missing: p.awards.length
        ? p.awards.flatMap((r, i) =>
            [
              !r.name ? `荣誉 ${i + 1}：名称` : "",
              !r.organization ? `荣誉 ${i + 1}：颁发方` : "",
            ].filter(Boolean),
          )
        : ["荣誉为选填，可留空"],
    },
  };
}
export function publicationState(entry: Entry, published: Entry[]) {
  const prior = published.find((e) => e.id === entry.id);
  return prior
    ? prior.updatedAt === entry.updatedAt
      ? "已发布版本"
      : "已发布 · 本地有更新"
    : entry.publicationStatus === "ready"
      ? "待审核公开"
      : "本地草稿";
}
export function entryMarkdown(entry: Entry) {
  const out = [`# ${entry.title}`, entry.body];
  if (entry.structuredProfile) {
    const p = entry.structuredProfile,
      a = p.about;
    out.push(
      `## About\n\n${a.displayName}\n\n${a.displayNameEN}\n\n${a.headline}\n\n${a.introZH}\n\n${a.introEN}\n\n关注：${a.focus}\n\n城市：${a.city}`,
    );
    for (const link of [...a.socialLinks, ...a.otherLinks])
      out.push(`[${link.label || link.url}](${link.url})`);
    if (a.githubURL) out.push(`GitHub: ${a.githubURL}`);
    if (a.publicEmail) out.push(`公开联系邮箱：${a.publicEmail}`);
    for (const key of [
      "education",
      "experience",
      "skills",
      "awards",
    ] as const) {
      out.push(`## ${PROFILE_SECTIONS[key]}`);
      for (const row of p[key])
        out.push(
          Object.entries(row)
            .filter(([k, v]) => k !== "id" && k !== "imageIds" && v !== "")
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n\n"),
        );
    }
  }
  if (entry.projectDetails)
    for (const [key, label] of Object.entries(PROJECT_FIELDS))
      if (entry.projectDetails[key as keyof ProjectDetails])
        out.push(
          `## ${label}\n\n${entry.projectDetails[key as keyof ProjectDetails]}`,
        );
  if (entry.resume)
    for (const [key, value] of Object.entries(entry.resume))
      if (value) out.push(`## ${key}\n\n${value}`);
  if (entry.technology) out.push(`技术栈：${entry.technology}`);
  if (entry.githubURL) out.push(`GitHub: ${entry.githubURL}`);
  if (entry.demoURL) out.push(`Demo: ${entry.demoURL}`);
  if (entry.url) out.push(entry.url);
  if (entry.photoTakenAt) out.push(`图片时间：${entry.photoTakenAt}`);
  return out.filter(Boolean).join("\n\n");
}
