import React, { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

type ColorVariantIndex = 0 | 1 | 2;

interface RayStar {
  x: number;
  y: number;
  baseR: number; // outer ray radius
  colorIdx: ColorVariantIndex;
  speed: number; // 0.6 to 1.8 rad/s
  phase: number;
  minAlpha: number; // 0.06 to 0.18
  maxAlpha: number; // 0.75 to 0.98
  driftSpeed: number; // 1.2 to 3.5 px/s
  relocateTimer: number; // 10 to 22 s
}

interface FillerDot {
  x: number;
  y: number;
  driftSpeed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tailLength: number;
  elapsed: number;
  duration: number;
}

interface SpriteEntry {
  canvas: HTMLCanvasElement;
  logicalHalfSize: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Varied star radius buckets: mostly small crisp stars, some medium, few prominent anchor stars
const RADIUS_BUCKETS = [3.2, 4.0, 5.0, 6.2, 7.8, 9.6, 11.5];

function pickRadiusBucket(): number {
  const r = Math.random();
  if (r < 0.12) {
    // 12% large radiant stars
    const large = [9.6, 11.5];
    return large[Math.floor(Math.random() * large.length)];
  }
  if (r < 0.38) {
    // 26% medium stars
    const mid = [6.2, 7.8];
    return mid[Math.floor(Math.random() * mid.length)];
  }
  // 62% small crisp stars
  const small = [3.2, 4.0, 5.0];
  return small[Math.floor(Math.random() * small.length)];
}

function pickColorIndex(): ColorVariantIndex {
  const r = Math.random();
  // 55% luminous white-gold, 30% crisp diamond white, 15% pale sky blue
  if (r < 0.55) return 0;
  if (r < 0.85) return 1;
  return 2;
}

/**
 * Builds an offscreen canvas sprite of a refined 4-point star:
 * - Tiny bright core dot at the center
 * - Two thin perpendicular rays (vertical and horizontal needle spikes)
 * - Two shorter diagonal rays (45-degree angle diffraction spikes)
 * - Only a very subtle soft glow behind it
 */
function buildStarSprite(
  R: number,
  colorIdx: ColorVariantIndex,
  dpr: number
): SpriteEntry {
  const glowRadius = Math.ceil(1.6 * R + 2);
  const halfSize = Math.ceil(glowRadius + 2);
  const fullSize = halfSize * 2;

  const off = document.createElement('canvas');
  off.width = Math.round(fullSize * dpr);
  off.height = Math.round(fullSize * dpr);

  const octx = off.getContext('2d');
  if (!octx) {
    return { canvas: off, logicalHalfSize: halfSize };
  }

  octx.scale(dpr, dpr);
  const cx = halfSize;
  const cy = halfSize;

  // 1. Very subtle soft glow (tight radius, low opacity, clean radiance)
  const glowGrad = octx.createRadialGradient(cx, cy, 0, cx, cy, glowRadius);
  if (colorIdx === 0) {
    // Luminous warm gold
    glowGrad.addColorStop(0, 'rgba(233, 196, 106, 0.22)');
    glowGrad.addColorStop(0.5, 'rgba(233, 196, 106, 0.06)');
    glowGrad.addColorStop(1, 'rgba(233, 196, 106, 0)');
  } else if (colorIdx === 1) {
    // Pure diamond white / silver
    glowGrad.addColorStop(0, 'rgba(240, 246, 255, 0.24)');
    glowGrad.addColorStop(0.5, 'rgba(220, 235, 255, 0.06)');
    glowGrad.addColorStop(1, 'rgba(220, 235, 255, 0)');
  } else {
    // Icy celestial cyan
    glowGrad.addColorStop(0, 'rgba(127, 180, 230, 0.22)');
    glowGrad.addColorStop(0.5, 'rgba(127, 180, 230, 0.06)');
    glowGrad.addColorStop(1, 'rgba(127, 180, 230, 0)');
  }

  octx.fillStyle = glowGrad;
  octx.beginPath();
  octx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
  octx.fill();

  // 2. Thin rays radiating from center (perpendicular primary rays + shorter diagonal rays)
  const w = Math.max(0.65, 0.10 * R); // thin ray waist width

  octx.beginPath();
  // Vertical perpendicular ray
  octx.moveTo(cx, cy - R);
  octx.lineTo(cx + w, cy);
  octx.lineTo(cx, cy + R);
  octx.lineTo(cx - w, cy);
  octx.closePath();

  // Horizontal perpendicular ray
  octx.moveTo(cx - R, cy);
  octx.lineTo(cx, cy + w);
  octx.lineTo(cx + R, cy);
  octx.lineTo(cx, cy - w);
  octx.closePath();

  // Shorter diagonal rays (45 deg angle)
  if (R >= 3.8) {
    const Rdiag = 0.44 * R;
    const d = Rdiag * 0.7071;
    const wd = Math.max(0.38, 0.05 * R);

    // Diagonal ray: top-left to bottom-right
    octx.moveTo(cx - d, cy - d);
    octx.lineTo(cx + wd, cy - wd);
    octx.lineTo(cx + d, cy + d);
    octx.lineTo(cx - wd, cy + wd);
    octx.closePath();

    // Diagonal ray: top-right to bottom-left
    octx.moveTo(cx + d, cy - d);
    octx.lineTo(cx + wd, cy + wd);
    octx.lineTo(cx - d, cy + d);
    octx.lineTo(cx - wd, cy - wd);
    octx.closePath();
  }

  if (colorIdx === 0) {
    octx.fillStyle = 'rgba(245, 218, 140, 0.96)';
  } else if (colorIdx === 1) {
    octx.fillStyle = 'rgba(255, 255, 255, 0.98)';
  } else {
    octx.fillStyle = 'rgba(180, 218, 255, 0.96)';
  }
  octx.fill();

  // 3. Small, crisp, bright core dot at center
  const coreR = Math.max(0.75, 0.17 * R);
  octx.beginPath();
  octx.arc(cx, cy, coreR, 0, Math.PI * 2);
  octx.fillStyle = '#ffffff';
  octx.fill();

  return { canvas: off, logicalHalfSize: halfSize };
}

export const StarryBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { bgAnimated, theme } = useApp();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;
    let dpr = window.devicePixelRatio || 1;
    const peakAlpha = 1.0;

    let stars: RayStar[] = [];
    let fillerDots: FillerDot[] = [];
    let meteors: ShootingStar[] = [];
    let nextMeteorCooldown = randomBetween(2.0, 4.0);
    let spriteCache = new Map<string, SpriteEntry>();

    const buildSprites = (width: number) => {
      spriteCache.clear();
      const phoneScale = width <= 700 ? 0.8 : 1.0;
      for (const baseR of RADIUS_BUCKETS) {
        const effectiveR = baseR * phoneScale;
        for (const cIdx of [0, 1, 2] as ColorVariantIndex[]) {
          const key = `${baseR}_${cIdx}`;
          spriteCache.set(key, buildStarSprite(effectiveR, cIdx, dpr));
        }
      }
    };

    // Generates a uniform, natural distribution of stars scattered across the whole screen (not grouped)
    const createStarField = (width: number, height: number) => {
      const isMobile = width <= 700;
      const cols = isMobile ? 6 : 10;
      const rows = isMobile ? 7 : 8;
      const cellW = width / cols;
      const cellH = height / rows;

      const nextStars: RayStar[] = [];

      // 1. Grid jitter distribution ensures complete, non-grouped scatter across the screen
      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const x = (c + randomBetween(0.1, 0.9)) * cellW;
          const y = (r + randomBetween(0.1, 0.9)) * cellH;
          const baseR = pickRadiusBucket();
          const sizeRatio = (baseR - 3.2) / (11.5 - 3.2);
          const driftSpeed = 1.2 + sizeRatio * 2.3; // 1.2 to 3.5 px/s

          nextStars.push({
            x,
            y,
            baseR,
            colorIdx: pickColorIndex(),
            speed: randomBetween(0.6, 1.8),
            phase: randomBetween(0, Math.PI * 2),
            minAlpha: randomBetween(0.06, 0.16),
            maxAlpha: randomBetween(0.78, 0.98),
            driftSpeed,
            relocateTimer: randomBetween(10, 22),
          });
        }
      }

      // 2. Extra random stars to break any visual regularity
      const extraCount = isMobile ? 8 : 18;
      for (let i = 0; i < extraCount; i++) {
        const baseR = pickRadiusBucket();
        const sizeRatio = (baseR - 3.2) / (11.5 - 3.2);
        const driftSpeed = 1.2 + sizeRatio * 2.3;

        nextStars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          baseR,
          colorIdx: pickColorIndex(),
          speed: randomBetween(0.6, 1.8),
          phase: randomBetween(0, Math.PI * 2),
          minAlpha: randomBetween(0.06, 0.16),
          maxAlpha: randomBetween(0.78, 0.98),
          driftSpeed,
          relocateTimer: randomBetween(10, 22),
        });
      }

      stars = nextStars;

      // Faint filler dots for celestial depth
      const fillerCount = isMobile ? 25 : 50;
      const nextFillers: FillerDot[] = [];
      for (let i = 0; i < fillerCount; i++) {
        nextFillers.push({
          x: Math.random() * width,
          y: Math.random() * height,
          driftSpeed: randomBetween(1.2, 2.5),
        });
      }
      fillerDots = nextFillers;
    };

    const syncCanvasSize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
    };

    syncCanvasSize();
    buildSprites(W);
    createStarField(W, H);

    const drawBaseGradient = () => {
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#050a15');
      bgGrad.addColorStop(0.5, '#0b1220');
      bgGrad.addColorStop(1, '#0f1c36');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);
    };

    const drawNebula = () => {
      const nebRadius = W * 0.45;

      // 1st nebula at 20% / 30%
      const neb1X = W * 0.2;
      const neb1Y = H * 0.3;
      const neb1 = ctx.createRadialGradient(neb1X, neb1Y, 0, neb1X, neb1Y, nebRadius);
      neb1.addColorStop(0, 'rgba(127, 180, 230, 0.07)');
      neb1.addColorStop(1, 'rgba(127, 180, 230, 0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, W, H);

      // 2nd nebula at 80% / 75%
      const neb2X = W * 0.8;
      const neb2Y = H * 0.75;
      const neb2 = ctx.createRadialGradient(neb2X, neb2Y, 0, neb2X, neb2Y, nebRadius);
      neb2.addColorStop(0, 'rgba(233, 196, 106, 0.05)');
      neb2.addColorStop(1, 'rgba(233, 196, 106, 0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);
    };

    const drawFillerDots = () => {
      ctx.save();
      ctx.fillStyle = 'rgba(214, 226, 250, 0.25)';
      for (let i = 0; i < fillerDots.length; i++) {
        const d = fillerDots[i];
        ctx.fillRect(d.x, d.y, 1, 1);
      }
      ctx.restore();
    };

    // Gently twinkling in and out: smooth sinus curve with subtle breathing scale
    const drawStars = (timeSec: number, isStatic: boolean) => {
      ctx.save();
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        let alpha: number;
        let scale: number;

        if (isStatic) {
          alpha = 0.68;
          scale = 1.0;
        } else {
          // Continuous smooth wave between 0 and 1
          const sinVal = Math.sin(timeSec * st.speed + st.phase);
          const wave = 0.5 + 0.5 * sinVal;
          // Smooth breathing curve between gentle min and peak
          const rawAlpha = st.minAlpha + (st.maxAlpha - st.minAlpha) * Math.pow(wave, 1.3);
          alpha = rawAlpha * peakAlpha;
          scale = 0.82 + 0.18 * wave;
        }

        if (alpha <= 0.01) continue;

        const sprite = spriteCache.get(`${st.baseR}_${st.colorIdx}`);
        if (!sprite) continue;

        const drawHalf = sprite.logicalHalfSize * scale;
        const drawSize = drawHalf * 2;

        ctx.globalAlpha = alpha;
        ctx.drawImage(
          sprite.canvas,
          st.x - drawHalf,
          st.y - drawHalf,
          drawSize,
          drawSize
        );
      }
      ctx.restore();
    };

    // Shooting stars preserved exactly
    const spawnMeteor = () => {
      if (meteors.length >= 2) return;
      const angleDeg = randomBetween(200, 230);
      const angleRad = (angleDeg * Math.PI) / 180;
      const speed = randomBetween(500, 800);
      const vx = Math.cos(angleRad) * speed;
      const vy = -Math.sin(angleRad) * speed;

      meteors.push({
        x: randomBetween(W * 0.25, W * 0.95),
        y: randomBetween(H * 0.02, H * 0.6),
        vx,
        vy,
        tailLength: randomBetween(120, 220),
        elapsed: 0,
        duration: randomBetween(0.8, 1.4),
      });
    };

    const drawMeteors = () => {
      for (let i = 0; i < meteors.length; i++) {
        const m = meteors[i];
        const progress = m.elapsed / m.duration;
        if (progress <= 0 || progress >= 1) continue;

        let lifeAlpha = 1;
        if (progress < 0.15) {
          lifeAlpha = progress / 0.15;
        } else if (progress > 0.7) {
          lifeAlpha = (1 - progress) / 0.3;
        }
        lifeAlpha = Math.max(0, Math.min(1, lifeAlpha));

        const speedLen = Math.hypot(m.vx, m.vy) || 1;
        const dirX = m.vx / speedLen;
        const dirY = m.vy / speedLen;

        const tailX = m.x - dirX * m.tailLength;
        const tailY = m.y - dirY * m.tailLength;

        ctx.save();
        const tailGrad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        tailGrad.addColorStop(0, `rgba(255, 255, 255, ${(0.95 * lifeAlpha).toFixed(3)})`);
        tailGrad.addColorStop(0.35, `rgba(233, 196, 106, ${(0.55 * lifeAlpha).toFixed(3)})`);
        tailGrad.addColorStop(1, 'rgba(233, 196, 106, 0)');

        ctx.strokeStyle = tailGrad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();

        ctx.shadowBlur = 8;
        ctx.shadowColor = `rgba(233, 196, 106, ${(0.8 * lifeAlpha).toFixed(3)})`;
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.95 * lifeAlpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const renderStaticScene = (includeStars: boolean) => {
      ctx.save();
      ctx.scale(dpr, dpr);
      drawBaseGradient();
      if (includeStars) {
        drawNebula();
        drawFillerDots();
        drawStars(0, true);
      }
      ctx.restore();
    };

    // If user turned off "الخلفية المتحركة", draw only the static gradient
    if (!bgAnimated) {
      renderStaticScene(false);
      const handleStaticResize = () => {
        syncCanvasSize();
        renderStaticScene(false);
      };
      window.addEventListener('resize', handleStaticResize);
      return () => {
        window.removeEventListener('resize', handleStaticResize);
      };
    }

    // If prefers-reduced-motion is enabled: draw static stars without motion
    if (prefersReducedMotion) {
      renderStaticScene(true);
      let resizeTimer: ReturnType<typeof setTimeout> | null = null;
      const handleReducedResize = () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          syncCanvasSize();
          buildSprites(W);
          createStarField(W, H);
          renderStaticScene(true);
        }, 200);
      };
      window.addEventListener('resize', handleReducedResize);
      return () => {
        if (resizeTimer) clearTimeout(resizeTimer);
        window.removeEventListener('resize', handleReducedResize);
      };
    }

    // Draw initial frame immediately
    ctx.save();
    ctx.scale(dpr, dpr);
    drawBaseGradient();
    drawNebula();
    drawFillerDots();
    drawStars(0, false);
    ctx.restore();

    // Animated loop (capped at 60fps)
    let rAFId: number | null = null;
    let isPaused = document.hidden;
    let lastRenderMs = performance.now();
    let totalTimeSec = 0;
    let slowFramesCount = 0;
    let hasReducedStars = false;
    const MIN_FRAME_MS = 1000 / 62;

    const tick = (nowMs: number) => {
      if (isPaused) return;
      rAFId = requestAnimationFrame(tick);

      const deltaMs = nowMs - lastRenderMs;
      if (deltaMs < MIN_FRAME_MS) return;

      const frameStartMs = performance.now();
      const dt = Math.min(0.1, deltaMs / 1000);
      lastRenderMs = nowMs;
      totalTimeSec += dt;

      // Update star slow drift and repositioning
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        st.x -= st.driftSpeed * dt;
        if (st.x < -30) {
          st.x += W + 60;
        }

        st.relocateTimer -= dt;
        if (st.relocateTimer <= 0) {
          const sinVal = Math.sin(totalTimeSec * st.speed + st.phase);
          if (sinVal < -0.8) {
            st.x = Math.random() * W;
            st.y = Math.random() * H;
            st.relocateTimer = randomBetween(10, 22);
          }
        }
      }

      // Update faint filler dots drift
      for (let i = 0; i < fillerDots.length; i++) {
        const fd = fillerDots[i];
        fd.x -= fd.driftSpeed * dt;
        if (fd.x < -5) {
          fd.x += W + 10;
        }
      }

      // Update shooting stars
      nextMeteorCooldown -= dt;
      if (nextMeteorCooldown <= 0) {
        spawnMeteor();
        nextMeteorCooldown = randomBetween(3, 7);
      }

      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.elapsed += dt;
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        if (m.elapsed >= m.duration || m.x < -250 || m.y > H + 250) {
          meteors.splice(i, 1);
        }
      }

      // Render layers
      ctx.save();
      ctx.scale(dpr, dpr);
      drawBaseGradient();
      drawNebula();
      drawFillerDots();
      drawStars(totalTimeSec, false);
      drawMeteors();
      ctx.restore();

      // Performance check: if frame budget exceeded, throttle smoothly
      const renderCostMs = performance.now() - frameStartMs;
      if (!hasReducedStars) {
        if (renderCostMs > 20) {
          slowFramesCount++;
          if (slowFramesCount >= 30) {
            stars.length = Math.max(16, Math.floor(stars.length * 0.7));
            hasReducedStars = true;
          }
        } else {
          slowFramesCount = 0;
        }
      }
    };

    rAFId = requestAnimationFrame(tick);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isPaused = true;
        if (rAFId !== null) {
          cancelAnimationFrame(rAFId);
          rAFId = null;
        }
      } else {
        isPaused = false;
        lastRenderMs = performance.now();
        if (rAFId === null) {
          rAFId = requestAnimationFrame(tick);
        }
      }
    };

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        syncCanvasSize();
        buildSprites(W);
        createStarField(W, H);
        meteors = [];
      }, 200);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', handleResize);

    return () => {
      if (rAFId !== null) {
        cancelAnimationFrame(rAFId);
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
    };
  }, [bgAnimated, theme]);

  return (
    <canvas
      id="bg-sky"
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
};

export default StarryBackground;
