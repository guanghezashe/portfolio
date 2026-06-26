import { useEffect, useMemo, useRef } from "react";

const wrapOffset = (value, width) => {
  if (!width) return value;
  return ((value % width) + width) % width;
};

const previewSource = (project) => {
  if (project.media === "video") return project.coverUrl || project.poster || "";
  return project.previewSrc || project.coverUrl || project.src || "";
};

function CardMedia({ project, rowIndex }) {
  if (project.media === "video") {
    return (
      <video
        src={project.fileUrl || project.src}
        poster={project.coverUrl || project.poster}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        aria-label={project.title}
        onLoadedData={(event) => event.currentTarget.play().catch(() => {})}
      />
    );
  }

  const preview = previewSource(project);
  return preview ? (
    <img src={preview} alt={project.title} loading={rowIndex > 0 ? "lazy" : "eager"} decoding="async" />
  ) : (
    <span className="film-card-placeholder" aria-hidden="true" />
  );
}

export default function FeaturedCarousel({ projects, onSelect }) {
  const rowRefs = useRef([]);
  const frameRef = useRef(null);
  const offsetRef = useRef(0);
  const loopWidthRef = useRef(0);
  const loopWidthsRef = useRef([]);
  const dragRef = useRef({ active: false, moved: false, lastX: 0, lastTime: 0, velocity: 0 });

  const rows = useMemo(() => {
    if (!projects.length) return [];
    const hash = (text) => [...String(text)].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const images = projects.filter((project) => project.media !== "video").sort((a, b) => hash(a.id) - hash(b.id));
    const videos = projects.filter((project) => project.media === "video").sort((a, b) => hash(b.id) - hash(a.id));
    const mixed = [];
    const max = Math.max(images.length, videos.length);
    for (let index = 0; index < max; index += 1) {
      if (images[index]) mixed.push(images[index]);
      if (videos[index]) mixed.push(videos[index]);
      if (images[index + 7]) mixed.push(images[index + 7]);
    }
    const repeated = Array.from({ length: 30 }, (_, index) => mixed[index % mixed.length]);
    return [repeated.slice(0, 10), repeated.slice(10, 20), repeated.slice(20, 30)];
  }, [projects]);

  const applyOffset = () => {
    rowRefs.current.forEach((row, index) => {
      if (!row) return;
      const direction = index === 1 ? 1 : -1;
      const width = loopWidthsRef.current[index] || loopWidthRef.current;
      const rowOffset = wrapOffset(offsetRef.current, width);
      row.style.transform = `translate3d(${-width + rowOffset * direction}px, 0, 0)`;
    });
  };

  const measureLoop = () => {
    loopWidthsRef.current = rowRefs.current.map((row) => row ? row.scrollWidth / 3 : 0);
    loopWidthRef.current = loopWidthsRef.current[0] || 0;
    offsetRef.current = wrapOffset(offsetRef.current, loopWidthRef.current);
    applyOffset();
  };

  const stopMomentum = () => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  };

  const glide = () => {
    offsetRef.current = wrapOffset(offsetRef.current + dragRef.current.velocity, loopWidthRef.current);
    applyOffset();
    dragRef.current.velocity *= 0.93;
    if (Math.abs(dragRef.current.velocity) > 0.18) {
      frameRef.current = requestAnimationFrame(glide);
    } else {
      frameRef.current = null;
      window.setTimeout(() => {
        dragRef.current.moved = false;
      }, 80);
    }
  };

  const moveBy = (direction) => {
    stopMomentum();
    dragRef.current.velocity = direction * -14;
    frameRef.current = requestAnimationFrame(glide);
  };

  const startDrag = (event) => {
    stopMomentum();
    dragRef.current = {
      active: true,
      moved: false,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.currentTarget.classList.add("is-dragging");
  };

  const drag = (event) => {
    if (!dragRef.current.active) return;
    const now = performance.now();
    const delta = event.clientX - dragRef.current.lastX;
    if (Math.abs(delta) > 1) dragRef.current.moved = true;
    offsetRef.current = wrapOffset(offsetRef.current + delta, loopWidthRef.current);
    applyOffset();
    dragRef.current.velocity = (delta / Math.max(16, now - dragRef.current.lastTime)) * 18;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastTime = now;
  };

  const endDrag = (event) => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    event.currentTarget.classList.remove("is-dragging");
    if (Math.abs(dragRef.current.velocity) > 0.25) {
      frameRef.current = requestAnimationFrame(glide);
    } else {
      window.setTimeout(() => {
        dragRef.current.moved = false;
      }, 80);
    }
  };

  const openProject = (project) => {
    if (dragRef.current.moved) return;
    onSelect(project);
  };

  useEffect(() => {
    measureLoop();
    window.addEventListener("resize", measureLoop);
    return () => {
      stopMomentum();
      window.removeEventListener("resize", measureLoop);
    };
  }, [rows]);

  return (
    <div className="film-shelf">
      <div className="film-shelf-controls">
        <button type="button" onClick={() => moveBy(-1)} aria-label="Previous projects">
          {"<"}
        </button>
        <span>DRAG THE WALL</span>
        <button type="button" onClick={() => moveBy(1)} aria-label="Next projects">
          {">"}
        </button>
      </div>

      <div
        className="film-wall"
        onPointerDown={startDrag}
        onPointerMove={drag}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="film-wall-stage">
          {rows.map((row, rowIndex) => (
            <div className="film-row-wrap" key={rowIndex}>
              <div className="film-row" ref={(node) => { rowRefs.current[rowIndex] = node; }}>
                {[...row, ...row, ...row].map((project, index) => (
                  <button
                    className="film-card"
                    key={`${project.id}-${rowIndex}-${index}`}
                    type="button"
                    aria-label={`Open project: ${project.title}`}
                    onClick={() => openProject(project)}
                  >
                    <CardMedia project={project} rowIndex={rowIndex} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
