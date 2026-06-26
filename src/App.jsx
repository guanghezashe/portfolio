import { useEffect, useRef, useState } from "react";
import { capabilities, experiences, profile } from "./data";
import ExperienceList from "./ExperienceList";
import FeaturedCarousel from "./FeaturedCarousel";
import WorkPage from "./WorkPage";
import AdminPage from "./AdminPage";
import { useWorks } from "./api";
import Silk from "./Silk";

const Arrow = () => <span aria-hidden="true">↗</span>;

function useActiveSection() {
  const [activeSection, setActiveSection] = useState("top");
  useEffect(() => {
    const sections = [...document.querySelectorAll("main[id], section[id]")];
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveSection(visible.target.id);
    }, { rootMargin: "-42% 0px -48% 0px", threshold: [0.05, 0.2] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return activeSection;
}

function ZoomableImage({ src, alt }) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const clamp = (value) => Math.min(15, Math.max(1, value));
  const reset = () => { setZoom(1); setOffset({ x: 0, y: 0 }); };
  const updateZoom = (value) => setZoom(clamp(Number(value)));
  const handleWheel = (event) => {
    event.preventDefault();
    updateZoom(zoom + (event.deltaY > 0 ? -0.18 : 0.18));
  };
  const handlePointerDown = (event) => {
    if (zoom === 1) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, origin: offset };
  };
  const handlePointerMove = (event) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.origin.x + event.clientX - drag.current.x, y: drag.current.origin.y + event.clientY - drag.current.y });
  };
  const handlePointerUp = () => { drag.current = null; };
  return <div className={`zoomable-image${zoom > 1 ? " is-zoomed" : ""}`} onWheel={handleWheel} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}>
    <img src={src} alt={alt} draggable="false" onDoubleClick={() => zoom === 1 ? updateZoom(5) : reset()} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }} />
    <div className="zoom-controls" onPointerDown={(event) => event.stopPropagation()}>
      <button type="button" onClick={() => updateZoom(zoom - 0.5)} aria-label="缩小">−</button>
      <input type="range" min="1" max="15" step="0.1" value={zoom} onChange={(event) => updateZoom(event.target.value)} aria-label="缩放图片" />
      <button type="button" onClick={() => updateZoom(zoom + 0.5)} aria-label="放大">+</button>
      <button type="button" className="zoom-reset" onClick={reset}>适配</button>
    </div>
    <p className="zoom-hint">双击放大 · 滚轮缩放 · 拖动查看</p>
  </div>;
}

export function ProjectModal({ project, onClose }) {
  useEffect(() => {
    if (!project) return undefined;
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    document.body.classList.add("modal-open");
    return () => { window.removeEventListener("keydown", closeOnEscape); document.body.classList.remove("modal-open"); };
  }, [project, onClose]);
  if (!project) return null;
  return <div className="modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <button className="modal-close" onClick={onClose} aria-label="关闭作品预览">×</button>
    <article className="modal-panel" role="dialog" aria-modal="true" aria-label={project.title}>
      <div className="modal-media">{project.media === "video" ? <video src={project.src} poster={project.poster} controls autoPlay playsInline /> : <ZoomableImage src={project.src} alt={project.title} />}</div>
      <div className="modal-copy"><p className="label">{project.category}</p><h2>{project.title}</h2><div className="modal-background"><small>项目说明</small><p>{project.background || project.description || "以产品视觉为核心的商业创作实践。"}</p></div><div className="project-facts"><div><small>项目时间</small><strong>{project.time || "作品归档"}</strong></div><div><small>使用工具</small><strong>{project.tools || project.tags?.join(" / ") || "C4D / Octane / Photoshop"}</strong></div></div></div>
    </article>
  </div>;
}

export default function App() {
  const [selectedProject, setSelectedProject] = useState(null);
  const activeSection = useActiveSection();
  const { works } = useWorks();
  const featuredWorks = works.filter((work) => work.isFeatured !== false && work.isFeatured !== 0).slice(0, 60);
  if (window.location.pathname === "/admin") return <AdminPage />;
  if (window.location.pathname === "/work") return <WorkPage />;
  return <>
    <header className="site-header"><a className="brand" href="/" aria-label="回到首页"><span className="brand-mark">CW</span><span>CHEN WEIGUANG</span></a><nav><a className={activeSection === "about" ? "current" : ""} href="#about">关于</a><a href="/work">作品</a><a className={activeSection === "experience" ? "current" : ""} href="#experience">经历</a></nav><a className="header-contact" href="#contact">CONTACT <Arrow /></a></header>
    <main className="home-page" id="top">
      <section className="hero" aria-labelledby="hero-title"><Silk className="hero-silk" speed={5} scale={1} color="#7B7481" noiseIntensity={1.5} rotation={0} /><div className="hero-overlay" /><div className="hero-content page-width"><p className="eyebrow">3D ANIMATOR / DIRECTOR / VISUAL & AI DESIGNER</p><div className="hero-title-wrap"><h1 id="hero-title">陈伟光</h1><p>WEIGUANG<br />CHEN</p></div><div className="hero-bottom"><p>以三维动画、产品渲染与 AI 辅助创意，把功能卖点、材料质感和品牌情绪，转译成更有说服力的商业影像。</p><a className="circle-link" href="/work">EXPLORE<br />WORK <Arrow /></a></div></div><div className="hero-index">01 / 04</div></section>
      <section className="section about page-width" id="about"><p className="section-number">01 / PROFILE</p><div className="about-copy about-copy-solo"><p className="label">ABOUT THE PRACTICE</p><h2>让产品的价值<br />先被看见 再被相信</h2><p className="body-copy">毕业于南京艺术学院视觉传达设计专业。十余年间，我从平面与电商视觉走向三维动态创作，持续服务美妆护肤、智能家电、家居百货与运动服饰等品类。擅长把复杂的产品信息梳理成清晰、真实且具备情绪张力的视觉体验。</p><div className="stats"><div><strong>10<span>+</span></strong><small>YEARS OF PRACTICE</small></div><div><strong>04</strong><small>CORE DISCIPLINES</small></div><div><strong>∞</strong><small>VISUAL CURIOSITY</small></div></div></div><div className="profile-details"><span>南京艺术学院 · 视觉传达设计</span><span>C4D / Octane / Redshift / MD / SP</span><a href={`mailto:${profile.email}`}>{profile.email} <Arrow /></a></div></section>
      <section className="section featured-work-section" aria-labelledby="featured-work-title"><div className="page-width"><div className="section-heading"><div><p className="section-number">02 / FEATURED WORK</p><h2 id="featured-work-title">像翻一排电影海报<br />进入每个作品</h2></div><p>横向滑动浏览作品片库。每一张海报，都是一段关于产品、光影与节奏的视觉叙事。</p></div></div><FeaturedCarousel projects={featuredWorks} onSelect={setSelectedProject} /><div className="page-width"><a className="more-work-link" href="/work"><span>查看全部作品</span><span>VIEW ALL WORK ↗</span></a></div></section>
      <section className="section capability-section page-width"><div className="section-heading"><div><p className="section-number">03 / CAPABILITIES</p><h2>把创意<br />落到每一帧里</h2></div><p>从前期概念到最终交付，以审美判断、技术执行和商业目标共同定义画面，而不只停留在效果本身。</p></div><div className="capability-grid">{capabilities.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p><i>↗</i></article>)}</div></section>
      <section className="section experience page-width" id="experience"><p className="section-number">04 / EXPERIENCE</p><div className="experience-intro"><h2>在不同媒介里<br />始终做同一件事</h2><p>让视觉真正服务于产品、品牌与沟通。多年跨平面、电商和三维的经验，使我能从全局理解一件作品该如何被看见。</p></div><ExperienceList items={experiences} /></section>
      <section className="contact" id="contact"><div className="contact-overlay" /><div className="contact-content page-width"><p className="section-number">05 / LET'S CREATE</p><h2>为产品找到<br />更值得被记住的表达</h2><p className="contact-services">PRODUCT ANIMATION / 3D RENDERING / E-COMMERCE VISUAL / AI-ASSISTED CREATION</p><div className="contact-actions"><a href={`mailto:${profile.email}`}>{profile.email} <Arrow /></a><a href={`tel:${profile.phone}`}>{profile.phone}</a><a href={profile.resume} download>下载简历 ↓</a></div><p className="copyright">© 2026 CHEN WEIGUANG · BUILT FOR THE NEXT FRAME</p></div></section>
    </main><ProjectModal project={selectedProject} onClose={() => setSelectedProject(null)} />
  </>;
}
