"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useAppearance, type CanvasStyle } from "@/context/AppearanceContext";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
}

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

// ─── Network (original) ───
function initNetwork(pts: Particle[], w: number, h: number) {
  for (let i = 0; i < 450; i++) {
    pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, r: Math.random() * 2 + 1, opacity: Math.random() * 0.5 + 0.3 });
  }
}

function drawNetwork(ctx: CanvasRenderingContext2D, pts: Particle[], w: number, h: number, cr: number, cg: number, cb: number, mouse: { x: number; y: number; active: boolean }, clickWaves: { x: number; y: number; t: number }[]) {
  const CONNECT_DIST = 160, MOUSE_RADIUS = 200;
  for (const p of pts) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) { p.x = 0; p.vx *= -1; } if (p.x > w) { p.x = w; p.vx *= -1; }
    if (p.y < 0) { p.y = 0; p.vy *= -1; } if (p.y > h) { p.y = h; p.vy *= -1; }
    if (mouse.active) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) { const f = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * 0.025; p.vx += (dx / dist) * f; p.vy += (dy / dist) * f; }
    }
    for (const wave of clickWaves) {
      const dx = p.x - wave.x, dy = p.y - wave.y, dist = Math.sqrt(dx * dx + dy * dy), wR = wave.t * 5;
      if (Math.abs(dist - wR) < 50 && dist > 0) { p.vx += (dx / dist) * 1.2; p.vy += (dy / dist) * 1.2; }
    }
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (spd > 2) { p.vx = (p.vx / spd) * 2; p.vy = (p.vy / spd) * 2; }
    p.vx *= 0.998; p.vy *= 0.998;
  }
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < CONNECT_DIST) { ctx.beginPath(); ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(1 - dist / CONNECT_DIST) * 0.35})`; ctx.lineWidth = 0.7; ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y); ctx.stroke(); }
    }
  }
  if (mouse.active) {
    for (const p of pts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS) { ctx.beginPath(); ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(1 - dist / MOUSE_RADIUS) * 0.5})`; ctx.lineWidth = 0.8; ctx.moveTo(mouse.x, mouse.y); ctx.lineTo(p.x, p.y); ctx.stroke(); }
    }
  }
  for (const wave of clickWaves) {
    const wR = wave.t * 5, a = Math.max(0, 0.35 - wave.t * 0.006);
    ctx.beginPath(); ctx.arc(wave.x, wave.y, wR, 0, Math.PI * 2); ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`; ctx.lineWidth = 1.5; ctx.stroke();
  }
  for (const p of pts) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.opacity})`; ctx.fill(); }
}

// ─── Bubbles ───
function initBubbles(pts: Particle[], w: number, h: number) {
  for (let i = 0; i < 130; i++) {
    pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: -Math.random() * 0.4 - 0.1, r: Math.random() * 12 + 4, opacity: Math.random() * 0.15 + 0.05 });
  }
}

function drawBubbles(ctx: CanvasRenderingContext2D, pts: Particle[], w: number, h: number, cr: number, cg: number, cb: number) {
  for (const p of pts) {
    p.x += p.vx; p.y += p.vy;
    if (p.y + p.r < 0) { p.y = h + p.r; p.x = Math.random() * w; }
    if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.opacity * 0.4})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${p.opacity * 0.8})`;
    ctx.lineWidth = 0.5; ctx.stroke();
  }
}

// ─── Stars ───
function initStars(pts: Particle[], w: number, h: number) {
  for (let i = 0; i < 600; i++) {
    pts.push({ x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0, r: Math.random() * 1.5 + 0.3, opacity: Math.random() * 0.7 + 0.1 });
  }
}

let shootingStars: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number }[] = [];
function drawStars(ctx: CanvasRenderingContext2D, pts: Particle[], w: number, h: number, cr: number, cg: number, cb: number, time: number, mouse: { x: number; y: number; active: boolean }, clicks: { x: number; y: number; t: number }[]) {
  const nearPts: { x: number; y: number }[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const twinkle = Math.sin(time * 0.002 + i * 1.7) * 0.3 + 0.7;
    let a = p.opacity * twinkle;
    if (mouse.active) {
      const md = Math.sqrt((mouse.x - p.x) ** 2 + (mouse.y - p.y) ** 2);
      if (md < 200) {
        a = Math.min(1, a + (1 - md / 200) * 0.5);
        nearPts.push({ x: p.x, y: p.y });
      }
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`;
    ctx.fill();
    if (p.r > 1.2) {
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${a * 0.08})`;
      ctx.fill();
    }
  }
  for (let i = 0; i < nearPts.length; i++) {
    for (let j = i + 1; j < nearPts.length; j++) {
      const dx = nearPts[i].x - nearPts[j].x, dy = nearPts[i].y - nearPts[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 100) {
        ctx.beginPath(); ctx.moveTo(nearPts[i].x, nearPts[i].y); ctx.lineTo(nearPts[j].x, nearPts[j].y);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(1 - dist / 100) * 0.2})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
  }
  for (const cw of clicks) {
    if (cw.t === 1) {
      for (let s = 0; s < 3; s++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 4;
        shootingStars.push({ x: cw.x, y: cw.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0, maxLife: 30 + Math.random() * 20 });
      }
    }
  }
  shootingStars = shootingStars.filter(s => { s.life++; return s.life < s.maxLife; });
  for (const s of shootingStars) {
    s.x += s.vx; s.y += s.vy;
    const a = Math.max(0, 0.8 - s.life / s.maxLife);
    const tailLen = 6;
    for (let t = 0; t < tailLen; t++) {
      const ta = a * (1 - t / tailLen) * 0.5;
      const tx = s.x - s.vx * t * 0.5, ty = s.y - s.vy * t * 0.5;
      ctx.beginPath(); ctx.arc(tx, ty, 1.5 - t * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${ta})`; ctx.fill();
    }
  }
  if (mouse.active) {
    const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 100);
    mg.addColorStop(0, `rgba(${cr},${cg},${cb},0.04)`);
    mg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
    ctx.fillStyle = mg; ctx.fill();
  }
}

// ─── Snow ───
function initSnow(pts: Particle[], w: number, h: number) {
  for (let i = 0; i < 300; i++) {
    pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.5, vy: Math.random() * 0.8 + 0.2, r: Math.random() * 2.5 + 0.8, opacity: Math.random() * 0.4 + 0.15 });
  }
}

function drawSnow(ctx: CanvasRenderingContext2D, pts: Particle[], w: number, h: number, cr: number, cg: number, cb: number, time: number) {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    p.x += p.vx + Math.sin(time * 0.001 + i) * 0.15;
    p.y += p.vy;
    if (p.y > h + p.r) { p.y = -p.r; p.x = Math.random() * w; }
    if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.opacity})`;
    ctx.fill();
  }
}

// ─── Matrix ───
interface MatrixCol { x: number; y: number; speed: number; chars: string[]; len: number; }
function initMatrix(cols: MatrixCol[], w: number) {
  const fontSize = 14;
  const colCount = Math.ceil(w / fontSize);
  const charset = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789";
  for (let i = 0; i < colCount; i++) {
    const len = Math.floor(Math.random() * 15) + 5;
    const chars: string[] = [];
    for (let j = 0; j < len; j++) chars.push(charset[Math.floor(Math.random() * charset.length)]);
    cols.push({ x: i * fontSize, y: Math.random() * -500, speed: Math.random() * 1.5 + 0.5, chars, len });
  }
}

function drawMatrix(ctx: CanvasRenderingContext2D, cols: MatrixCol[], h: number, cr: number, cg: number, cb: number) {
  const fontSize = 14;
  ctx.font = `${fontSize}px 'Geist Mono', monospace`;
  for (const col of cols) {
    for (let j = 0; j < col.chars.length; j++) {
      const cy = col.y + j * fontSize;
      if (cy < -fontSize || cy > h + fontSize) continue;
      const alpha = j === col.chars.length - 1 ? 0.9 : Math.max(0.03, 0.25 - (col.chars.length - 1 - j) * 0.02);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.fillText(col.chars[j], col.x, cy);
    }
    col.y += col.speed;
    if (col.y - col.len * fontSize > h) {
      col.y = Math.random() * -300 - 100;
      col.speed = Math.random() * 1.5 + 0.5;
    }
  }
}

// ─── Fireflies ───
function initFireflies(pts: Particle[], w: number, h: number) {
  for (let i = 0; i < 130; i++) {
    pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 2 + 1.5, opacity: Math.random() * 0.6 + 0.2 });
  }
}

function drawFireflies(ctx: CanvasRenderingContext2D, pts: Particle[], w: number, h: number, cr: number, cg: number, cb: number, time: number, mouse: { x: number; y: number; active: boolean }, clicks: { x: number; y: number; t: number }[]) {
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    p.vx += (Math.random() - 0.5) * 0.02;
    p.vy += (Math.random() - 0.5) * 0.02;
    // attract to cursor
    if (mouse.active) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250 && dist > 1) {
        const force = 0.06 / (dist * 0.05 + 1);
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }
    // scatter on click
    for (const cw of clicks) {
      if (cw.t > 15) continue;
      const dx = p.x - cw.x, dy = p.y - cw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200 && dist > 1) {
        const force = (1 - cw.t / 15) * 1.5 / (dist * 0.1 + 1);
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }
    }
    const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
    if (spd > 0.8) { p.vx = (p.vx / spd) * 0.8; p.vy = (p.vy / spd) * 0.8; }
    p.vx *= 0.96; p.vy *= 0.96;
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
    const pulse = Math.sin(time * 0.003 + i * 2.3) * 0.4 + 0.6;
    let a = p.opacity * pulse;
    // glow brighter near cursor
    if (mouse.active) {
      const md = Math.sqrt((mouse.x - p.x) ** 2 + (mouse.y - p.y) ** 2);
      if (md < 180) a = Math.min(1, a + (1 - md / 180) * 0.5);
    }
    const glow = p.r * 6;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
    grad.addColorStop(0, `rgba(${cr},${cg},${cb},${a * 0.8})`);
    grad.addColorStop(0.3, `rgba(${cr},${cg},${cb},${a * 0.2})`);
    grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath(); ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${a})`; ctx.fill();
  }
  // cursor glow
  if (mouse.active) {
    const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 60);
    mg.addColorStop(0, `rgba(${cr},${cg},${cb},0.08)`);
    mg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 60, 0, Math.PI * 2);
    ctx.fillStyle = mg; ctx.fill();
  }
}

// ─── Waves ───
function initWaves(_pts: Particle[], _w: number, _h: number) {}

function drawWaves(ctx: CanvasRenderingContext2D, w: number, h: number, cr: number, cg: number, cb: number, time: number, mouse: { x: number; y: number; active: boolean }, clicks: { x: number; y: number; t: number }[]) {
  for (let wave = 0; wave < 5; wave++) {
    ctx.beginPath();
    const yBase = h * 0.3 + wave * (h * 0.12);
    const amp = 30 + wave * 8;
    const freq = 0.004 - wave * 0.0003;
    const speed = time * (0.8 + wave * 0.3);
    const alpha = 0.08 + wave * 0.03;
    for (let x = 0; x <= w; x += 2) {
      let y = yBase + Math.sin(x * freq + speed * 0.01) * amp + Math.sin(x * freq * 2.5 + speed * 0.015) * (amp * 0.3);
      // mouse distortion
      if (mouse.active) {
        const dx = x - mouse.x;
        const dist = Math.abs(dx);
        if (dist < 300) {
          const influence = (1 - dist / 300) ** 2;
          const dy = mouse.y - yBase;
          y += dy * influence * 0.15;
        }
      }
      // click ripple
      for (const cw of clicks) {
        const cdx = x - cw.x, cdy = y - cw.y;
        const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
        const rippleR = cw.t * 4;
        const rippleW = 120;
        if (Math.abs(cdist - rippleR) < rippleW) {
          const rippleA = (1 - cw.t / 60) * 15;
          y += Math.sin((cdist - rippleR) * 0.06) * rippleA * (1 - Math.abs(cdist - rippleR) / rippleW);
        }
      }
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${alpha})`;
    ctx.lineWidth = 3; ctx.stroke();
  }
}

// ─── Galaxy ───
interface Planet { angle: number; dist: number; speed: number; r: number; opacity: number; ringOpacity: number; hasRing: boolean; }
let galaxyPlanets: Planet[] = [];

function initGalaxy(pts: Particle[], w: number, h: number) {
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < 500; i++) {
    const arm = Math.floor(Math.random() * 3);
    const dist = Math.random() * Math.min(w, h) * 0.4;
    const angle = (arm * Math.PI * 2) / 3 + dist * 0.005 + (Math.random() - 0.5) * 0.5;
    pts.push({
      x: cx + Math.cos(angle) * dist + (Math.random() - 0.5) * 20,
      y: cy + Math.sin(angle) * dist + (Math.random() - 0.5) * 20,
      vx: angle, vy: dist, r: Math.random() * 1.2 + 0.3,
      opacity: Math.max(0.1, 0.7 - dist / (Math.min(w, h) * 0.4) * 0.5),
    });
  }
  galaxyPlanets = [];
  for (let i = 0; i < 6; i++) {
    const dist = 80 + Math.random() * Math.min(w, h) * 0.3;
    galaxyPlanets.push({
      angle: Math.random() * Math.PI * 2,
      dist,
      speed: (0.0001 + Math.random() * 0.0002) * (Math.random() > 0.5 ? 1 : -1),
      r: Math.random() * 6 + 4,
      opacity: Math.random() * 0.3 + 0.2,
      ringOpacity: Math.random() * 0.15 + 0.05,
      hasRing: Math.random() > 0.5,
    });
  }
}

function drawGalaxy(ctx: CanvasRenderingContext2D, pts: Particle[], w: number, h: number, cr: number, cg: number, cb: number, time: number, mouse: { x: number; y: number; active: boolean }, clicks: { x: number; y: number; t: number }[]) {
  const cx = w / 2, cy = h / 2;
  const rot = time * 0.0003;
  for (const p of pts) {
    const angle = p.vx + rot;
    const dist = p.vy;
    let x = cx + Math.cos(angle) * dist;
    let y = cy + Math.sin(angle) * dist;
    let op = p.opacity;
    // cursor gravity — slightly pull stars toward mouse
    if (mouse.active) {
      const dx = mouse.x - x, dy = mouse.y - y;
      const md = Math.sqrt(dx * dx + dy * dy);
      if (md < 200 && md > 1) {
        const pull = 0.3 / (md * 0.05 + 1);
        x += (dx / md) * pull;
        y += (dy / md) * pull;
        op = Math.min(1, op + (1 - md / 200) * 0.4);
      }
    }
    // click shockwave — push stars away
    for (const cw of clicks) {
      if (cw.t > 30) continue;
      const dx = x - cw.x, dy = y - cw.y;
      const cd = Math.sqrt(dx * dx + dy * dy);
      const waveR = cw.t * 12;
      if (Math.abs(cd - waveR) < 60 && cd > 1) {
        const force = (1 - cw.t / 30) * 2;
        x += (dx / cd) * force;
        y += (dy / cd) * force;
      }
    }
    ctx.beginPath(); ctx.arc(x, y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${op})`;
    ctx.fill();
  }
  // planets
  for (const pl of galaxyPlanets) {
    pl.angle += pl.speed;
    const px = cx + Math.cos(pl.angle) * pl.dist;
    const py = cy + Math.sin(pl.angle) * pl.dist;
    // glow
    const glow = ctx.createRadialGradient(px, py, 0, px, py, pl.r * 3);
    glow.addColorStop(0, `rgba(${cr},${cg},${cb},${pl.opacity * 0.4})`);
    glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath(); ctx.arc(px, py, pl.r * 3, 0, Math.PI * 2);
    ctx.fillStyle = glow; ctx.fill();
    // body
    ctx.beginPath(); ctx.arc(px, py, pl.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${pl.opacity})`;
    ctx.fill();
    // ring
    if (pl.hasRing) {
      ctx.beginPath();
      ctx.ellipse(px, py, pl.r * 2, pl.r * 0.5, 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${pl.ringOpacity})`;
      ctx.lineWidth = 1; ctx.stroke();
    }
  }
  // cursor glow
  if (mouse.active) {
    const mg = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 80);
    mg.addColorStop(0, `rgba(${cr},${cg},${cb},0.1)`);
    mg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 80, 0, Math.PI * 2);
    ctx.fillStyle = mg; ctx.fill();
  }
  // click shockwave ring
  for (const cw of clicks) {
    const wR = cw.t * 12, a = Math.max(0, 0.3 - cw.t * 0.005);
    ctx.beginPath(); ctx.arc(cw.x, cw.y, wR, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`; ctx.lineWidth = 2; ctx.stroke();
  }
  // core glow
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
  coreGrad.addColorStop(0, `rgba(${cr},${cg},${cb},0.18)`);
  coreGrad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad; ctx.fill();
}

// ─── Rain ───
function initRain(pts: Particle[], w: number, h: number) {
  for (let i = 0; i < 300; i++) {
    pts.push({ x: Math.random() * w, y: Math.random() * h, vx: -0.3, vy: Math.random() * 3.5 + 2.5, r: Math.random() * 1.5 + 0.5, opacity: Math.random() * 0.25 + 0.1 });
  }
}

let rainSplashes: { x: number; y: number; t: number; r: number }[] = [];
function drawRain(ctx: CanvasRenderingContext2D, pts: Particle[], w: number, h: number, cr: number, cg: number, cb: number, mouse: { x: number; y: number; active: boolean }) {
  // wind from mouse horizontal movement
  for (const p of pts) {
    let windX = p.vx;
    if (mouse.active) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      // umbrella effect — push drops away from cursor
      if (dist < 150 && dist > 1) {
        const force = (1 - dist / 150) * 0.8;
        p.x += (dx / dist) * force;
        p.y += (dy / dist) * force * 0.15;
        windX += (dx / dist) * force * 0.2;
      }
    }
    p.x += windX; p.y += p.vy;
    if (p.y > h) {
      // splash at bottom
      if (Math.random() < 0.15) rainSplashes.push({ x: p.x, y: h, t: 0, r: p.r * 3 });
      p.y = -10; p.x = Math.random() * w;
    }
    if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
    const len = p.vy * 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + windX * 2, p.y - len);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${p.opacity})`;
    ctx.lineWidth = p.r; ctx.stroke();
  }
  // draw splashes
  rainSplashes = rainSplashes.filter(s => { s.t++; return s.t < 20; });
  for (const s of rainSplashes) {
    const a = Math.max(0, 0.2 - s.t * 0.01);
    const sr = s.r + s.t * 0.8;
    ctx.beginPath(); ctx.arc(s.x, s.y, sr, Math.PI, Math.PI * 2);
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},${a})`; ctx.lineWidth = 0.8; ctx.stroke();
  }
}

// ─── Confetti ───
interface ConfettiP { x: number; y: number; vx: number; vy: number; r: number; rot: number; rotV: number; opacity: number; shape: number; }
function initConfetti(pts: ConfettiP[], w: number, h: number) {
  for (let i = 0; i < 120; i++) {
    pts.push({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.8, vy: Math.random() * 0.6 + 0.2, r: Math.random() * 4 + 2, rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 0.03, opacity: Math.random() * 0.3 + 0.1, shape: Math.floor(Math.random() * 3) });
  }
}

function drawConfetti(ctx: CanvasRenderingContext2D, pts: ConfettiP[], w: number, h: number, cr: number, cg: number, cb: number, mouse: { x: number; y: number; active: boolean }, clicks: { x: number; y: number; t: number }[]) {
  for (const p of pts) {
    // swirl around cursor
    if (mouse.active) {
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200 && dist > 1) {
        const force = (1 - dist / 200) * 0.15;
        // tangential + slight pull
        p.vx += (-dy / dist * force * 0.7) + (dx / dist * force * 0.2);
        p.vy += (dx / dist * force * 0.7) + (dy / dist * force * 0.2);
        p.rotV += force * 0.01;
      }
    }
    // click burst — explode outward
    for (const cw of clicks) {
      if (cw.t > 20) continue;
      const dx = p.x - cw.x, dy = p.y - cw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 250 && dist > 1) {
        const force = (1 - cw.t / 20) * 2.5 / (dist * 0.05 + 1);
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
        p.rotV += (Math.random() - 0.5) * 0.1;
      }
    }
    p.vx *= 0.97; p.vy *= 0.97;
    p.vy += 0.01; // slight gravity
    p.x += p.vx; p.y += p.vy; p.rot += p.rotV;
    p.rotV *= 0.99;
    if (p.y > h + p.r) { p.y = -p.r; p.x = Math.random() * w; p.vx = (Math.random() - 0.5) * 0.8; p.vy = Math.random() * 0.6 + 0.2; }
    if (p.x < -p.r) p.x = w + p.r; if (p.x > w + p.r) p.x = -p.r;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${p.opacity})`;
    if (p.shape === 0) { ctx.fillRect(-p.r / 2, -p.r, p.r, p.r * 2); }
    else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill(); }
    else { ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r, p.r); ctx.lineTo(-p.r, p.r); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { canvasEnabled, activeCanvasStyle, activeCanvasAccent } = useAppearance();
  const [isMobile, setIsMobile] = useState(true); // default true to prevent canvas init on mobile
  const mouse = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const mobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsMobile(mobile);
  }, []);
  const clickWaves = useRef<{ x: number; y: number; t: number }[]>([]);
  const particles = useRef<Particle[]>([]);
  const matrixCols = useRef<MatrixCol[]>([]);
  const confettiPts = useRef<ConfettiP[]>([]);
  const rafId = useRef<number>(0);
  const lastStyle = useRef<CanvasStyle | null>(null);
  const timeRef = useRef(0);

  const reinit = useCallback((style: CanvasStyle) => {
    particles.current = [];
    matrixCols.current = [];
    confettiPts.current = [];
    const w = window.innerWidth, h = window.innerHeight;
    if (style === "network") initNetwork(particles.current, w, h);
    else if (style === "bubbles") initBubbles(particles.current, w, h);
    else if (style === "stars") initStars(particles.current, w, h);
    else if (style === "snow") initSnow(particles.current, w, h);
    else if (style === "matrix") initMatrix(matrixCols.current, w);
    else if (style === "fireflies") initFireflies(particles.current, w, h);
    else if (style === "waves") initWaves(particles.current, w, h);
    else if (style === "galaxy") initGalaxy(particles.current, w, h);
    else if (style === "rain") initRain(particles.current, w, h);
    else if (style === "confetti") initConfetti(confettiPts.current, w, h);
    lastStyle.current = style;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      canvas!.width = window.innerWidth * window.devicePixelRatio;
      canvas!.height = window.innerHeight * window.devicePixelRatio;
      ctx!.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    if (lastStyle.current !== activeCanvasStyle) reinit(activeCanvasStyle);

    const onMouseMove = (e: MouseEvent) => { mouse.current.x = e.clientX; mouse.current.y = e.clientY; mouse.current.active = true; };
    const onMouseLeave = () => { mouse.current.active = false; };
    const onClick = (e: MouseEvent) => { clickWaves.current.push({ x: e.clientX, y: e.clientY, t: 0 }); };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);
    window.addEventListener("click", onClick);

    function animate() {
      const width = window.innerWidth, height = window.innerHeight;
      ctx!.clearRect(0, 0, width, height);
      const { r: cr, g: cg, b: cb } = hexToRgb(activeCanvasAccent);
      timeRef.current++;

      clickWaves.current = clickWaves.current.filter((cw) => { cw.t += 1; return cw.t < 60; });

      if (activeCanvasStyle === "network") drawNetwork(ctx!, particles.current, width, height, cr, cg, cb, mouse.current, clickWaves.current);
      else if (activeCanvasStyle === "bubbles") drawBubbles(ctx!, particles.current, width, height, cr, cg, cb);
      else if (activeCanvasStyle === "stars") drawStars(ctx!, particles.current, width, height, cr, cg, cb, timeRef.current, mouse.current, clickWaves.current);
      else if (activeCanvasStyle === "snow") drawSnow(ctx!, particles.current, width, height, cr, cg, cb, timeRef.current);
      else if (activeCanvasStyle === "matrix") drawMatrix(ctx!, matrixCols.current, height, cr, cg, cb);
      else if (activeCanvasStyle === "fireflies") drawFireflies(ctx!, particles.current, width, height, cr, cg, cb, timeRef.current, mouse.current, clickWaves.current);
      else if (activeCanvasStyle === "waves") drawWaves(ctx!, width, height, cr, cg, cb, timeRef.current, mouse.current, clickWaves.current);
      else if (activeCanvasStyle === "galaxy") drawGalaxy(ctx!, particles.current, width, height, cr, cg, cb, timeRef.current, mouse.current, clickWaves.current);
      else if (activeCanvasStyle === "rain") drawRain(ctx!, particles.current, width, height, cr, cg, cb, mouse.current);
      else if (activeCanvasStyle === "confetti") drawConfetti(ctx!, confettiPts.current, width, height, cr, cg, cb, mouse.current, clickWaves.current);

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
  }, [activeCanvasStyle, activeCanvasAccent, reinit]);

  if (!canvasEnabled || isMobile) return null;

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
