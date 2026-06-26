import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectModal } from "./App";
import { useWorks } from "./api";

const formatFromDimensions = (media, width, height) => {
  const portrait = height > width;
  if (media === "video") return portrait ? "format-video-portrait" : "format-video-landscape";
  return height / width > 1.55 ? "format-image-tall" : "format-image-standard";
};

const isDetailPreview = (project) => {
  const text = `${project.category || ""} ${project.title || ""}`;
  return text.includes("详情");
};

function WorkMedia({ project, onFormat }) {
  const videoRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);
  useEffect(() => {
    if (project.media !== "video") return undefined;
    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && setShouldLoad(true), { rootMargin: "320px" });
    observer.observe(videoRef.current);
    return () => observer.disconnect();
  }, [project.media]);
  if (project.media === "video") return <video ref={videoRef} src={shouldLoad ? (project.fileUrl || project.src) : undefined} poster={project.coverUrl || project.poster} muted playsInline preload="metadata" aria-label={project.title} onLoadedMetadata={(event) => onFormat(formatFromDimensions("video", event.currentTarget.videoWidth, event.currentTarget.videoHeight))} />;
  return <img src={project.previewSrc || project.coverUrl || project.src} alt={project.title} loading="lazy" decoding="async" onLoad={(event) => onFormat(formatFromDimensions("image", event.currentTarget.naturalWidth, event.currentTarget.naturalHeight))} />;
}

function PortfolioTile({ project, onSelect }) {
  const [format, setFormat] = useState(project.media === "video" ? "format-video-landscape" : "format-image-standard");
  return <button className={`portfolio-tile ${format} ${project.media === "video" ? "is-motion" : ""} ${isDetailPreview(project) ? "is-detail-preview" : ""}`} onClick={() => onSelect(project)} aria-label={`查看作品：${project.title}`}><WorkMedia project={project} onFormat={setFormat} /><span className="portfolio-tile-info"><small>{project.category}</small><strong>{project.title}</strong></span></button>;
}

export default function WorkPage() {
  const [category, setCategory] = useState("全部");
  const [selectedProject, setSelectedProject] = useState(null);
  const { works, categories, loading } = useWorks();
  const visibleWork = useMemo(() => category === "全部" ? works : works.filter((project) => project.category === category), [category, works]);
  return <>
    <header className="site-header work-header"><a className="brand" href="/" aria-label="回到首页"><span className="brand-mark">CW</span><span>CHEN WEIGUANG</span></a><nav><a href="/">首页</a><a className="current" href="/work">作品</a><a href="/#contact">联系</a></nav><a className="header-contact" href="/#contact">CONTACT ↗</a></header>
    <main className="work-page"><section className="work-hero page-width"><p className="section-number">COMPLETE ARCHIVE / 2026</p><h1>作品档案</h1><p>{loading ? "正在读取后台作品库。" : "收录全部动画与渲染作品。悬停以查看信息 点击进入完整预览。"}</p></section><section className="work-feed-section page-width"><div className="work-category-bar" aria-label="作品分类">{categories.map((item) => <button className={category === item ? "active" : ""} onClick={() => setCategory(item)} key={item}>{item}</button>)}</div><div className="portfolio-masonry">{visibleWork.map((project) => <PortfolioTile key={project.id} project={project} onSelect={setSelectedProject} />)}</div></section></main>
    <ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
  </>;
}
