import { useEffect, useRef } from "react";

/**
 * Interactive 3D network globe drawn on a <canvas>.
 *
 * - Points are spread evenly over a sphere (Fibonacci lattice).
 * - "Hub" nodes are joined by arcs with data pulses travelling along them.
 * - Drag (mouse or touch) to spin it; it keeps some momentum.
 * - Pauses automatically when off-screen or when the tab is hidden.
 * - With reduced motion enabled it draws a still frame (dragging
 *   still works because the visitor starts that movement).
 *
 * No 3D library is used: just a little trigonometry, which keeps the
 * bundle small and the frame rate high.
 */

const TAU = Math.PI * 2;

function fibonacciSphere(count) {
  const points = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = golden * i;
    points.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
  }
  return points;
}

// Spherical linear interpolation between two unit vectors.
function slerp(a, b, t) {
  const dot = Math.min(1, Math.max(-1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  if (omega < 1e-4) return { ...a };
  const s = Math.sin(omega);
  const k1 = Math.sin((1 - t) * omega) / s;
  const k2 = Math.sin(t * omega) / s;
  return { x: a.x * k1 + b.x * k2, y: a.y * k1 + b.y * k2, z: a.z * k1 + b.z * k2 };
}

// Seeded random so the arc layout is identical on every visit.
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ARC_COLORS = ["34,211,238", "79,140,255", "139,92,246"];

export default function NetworkGlobe({ className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isSmall = window.matchMedia("(max-width: 640px)").matches;

    const dots = fibonacciSphere(isSmall ? 420 : 760);
    const rand = mulberry32(7);

    // Pick hub nodes and connect nearby-ish pairs with arcs.
    const hubs = Array.from({ length: 16 }, () => dots[Math.floor(rand() * dots.length)]);
    const arcs = [];
    for (let i = 0; i < hubs.length; i++) {
      for (let j = i + 1; j < hubs.length; j++) {
        const a = hubs[i];
        const b = hubs[j];
        const dot = a.x * b.x + a.y * b.y + a.z * b.z;
        if (dot > 0.05 && dot < 0.85 && rand() > 0.45) {
          const samples = 40;
          const lift = 0.12 + (1 - dot) * 0.22;
          const path = [];
          for (let s = 0; s <= samples; s++) {
            const t = s / samples;
            const p = slerp(a, b, t);
            const h = 1 + lift * Math.sin(Math.PI * t);
            path.push({ x: p.x * h, y: p.y * h, z: p.z * h });
          }
          arcs.push({ path, color: ARC_COLORS[arcs.length % 3], speed: 0.12 + rand() * 0.18, offset: rand() });
        }
      }
    }

    let width = 0;
    let height = 0;
    let radius = 0;
    let dpr = 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      radius = Math.min(width, height) * 0.36;
    };

    // Rotation state
    let rotY = 0.6;
    let rotX = -0.32;
    let velY = reduceMotion ? 0 : 0.0016;
    const baseVel = velY;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const rotate = (p) => {
      const cy = Math.cos(rotY);
      const sy = Math.sin(rotY);
      const x = p.x * cy + p.z * sy;
      const z1 = -p.x * sy + p.z * cy;
      const cx = Math.cos(rotX);
      const sx = Math.sin(rotX);
      const y = p.y * cx - z1 * sx;
      const z = p.y * sx + z1 * cx;
      return { x, y, z };
    };

    let time = 0;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;

      // Atmosphere glow
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.75, cx, cy, radius * 1.45);
      glow.addColorStop(0, "rgba(79,140,255,0.16)");
      glow.addColorStop(0.5, "rgba(139,92,246,0.06)");
      glow.addColorStop(1, "rgba(4,6,13,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.45, 0, TAU);
      ctx.fill();

      // Sphere body
      const body = ctx.createRadialGradient(cx - radius * 0.35, cy - radius * 0.4, radius * 0.1, cx, cy, radius);
      body.addColorStop(0, "rgba(30,48,92,0.55)");
      body.addColorStop(1, "rgba(7,11,23,0.9)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(103,232,249,0.22)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Surface dots: brighter and larger on the side facing the viewer.
      for (const d of dots) {
        const p = rotate(d);
        if (p.z < -0.15) continue;
        const depth = (p.z + 1) / 2;
        ctx.fillStyle = `rgba(160,200,255,${0.08 + depth * 0.55})`;
        const size = 0.5 + depth * 1.1;
        ctx.fillRect(cx + p.x * radius - size / 2, cy + p.y * radius - size / 2, size, size);
      }

      // Arcs and travelling pulses
      for (const arc of arcs) {
        const projected = arc.path.map(rotate);
        ctx.beginPath();
        let started = false;
        for (const p of projected) {
          if (p.z < -0.05) {
            started = false;
            continue;
          }
          const sx = cx + p.x * radius;
          const sy = cy + p.y * radius;
          if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
          } else ctx.lineTo(sx, sy);
        }
        ctx.strokeStyle = `rgba(${arc.color},0.38)`;
        ctx.lineWidth = 1;
        ctx.stroke();

        const t = (time * arc.speed + arc.offset) % 1;
        const p = projected[Math.floor(t * (projected.length - 1))];
        if (p.z > 0) {
          const px = cx + p.x * radius;
          const py = cy + p.y * radius;
          const g = ctx.createRadialGradient(px, py, 0, px, py, 7);
          g.addColorStop(0, `rgba(${arc.color},0.95)`);
          g.addColorStop(1, `rgba(${arc.color},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, 7, 0, TAU);
          ctx.fill();
        }
      }

      // Hub nodes
      for (const h of hubs) {
        const p = rotate(h);
        if (p.z < 0) continue;
        const px = cx + p.x * radius;
        const py = cy + p.y * radius;
        ctx.fillStyle = "rgba(230,241,255,0.95)";
        ctx.beginPath();
        ctx.arc(px, py, 1.8 + p.z * 1.2, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = `rgba(34,211,238,${0.25 + p.z * 0.35})`;
        ctx.beginPath();
        ctx.arc(px, py, 5 + p.z * 2, 0, TAU);
        ctx.stroke();
      }
    };

    let frame = 0;
    let running = false;
    let lastTs = 0;

    const loop = (ts) => {
      const dt = lastTs ? Math.min((ts - lastTs) / 1000, 0.05) : 0.016;
      lastTs = ts;
      if (!reduceMotion) time += dt;
      if (!dragging) {
        rotY += velY;
        // Ease momentum back to the gentle idle spin.
        velY += (baseVel - velY) * 0.03;
      }
      draw();
      if (running) frame = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      lastTs = 0;
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    // Pointer interaction
    const onDown = (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture?.(e.pointerId);
      if (reduceMotion) start();
    };
    const onMove = (e) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      rotY += dx * 0.006;
      rotX = Math.max(-1.1, Math.min(1.1, rotX + dy * 0.004));
      velY = dx * 0.0012;
    };
    const onUp = () => {
      dragging = false;
      if (reduceMotion) {
        velY = 0;
        stop();
        draw();
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
      draw();
    });
    resizeObserver.observe(canvas);

    let visible = true;
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !reduceMotion && !document.hidden) start();
      else stop();
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (visible && !reduceMotion) start();
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (reduceMotion) draw();
    else start();

    return () => {
      stop();
      io.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`h-full w-full cursor-grab touch-pan-y active:cursor-grabbing ${className}`}
      role="img"
      aria-label="Interactive globe of connected network nodes. Drag to rotate."
    />
  );
}
