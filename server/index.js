import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import multer from "multer";
import { db, legacyGalleryDir, normalizeWork, rootDir, seedLegacyWorks, uploadsDir } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 4174);
const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
const tokens = new Set();

seedLegacyWorks();

app.use(express.json({ limit: "30mb" }));
const staticAssetOptions = { maxAge: "30d", immutable: true };
app.use("/uploads", express.static(uploadsDir, staticAssetOptions));
app.use("/legacy-gallery", express.static(legacyGalleryDir, staticAssetOptions));

const safeName = (name) => name.replace(/[^\p{L}\p{N}._-]+/gu, "-").replace(/-+/g, "-");
const now = () => new Date().toISOString();
const parseTags = (tags) => Array.isArray(tags) ? tags : String(tags || "").split(/[,\n，]/).map((tag) => tag.trim()).filter(Boolean);
const mediaTypeFromMime = (mime) => mime.startsWith("video/") ? "video" : "image";
const removeUploadedFile = (url = "") => {
  if (!url.startsWith("/uploads/")) return;
  const relative = decodeURIComponent(url.replace(/^\/uploads\//, ""));
  const absolute = path.resolve(uploadsDir, relative);
  if (!absolute.startsWith(uploadsDir)) return;
  fs.rmSync(absolute, { force: true });
};
const requireAuth = (request, response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token || !tokens.has(token)) return response.status(401).json({ error: "UNAUTHORIZED" });
  next();
};

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => callback(null, path.join(uploadsDir, "media")),
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname);
    const base = safeName(path.basename(file.originalname, extension)) || "work";
    callback(null, `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}${extension}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 800 },
  fileFilter: (_request, file, callback) => {
    if (/^(image|video)\//.test(file.mimetype)) callback(null, true);
    else callback(new Error("Only image and video files are allowed"));
  },
});

const workSelect = "SELECT * FROM works";
const allWorks = () => db.prepare(`${workSelect} ORDER BY sortOrder ASC, createdAt DESC`).all().map(normalizeWork);
const oneWork = (id) => {
  const work = db.prepare(`${workSelect} WHERE id = ?`).get(id);
  return work ? normalizeWork(work) : null;
};

app.post("/api/login", (request, response) => {
  if (request.body?.password !== adminPassword) return response.status(401).json({ error: "INVALID_PASSWORD" });
  const token = crypto.randomBytes(24).toString("hex");
  tokens.add(token);
  response.json({ token });
});

app.get("/api/works", (_request, response) => {
  response.json(allWorks());
});

app.get("/api/works/:id", (request, response) => {
  const work = oneWork(request.params.id);
  if (!work) return response.status(404).json({ error: "NOT_FOUND" });
  response.json(work);
});

app.get("/api/categories", (_request, response) => {
  const rows = db.prepare("SELECT DISTINCT category FROM works ORDER BY category COLLATE NOCASE").all();
  response.json(rows.map((row) => row.category));
});

app.post("/api/upload", requireAuth, upload.array("files", 20), (request, response) => {
  const uploaded = request.files.map((file) => ({
    title: path.basename(file.originalname, path.extname(file.originalname)),
    mediaType: mediaTypeFromMime(file.mimetype),
    fileUrl: `/uploads/media/${encodeURIComponent(file.filename)}`,
    coverUrl: mediaTypeFromMime(file.mimetype) === "image" ? `/uploads/media/${encodeURIComponent(file.filename)}` : "",
    originalName: file.originalname,
  }));
  response.json(uploaded);
});

app.post("/api/works", requireAuth, (request, response) => {
  const payload = request.body || {};
  if (!payload.title || !payload.category || !payload.fileUrl || !payload.mediaType) return response.status(400).json({ error: "MISSING_REQUIRED_FIELDS" });
  const createdAt = now();
  const sortOrder = Number(payload.sortOrder || db.prepare("SELECT COALESCE(MAX(sortOrder), 0) + 1 AS next FROM works").get().next);
  const result = db.prepare(`
    INSERT INTO works (title, category, mediaType, fileUrl, coverUrl, projectTime, background, tools, tags, isFeatured, sortOrder, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(payload.title, payload.category, payload.mediaType, payload.fileUrl, payload.coverUrl || "", payload.projectTime || "", payload.background || "", payload.tools || "", JSON.stringify(parseTags(payload.tags)), payload.isFeatured ? 1 : 0, sortOrder, createdAt, createdAt);
  response.status(201).json(oneWork(result.lastInsertRowid));
});

app.patch("/api/works/reorder", requireAuth, (request, response) => {
  const ids = Array.isArray(request.body?.ids) ? request.body.ids : [];
  const update = db.prepare("UPDATE works SET sortOrder = ?, updatedAt = ? WHERE id = ?");
  const stamp = now();
  ids.forEach((id, index) => update.run(index + 1, stamp, id));
  response.json(allWorks());
});

app.patch("/api/works/:id", requireAuth, (request, response) => {
  const current = oneWork(request.params.id);
  if (!current) return response.status(404).json({ error: "NOT_FOUND" });
  const payload = { ...current, ...request.body };
  db.prepare(`
    UPDATE works SET title = ?, category = ?, mediaType = ?, fileUrl = ?, coverUrl = ?, projectTime = ?, background = ?, tools = ?, tags = ?, isFeatured = ?, sortOrder = ?, updatedAt = ?
    WHERE id = ?
  `).run(payload.title, payload.category, payload.mediaType, payload.fileUrl, payload.coverUrl || "", payload.projectTime || "", payload.background || "", payload.tools || "", JSON.stringify(parseTags(payload.tags)), payload.isFeatured ? 1 : 0, Number(payload.sortOrder || current.sortOrder), now(), request.params.id);
  response.json(oneWork(request.params.id));
});

app.post("/api/works/:id/cover", requireAuth, (request, response) => {
  const work = oneWork(request.params.id);
  if (!work) return response.status(404).json({ error: "NOT_FOUND" });
  const match = String(request.body?.image || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) return response.status(400).json({ error: "INVALID_IMAGE_DATA" });
  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-cover.${extension}`;
  const absolute = path.join(uploadsDir, "covers", filename);
  fs.writeFileSync(absolute, Buffer.from(match[2], "base64"));
  const coverUrl = `/uploads/covers/${filename}`;
  db.prepare("UPDATE works SET coverUrl = ?, updatedAt = ? WHERE id = ?").run(coverUrl, now(), request.params.id);
  response.json(oneWork(request.params.id));
});

app.delete("/api/works/:id", requireAuth, (request, response) => {
  const work = oneWork(request.params.id);
  if (!work) return response.status(404).json({ error: "NOT_FOUND" });
  db.prepare("DELETE FROM works WHERE id = ?").run(request.params.id);
  removeUploadedFile(work.fileUrl);
  removeUploadedFile(work.coverUrl);
  response.json({ ok: true });
});

app.use(express.static(path.join(rootDir, "dist")));
app.get(["/", "/work", "/admin"], (_request, response) => {
  response.sendFile(path.join(rootDir, "dist", "index.html"));
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Portfolio API running at http://127.0.0.1:${port}`);
});
