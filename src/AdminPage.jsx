import { useEffect, useRef, useState } from "react";
import { apiFetch, clearToken, getToken, setToken, useWorks } from "./api";

const emptyDraft = {
  title: "",
  category: "未分类",
  mediaType: "image",
  fileUrl: "",
  coverUrl: "",
  projectTime: "",
  background: "",
  tools: "",
  tags: [],
  isFeatured: true,
};

function Login({ onDone }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      const { token } = await apiFetch("/api/login", { method: "POST", body: JSON.stringify({ password }) });
      setToken(token);
      onDone();
    } catch {
      setError("密码不正确");
    }
  };
  return <main className="admin-page admin-login"><form className="admin-card" onSubmit={submit}><p className="section-number">ADMIN / LOGIN</p><h1>作品后台</h1><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="管理员密码" autoFocus /><button>进入后台</button>{error && <p className="admin-error">{error}</p>}<small>默认密码可在 .env 的 ADMIN_PASSWORD 中修改。</small></form></main>;
}

function UploadPanel({ onCreated }) {
  const [files, setFiles] = useState([]);
  const [meta, setMeta] = useState({ category: "未分类", projectTime: "", background: "", tools: "", isFeatured: true });
  const [busy, setBusy] = useState(false);
  const upload = async () => {
    if (!files.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      files.forEach((file) => form.append("files", file));
      const uploaded = await apiFetch("/api/upload", { method: "POST", body: form });
      for (const item of uploaded) {
        await apiFetch("/api/works", {
          method: "POST",
          body: JSON.stringify({ ...emptyDraft, ...meta, ...item, title: item.title, isFeatured: meta.isFeatured }),
        });
      }
      setFiles([]);
      onCreated();
    } finally {
      setBusy(false);
    }
  };
  return <section className="admin-card admin-upload"><div><p className="section-number">UPLOAD</p><h2>上传作品</h2></div><div className="admin-grid two"><label>分类<input value={meta.category} onChange={(event) => setMeta({ ...meta, category: event.target.value })} /></label><label>项目时间<input value={meta.projectTime} onChange={(event) => setMeta({ ...meta, projectTime: event.target.value })} placeholder="2023 — 2026" /></label><label>使用工具<input value={meta.tools} onChange={(event) => setMeta({ ...meta, tools: event.target.value })} placeholder="C4D / Octane / Photoshop" /></label><label className="admin-check"><input type="checkbox" checked={meta.isFeatured} onChange={(event) => setMeta({ ...meta, isFeatured: event.target.checked })} /> 首页精选</label></div><label>项目说明<textarea value={meta.background} onChange={(event) => setMeta({ ...meta, background: event.target.value })} placeholder="这组作品的背景、目标或视觉说明" /></label><input type="file" multiple accept="image/*,video/*" onChange={(event) => setFiles([...event.target.files])} /><div className="admin-actions"><button onClick={upload} disabled={busy || !files.length}>{busy ? "上传中..." : `上传并创建 ${files.length || ""} 个作品`}</button></div></section>;
}

function WorkEditor({ selected, onSaved }) {
  const [draft, setDraft] = useState(emptyDraft);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [coverBusy, setCoverBusy] = useState(false);

  useEffect(() => {
    setDraft(selected || emptyDraft);
    setDuration(0);
  }, [selected]);

  if (!selected) return <section className="admin-card admin-empty"><p className="section-number">EDITOR</p><h2>选择一个作品进行编辑</h2><p>左侧点击作品后，可以修改标题、分类、时间、工具、说明和封面。</p></section>;

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => {
    const saved = await apiFetch(`/api/works/${selected.id}`, { method: "PATCH", body: JSON.stringify(draft) });
    onSaved(saved);
  };
  const captureCover = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCoverBusy(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.9);
    const saved = await apiFetch(`/api/works/${selected.id}/cover`, { method: "POST", body: JSON.stringify({ image }) });
    setCoverBusy(false);
    onSaved(saved);
  };

  return <section className="admin-card admin-editor"><p className="section-number">EDITOR</p><div className="admin-preview">{draft.mediaType === "video" ? <video ref={videoRef} src={draft.fileUrl} poster={draft.coverUrl} controls onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)} /> : <img src={draft.coverUrl || draft.fileUrl} alt={draft.title} />}</div>{draft.mediaType === "video" && <div className="cover-tools"><label>拖动选择视频封面<input type="range" min="0" max={duration || 0} step="0.1" onChange={(event) => { if (videoRef.current) videoRef.current.currentTime = Number(event.target.value); }} /></label><button onClick={captureCover} disabled={coverBusy}>{coverBusy ? "保存中..." : "保存当前帧为封面"}</button><canvas ref={canvasRef} hidden /></div>}<div className="admin-grid two"><label>标题<input value={draft.title || ""} onChange={(event) => update("title", event.target.value)} /></label><label>分类<input value={draft.category || ""} onChange={(event) => update("category", event.target.value)} /></label><label>项目时间<input value={draft.projectTime || ""} onChange={(event) => update("projectTime", event.target.value)} /></label><label>使用工具<input value={draft.tools || ""} onChange={(event) => update("tools", event.target.value)} /></label><label>封面 URL<input value={draft.coverUrl || ""} onChange={(event) => update("coverUrl", event.target.value)} /></label><label className="admin-check"><input type="checkbox" checked={Boolean(draft.isFeatured)} onChange={(event) => update("isFeatured", event.target.checked)} /> 首页精选</label></div><label>项目说明<textarea value={draft.background || ""} onChange={(event) => update("background", event.target.value)} /></label><label>标签<input value={(draft.tags || []).join(", ")} onChange={(event) => update("tags", event.target.value.split(/[,\n，]/).map((tag) => tag.trim()).filter(Boolean))} /></label><div className="admin-actions"><button onClick={save}>保存修改</button></div></section>;
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const { works, loading, reload, setWorks } = useWorks();
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");
  const selected = works.find((work) => work.id === selectedId);
  const visible = works.filter((work) => `${work.title} ${work.category}`.toLowerCase().includes(query.toLowerCase()));

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const saveLocal = (work) => {
    setWorks((current) => current.map((item) => item.id === work.id ? work : item));
    setSelectedId(work.id);
  };
  const remove = async (work) => {
    if (!confirm(`删除作品「${work.title}」？`)) return;
    await apiFetch(`/api/works/${work.id}`, { method: "DELETE" });
    await reload();
    setSelectedId(null);
  };
  const reorder = async (work, direction) => {
    const ids = works.map((item) => item.id);
    const index = ids.indexOf(work.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    const next = await apiFetch("/api/works/reorder", { method: "PATCH", body: JSON.stringify({ ids }) });
    setWorks(next);
  };
  const logout = () => { clearToken(); setAuthed(false); };

  return <main className="admin-page"><header className="admin-top"><a className="brand" href="/"><span className="brand-mark">CW</span><span>返回网站</span></a><nav><a href="/work">作品页</a><button onClick={logout}>退出登录</button></nav></header><section className="admin-hero"><p className="section-number">PORTFOLIO CMS</p><h1>作品管理系统</h1><p>{loading ? "正在读取作品库..." : `共 ${works.length} 个作品`}</p></section><UploadPanel onCreated={reload} /><section className="admin-layout"><div className="admin-card admin-list"><div className="admin-list-head"><h2>作品列表</h2><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题 / 分类" /></div><div className="admin-items">{visible.map((work) => <article className={selectedId === work.id ? "active" : ""} key={work.id} onClick={() => setSelectedId(work.id)}>{work.coverUrl || work.mediaType === "image" ? <img src={work.coverUrl || work.fileUrl} alt="" /> : <video src={work.fileUrl} muted playsInline preload="metadata" />}<div><strong>{work.title}</strong><small>{work.category} · {work.mediaType}</small></div><div className="row-actions"><button onClick={(event) => { event.stopPropagation(); reorder(work, -1); }}>↑</button><button onClick={(event) => { event.stopPropagation(); reorder(work, 1); }}>↓</button><button onClick={(event) => { event.stopPropagation(); remove(work); }}>删</button></div></article>)}</div></div><WorkEditor selected={selected} onSaved={saveLocal} /></section></main>;
}
