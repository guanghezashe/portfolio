import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, "..");
export const dataDir = path.join(rootDir, "data");
export const uploadsDir = path.join(rootDir, "uploads");
export const legacyGalleryDir = path.join(rootDir, "src", "assets", "gallery");

fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(path.join(uploadsDir, "media"), { recursive: true });
fs.mkdirSync(path.join(uploadsDir, "covers"), { recursive: true });

export const db = new DatabaseSync(path.join(dataDir, "portfolio.sqlite"));

db.exec(`
  CREATE TABLE IF NOT EXISTS works (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    mediaType TEXT NOT NULL CHECK(mediaType IN ('image', 'video')),
    fileUrl TEXT NOT NULL,
    coverUrl TEXT,
    projectTime TEXT,
    background TEXT,
    tools TEXT,
    tags TEXT DEFAULT '[]',
    isFeatured INTEGER DEFAULT 1,
    sortOrder INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`);

const categoryMeta = {
  AIGC: { projectTime: "2025 — 2026", background: "以产品为基础进行 AI 场景与氛围探索，服务概念验证和视觉方向延展。", tools: "ComfyUI / Midjourney / Photoshop" },
  产品视频: { projectTime: "2023 — 2026", background: "围绕运动服饰产品完成上市传播与内容发布的动态视觉制作。", tools: "C4D / Octane / After Effects" },
  卖点动态: { projectTime: "2023 — 2026", background: "将面料与功能卖点转译为易理解的动态视觉语言。", tools: "C4D / Octane / After Effects" },
  场景渲染: { projectTime: "2022 — 2026", background: "以真实空间、材质与光线建立产品的使用情境和质感表达。", tools: "C4D / Octane / Photoshop" },
  活动KV: { projectTime: "2021 — 2022", background: "面向品牌大促与节点营销，建立高识别度的活动主视觉。", tools: "Photoshop / Illustrator / After Effects" },
  电商详情: { projectTime: "2019 — 2022", background: "围绕产品信息层级与功能卖点，组织电商详情页的视觉表达。", tools: "Photoshop / C4D / Octane" },
};

const mediaExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".mov", ".webm"]);
const isVideo = (extension) => [".mp4", ".mov", ".webm"].includes(extension.toLowerCase());
const toUrlPath = (filePath) => filePath.split(path.sep).map(encodeURIComponent).join("/");

export const normalizeWork = (work) => ({
  ...work,
  media: work.mediaType,
  src: work.fileUrl,
  previewSrc: work.coverUrl || work.fileUrl,
  poster: work.coverUrl || undefined,
  tags: typeof work.tags === "string" ? JSON.parse(work.tags || "[]") : (work.tags || []),
  time: work.projectTime,
  description: work.background,
});

export function seedLegacyWorks() {
  const count = db.prepare("SELECT COUNT(*) AS count FROM works").get().count;
  if (count > 0 || !fs.existsSync(legacyGalleryDir)) return;

  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO works (title, category, mediaType, fileUrl, coverUrl, projectTime, background, tools, tags, isFeatured, sortOrder, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let order = 1;
  const categories = fs.readdirSync(legacyGalleryDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const categoryEntry of categories) {
    const category = categoryEntry.name;
    const categoryPath = path.join(legacyGalleryDir, category);
    const files = fs.readdirSync(categoryPath, { withFileTypes: true }).filter((entry) => entry.isFile());
    for (const file of files) {
      const extension = path.extname(file.name).toLowerCase();
      if (!mediaExtensions.has(extension)) continue;
      const title = path.basename(file.name, extension);
      const mediaType = isVideo(extension) ? "video" : "image";
      const fileUrl = `/legacy-gallery/${encodeURIComponent(category)}/${toUrlPath(file.name)}`;
      const meta = categoryMeta[category] || {};
      insert.run(title, category, mediaType, fileUrl, mediaType === "image" ? fileUrl : "", meta.projectTime || "", meta.background || "", meta.tools || "", JSON.stringify([]), order <= 36 ? 1 : 0, order, now, now);
      order += 1;
    }
  }
}
