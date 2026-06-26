import { useEffect, useRef } from "react";
import { Camera, Mesh, Plane, Program, Renderer } from "ogl";

const vertexShader = `
attribute vec2 uv;
attribute vec3 position;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

varying vec2 vUv;
varying vec3 vPosition;

void main() {
  vPosition = position;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

varying vec2 vUv;
varying vec3 vPosition;

uniform float uTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = (G * sin(G * texCoord));
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  float rnd = noise(gl_FragCoord.xy);
  vec2 uv = rotateUvs(vUv * uScale, uRotation);
  vec2 tex = uv * uScale;
  float tOffset = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
                  0.4 * sin(5.0 * (tex.x + tex.y +
                                   cos(3.0 * tex.x + 5.0 * tex.y) +
                                   0.02 * tOffset) +
                           sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec4 col = vec4(uColor, 1.0) * vec4(pattern) - rnd / 15.0 * uNoiseIntensity;
  col.a = 1.0;
  gl_FragColor = col;
}
`;

const hexToRgb = (hex) => {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255,
  ];
};

export default function Silk({ speed = 5, scale = 1, color = "#7B7481", noiseIntensity = 1.5, rotation = 0, className = "" }) {
  const containerRef = useRef(null);
  const propsRef = useRef({ speed, scale, color, noiseIntensity, rotation });
  propsRef.current = { speed, scale, color, noiseIntensity, rotation };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const renderer = new Renderer({ alpha: true, antialias: false, dpr: 1 });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    const camera = new Camera(gl, { fov: 75 });
    camera.position.z = 1;

    const geometry = new Plane(gl, { width: 1, height: 1 });
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uSpeed: { value: speed },
        uScale: { value: scale },
        uNoiseIntensity: { value: noiseIntensity },
        uColor: { value: hexToRgb(color) },
        uRotation: { value: rotation },
        uTime: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry, program });

    gl.canvas.className = "silk-canvas";
    container.appendChild(gl.canvas);

    const resize = () => {
      const width = Math.max(container.offsetWidth || window.innerWidth, 300);
      const height = Math.max(container.offsetHeight || window.innerHeight, 300);
      renderer.setSize(width, height);
      camera.perspective({ aspect: width / height });
      const distance = camera.position.z;
      const fov = camera.fov * (Math.PI / 180);
      const planeHeight = 2 * Math.tan(fov / 2) * distance;
      const planeWidth = planeHeight * (width / height);
      mesh.scale.set(planeWidth, planeHeight, 1);
    };

    let frame = 0;
    let lastTime = 0;
    let isVisible = !reducedMotion;
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
    };
    const start = () => {
      if (!frame && isVisible && document.visibilityState !== "hidden") frame = requestAnimationFrame(update);
    };
    const update = (time) => {
      if (!isVisible || document.visibilityState === "hidden") {
        stop();
        return;
      }
      frame = requestAnimationFrame(update);
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      const latest = propsRef.current;
      program.uniforms.uTime.value += 0.1 * delta;
      program.uniforms.uSpeed.value = latest.speed;
      program.uniforms.uScale.value = latest.scale;
      program.uniforms.uNoiseIntensity.value = latest.noiseIntensity;
      program.uniforms.uColor.value = hexToRgb(latest.color);
      program.uniforms.uRotation.value = latest.rotation;
      renderer.render({ scene: mesh, camera });
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") stop();
      else start();
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting && !reducedMotion;
      if (isVisible) start();
      else stop();
    }, { threshold: 0.02 });

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", handleVisibility);
    visibilityObserver.observe(container);
    renderer.render({ scene: mesh, camera });
    start();

    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibility);
      visibilityObserver.disconnect();
      if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <div className={`silk-background ${className}`} ref={containerRef} aria-hidden="true" />;
}
