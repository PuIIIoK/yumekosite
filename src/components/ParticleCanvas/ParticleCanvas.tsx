"use client";

import { useEffect, useRef, useCallback } from "react";
import { useAppearance } from "@/context/AppearanceContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { accent } = useAppearance();
  const mouse = useRef({ x: -1000, y: -1000, active: false });
  const clickWaves = useRef<{ x: number; y: number; t: number }[]>([]);
  const particles = useRef<Particle[]>([]);
  const rafId = useRef<number>(0);
  const inited = useRef(false);

  const hexToRgb = useCallback((hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const PARTICLE_COUNT = 200;
    const CONNECT_DIST = 160;
    const MOUSE_RADIUS = 200;

    function resize() {
      canvas!.width = window.innerWidth * window.devicePixelRatio;
      canvas!.height = window.innerHeight * window.devicePixelRatio;
      ctx!.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    if (!inited.current) {
      inited.current = true;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.current.push({
          x: Math.random() * w(),
          y: Math.random() * h(),
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
          r: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.3,
        });
      }
    }

    const onMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      mouse.current.active = true;
    };
    const onMouseLeave = () => {
      mouse.current.active = false;
    };
    const onClick = (e: MouseEvent) => {
      clickWaves.current.push({ x: e.clientX, y: e.clientY, t: 0 });
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("click", onClick);

    function animate() {
      const width = w();
      const height = h();
      ctx!.clearRect(0, 0, width, height);

      const { r: cr, g: cg, b: cb } = hexToRgb(accent.value);
      const pts = particles.current;

      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        if (p.x > width) { p.x = width; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        if (p.y > height) { p.y = height; p.vy *= -1; }

        // Mouse repel
        if (mouse.current.active) {
          const dx = p.x - mouse.current.x;
          const dy = p.y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS && dist > 0) {
            const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.025;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Click wave push
        for (const wave of clickWaves.current) {
          const dx = p.x - wave.x;
          const dy = p.y - wave.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const waveR = wave.t * 5;
          if (Math.abs(dist - waveR) < 50 && dist > 0) {
            p.vx += (dx / dist) * 1.2;
            p.vy += (dy / dist) * 1.2;
          }
        }

        // Speed limit + damping
        const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > 2) {
          p.vx = (p.vx / speed) * 2;
          p.vy = (p.vy / speed) * 2;
        }
        p.vx *= 0.998;
        p.vy *= 0.998;
      }

      // Click waves
      clickWaves.current = clickWaves.current.filter((cw) => {
        cw.t += 1;
        return cw.t < 60;
      });

      // Draw connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.35;
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
            ctx!.lineWidth = 0.7;
            ctx!.moveTo(pts[i].x, pts[i].y);
            ctx!.lineTo(pts[j].x, pts[j].y);
            ctx!.stroke();
          }
        }
      }

      // Mouse connections
      if (mouse.current.active) {
        for (const p of pts) {
          const dx = p.x - mouse.current.x;
          const dy = p.y - mouse.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MOUSE_RADIUS) {
            const alpha = (1 - dist / MOUSE_RADIUS) * 0.5;
            ctx!.beginPath();
            ctx!.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
            ctx!.lineWidth = 0.8;
            ctx!.moveTo(mouse.current.x, mouse.current.y);
            ctx!.lineTo(p.x, p.y);
            ctx!.stroke();
          }
        }
      }

      // Click wave rings
      for (const wave of clickWaves.current) {
        const waveR = wave.t * 5;
        const alpha = Math.max(0, 0.35 - wave.t * 0.006);
        ctx!.beginPath();
        ctx!.arc(wave.x, wave.y, waveR, 0, Math.PI * 2);
        ctx!.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }

      // Draw particles
      for (const p of pts) {
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${cr},${cg},${cb},${p.opacity})`;
        ctx!.fill();
      }

      rafId.current = requestAnimationFrame(animate);
    }

    rafId.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("click", onClick);
    };
  }, [accent, hexToRgb]);

  return (
    <canvas
      ref={canvasRef}
      className="particles-js-canvas-el"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
