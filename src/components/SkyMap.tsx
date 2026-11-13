import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import staticMapData from '../anwaa_map_data.json';
import { computeAltAz, getHorizonCircleRADec } from '../data/anwaaData';

export interface StarEntry {
  n: number;
  name: string;
  type: 'mansion' | 'famous';
  points: [number, number][];
}

export interface SkyMapData {
  stars: [number, number, number][];
  lines: [number, number][][];
  ours: StarEntry[];
}

export interface TonightSkyParams {
  active: boolean;
  lat: number;
  lon: number;
  LST: number;
}

export interface SkyMapProps {
  onSelect?: (n: number) => void;
  initialSelected?: number | null;
  favorites?: number[];
  tonightSky?: TonightSkyParams | null;
  onToggleTonightSky?: () => void;
}

export interface SkyMapHandle {
  selectStar: (n: number) => void;
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setCustomView: (ra: number, dec: number, fov: number) => void;
}

interface ViewState {
  ra: number;  // [0, 360)
  dec: number; // [-89, 89]
  fov: number; // [4, 100] half-height of view in degrees
}

interface ProjectedPoint {
  x: number;
  y: number;
  cosc: number;
}

interface LabelBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const INITIAL_VIEW: ViewState = {
  ra: 190,
  dec: 20,
  fov: 75,
};

const DASHED_GROUP_NS = new Set([1, 7, 21, 23, 34, 35, 37, 38]);

export const SkyMap = forwardRef<SkyMapHandle, SkyMapProps>(
  (
    {
      onSelect,
      initialSelected = null,
      favorites = [],
      tonightSky = null,
      onToggleTonightSky,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const viewRef = useRef<ViewState>({ ...INITIAL_VIEW });
    const selectedNRef = useRef<number | null>(initialSelected);
    const [, setSelectedN] = useState<number | null>(initialSelected);

    // Toolbar toggles: "أشكال العرب" (default ON) and "خطوط الأبراج" (default ON)
    const [showArabShapes, setShowArabShapes] = useState<boolean>(true);
    const [showConstellationLines, setShowConstellationLines] = useState<boolean>(true);

    const showArabShapesRef = useRef<boolean>(true);
    showArabShapesRef.current = showArabShapes;

    const showConstellationLinesRef = useRef<boolean>(true);
    showConstellationLinesRef.current = showConstellationLines;

    const favoritesRef = useRef<number[]>(favorites);
    favoritesRef.current = favorites;

    const tonightSkyRef = useRef<TonightSkyParams | null>(tonightSky);
    tonightSkyRef.current = tonightSky;

    const [dataState] = useState<{
      data: SkyMapData | null;
      error: string | null;
    }>(() => {
      try {
        if (
          staticMapData &&
          Array.isArray((staticMapData as unknown as SkyMapData).stars) &&
          Array.isArray((staticMapData as unknown as SkyMapData).lines) &&
          Array.isArray((staticMapData as unknown as SkyMapData).ours)
        ) {
          return { data: staticMapData as unknown as SkyMapData, error: null };
        }
        return { data: null, error: 'بيانات النجوم غير صالحة' };
      } catch (err) {
        console.error('Failed to load sky map data:', err);
        return { data: null, error: 'تعذّر تحميل بيانات النجوم' };
      }
    });

    const mapDataRef = useRef<SkyMapData | null>(dataState.data);
    mapDataRef.current = dataState.data;

    const animFrameRef = useRef<number | null>(null);
    const transitionRef = useRef<{
      startTime: number;
      duration: number;
      startRA: number;
      diffRA: number;
      startDec: number;
      endDec: number;
      startFov: number;
      endFov: number;
    } | null>(null);

    const isPointerDownRef = useRef(false);
    const isDraggingRef = useRef(false);
    const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isGrabbing, setIsGrabbing] = useState(false);

    const pinchDistRef = useRef<number | null>(null);

    // Sync external initialSelected updates
    useEffect(() => {
      if (initialSelected !== undefined && initialSelected !== selectedNRef.current) {
        selectedNRef.current = initialSelected;
        setSelectedN(initialSelected);
        drawRef.current();
      }
    }, [initialSelected]);

    const project = useCallback(
      (raDeg: number, decDeg: number, W: number, H: number, v: ViewState): ProjectedPoint | null => {
        const ra0_rad = (v.ra * Math.PI) / 180;
        const dec0_rad = (v.dec * Math.PI) / 180;
        const fov_rad = (v.fov * Math.PI) / 180;

        const ra_rad = (raDeg * Math.PI) / 180;
        const d = (decDeg * Math.PI) / 180;
        const a = ra_rad - ra0_rad;

        const s0 = Math.sin(dec0_rad);
        const c0 = Math.cos(dec0_rad);

        const cosc = s0 * Math.sin(d) + c0 * Math.cos(d) * Math.cos(a);
        if (cosc < -0.45) return null;

        const k = 2 / (1 + cosc);
        const x = k * Math.cos(d) * Math.sin(a);
        const y = k * (c0 * Math.sin(d) - s0 * Math.cos(d) * Math.cos(a));

        const Rv = (H / 2) / (2 * Math.tan(fov_rad / 2));
        const screenX = W / 2 - x * Rv;
        const screenY = H / 2 - y * Rv;

        return { x: screenX, y: screenY, cosc };
      },
      []
    );

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const data = mapDataRef.current;
      if (!data) return;

      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      if (W <= 0 || H <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      const bufferW = Math.round(W * dpr);
      const bufferH = Math.round(H * dpr);

      if (canvas.width !== bufferW || canvas.height !== bufferH) {
        canvas.width = bufferW;
        canvas.height = bufferH;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const v = viewRef.current;
      const currentSelected = selectedNRef.current;
      const favSet = new Set(favoritesRef.current);
      const tSky = tonightSkyRef.current;
      const isTonightActive = Boolean(tSky && tSky.active);

      const isBelowHorizon = (ra: number, dec: number): boolean => {
        if (!isTonightActive || !tSky) return false;
        const { alt } = computeAltAz(ra, dec, tSky.lat, tSky.LST);
        return alt < 0;
      };

      // 1. Background vertical gradient #050a15 -> #0c1730
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, '#050a15');
      bgGrad.addColorStop(1, '#0c1730');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      const maxDistSq = Math.pow(Math.max(W, H) * 0.8, 2);

      // 2. Western Constellation lines (when "خطوط الأبراج" is ON)
      if (showConstellationLinesRef.current) {
        ctx.strokeStyle = 'rgba(110, 140, 195, 0.32)';
        ctx.lineWidth = 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash([]);

        for (let l = 0; l < data.lines.length; l++) {
          const line = data.lines[l];
          if (!line || line.length < 2) continue;

          ctx.beginPath();
          let isDrawing = false;
          let lastX = 0;
          let lastY = 0;

          for (let i = 0; i < line.length; i++) {
            const pt = project(line[i][0], line[i][1], W, H, v);
            if (!pt) {
              isDrawing = false;
              continue;
            }

            if (!isDrawing) {
              ctx.moveTo(pt.x, pt.y);
              isDrawing = true;
              lastX = pt.x;
              lastY = pt.y;
            } else {
              const distSq = (pt.x - lastX) * (pt.x - lastX) + (pt.y - lastY) * (pt.y - lastY);
              if (distSq > maxDistSq) {
                ctx.moveTo(pt.x, pt.y);
              } else {
                ctx.lineTo(pt.x, pt.y);
              }
              lastX = pt.x;
              lastY = pt.y;
            }
          }
          ctx.stroke();
        }
      }

      // 2b. Horizon circle when "سماء الآن" is active: altitude 0, rgba(233,196,106,0.35)
      if (isTonightActive && tSky) {
        const horizonPts = getHorizonCircleRADec(tSky.lat, tSky.LST, 120);
        ctx.save();
        ctx.strokeStyle = 'rgba(233, 196, 106, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.beginPath();
        let drawingH = false;
        let prevX = 0;
        let prevY = 0;
        for (const [hra, hdec] of horizonPts) {
          const pt = project(hra, hdec, W, H, v);
          if (!pt) {
            drawingH = false;
            continue;
          }
          if (!drawingH) {
            ctx.moveTo(pt.x, pt.y);
            drawingH = true;
          } else {
            const dSq = (pt.x - prevX) ** 2 + (pt.y - prevY) ** 2;
            if (dSq > maxDistSq) {
              ctx.moveTo(pt.x, pt.y);
            } else {
              ctx.lineTo(pt.x, pt.y);
            }
          }
          prevX = pt.x;
          prevY = pt.y;
        }
        ctx.stroke();
        ctx.restore();
      }

      // 3. Catalog stars: circle radius max(0.5,(6.0-mag)*0.55*zf), zf=clamp(60/fov,0.8,2.4); fill rgba(214,226,250,min(1,0.45+(5.3-mag)*0.16))
      const zf = Math.max(0.8, Math.min(2.4, 60 / v.fov));
      for (let s = 0; s < data.stars.length; s++) {
        const [ra, dec, mag] = data.stars[s];
        const pt = project(ra, dec, W, H, v);
        if (!pt) continue;

        if (pt.x < -10 || pt.x > W + 10 || pt.y < -10 || pt.y > H + 10) continue;

        const radius = Math.max(0.5, (6.0 - mag) * 0.55 * zf);
        let alpha = Math.min(1, 0.45 + (5.3 - mag) * 0.16);
        if (isBelowHorizon(ra, dec)) {
          alpha = 0.35 * alpha;
        }

        ctx.fillStyle = `rgba(214, 226, 250, ${alpha})`;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3b. "أشكال العرب" lines (drawn UNDER the glow dots)
      if (showArabShapesRef.current) {
        const drawIndexedPolyline = (
          pts: [number, number][],
          indices: number[],
          color: string,
          lineWidth: number,
          dash: number[]
        ) => {
          ctx.save();
          ctx.strokeStyle = color;
          ctx.lineWidth = lineWidth;
          ctx.setLineDash(dash);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          let started = false;
          let lastX = 0;
          let lastY = 0;
          for (const idx of indices) {
            const p = pts[idx];
            if (!p) continue;
            const proj = project(p[0], p[1], W, H, v);
            if (!proj) {
              started = false;
              continue;
            }
            if (!started) {
              ctx.moveTo(proj.x, proj.y);
              started = true;
            } else {
              const dSq = (proj.x - lastX) ** 2 + (proj.y - lastY) ** 2;
              if (dSq > maxDistSq) {
                ctx.moveTo(proj.x, proj.y);
              } else {
                ctx.lineTo(proj.x, proj.y);
              }
            }
            lastX = proj.x;
            lastY = proj.y;
          }
          ctx.stroke();
          ctx.restore();
        };

        for (const entry of data.ours) {
          if (entry.n === 39 && entry.points.length >= 7) {
            drawIndexedPolyline(
              entry.points,
              [0, 3, 4, 5, 6, 2, 1, 5],
              'rgba(233, 196, 106, 0.85)',
              1.6,
              []
            );
          } else if (entry.n === 40 && entry.points.length >= 7) {
            drawIndexedPolyline(
              entry.points,
              [0, 1, 2, 3, 0],
              'rgba(233, 196, 106, 0.85)',
              1.6,
              []
            );
            drawIndexedPolyline(
              entry.points,
              [3, 4, 5, 6],
              'rgba(233, 196, 106, 0.85)',
              1.6,
              []
            );
          } else if (DASHED_GROUP_NS.has(entry.n) && entry.points.length >= 2) {
            const indices = entry.points.map((_, idx) => idx);
            drawIndexedPolyline(
              entry.points,
              indices,
              'rgba(233, 196, 106, 0.55)',
              1.2,
              [4, 4]
            );
          }
        }
      }

      // 4. Highlighted "ours" stars
      const sortedOurs = [...data.ours].sort((a, b) => {
        if (a.n === currentSelected) return 1;
        if (b.n === currentSelected) return -1;
        return 0;
      });

      for (let o = 0; o < sortedOurs.length; o++) {
        const entry = sortedOurs[o];
        const isSelected = entry.n === currentSelected;
        const isFav = favSet.has(entry.n);

        const r = isSelected ? 255 : entry.type === 'mansion' ? 233 : 127;
        const g = isSelected ? 255 : entry.type === 'mansion' ? 196 : 180;
        const b = isSelected ? 255 : entry.type === 'mansion' ? 106 : 230;

        const glowRadius = isSelected ? 34 : 24;
        const baseCenterAlpha = isSelected ? 0.85 : 0.6;
        const dotRadius = isSelected ? 4.2 : 3.0;

        for (let p = 0; p < entry.points.length; p++) {
          const [ra, dec] = entry.points[p];
          const pt = project(ra, dec, W, H, v);
          if (!pt) continue;

          if (pt.x < -40 || pt.x > W + 40 || pt.y < -40 || pt.y > H + 40) continue;

          const below = isBelowHorizon(ra, dec);
          const dimFactor = below ? 0.35 : 1.0;
          const centerAlpha = baseCenterAlpha * dimFactor;

          // Radial glow
          const glowGrad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, glowRadius);
          glowGrad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${centerAlpha})`);
          glowGrad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, glowRadius, 0, Math.PI * 2);
          ctx.fill();

          // Solid dot
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dimFactor})`;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          // Favorited stars: thin gold ring (1.2px, radius 14px)
          if (isFav) {
            ctx.save();
            ctx.strokeStyle = `rgba(233, 196, 106, ${dimFactor})`;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // Selected 1.2px white ring radius 9px
          if (isSelected) {
            ctx.save();
            ctx.strokeStyle = `rgba(255, 255, 255, ${dimFactor})`;
            ctx.lineWidth = 1.2;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, 9, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      // 5. Arabic labels (first name before "،"), font 700 14px Amiri
      ctx.font = '700 14px "Amiri", serif';
      ctx.lineJoin = 'round';
      ctx.miterLimit = 2;

      const placedBoxes: LabelBox[] = [];

      const labelOrderedOurs = [...data.ours].sort((a, b) => {
        if (a.n === currentSelected) return -1;
        if (b.n === currentSelected) return 1;
        return 0;
      });

      const labelOffset = 12;
      const offsetCandidates = [
        { dx: labelOffset, dy: -labelOffset, align: 'left' as CanvasTextAlign, baseline: 'bottom' as CanvasTextBaseline },
        { dx: -labelOffset, dy: -labelOffset, align: 'right' as CanvasTextAlign, baseline: 'bottom' as CanvasTextBaseline },
        { dx: labelOffset, dy: labelOffset, align: 'left' as CanvasTextAlign, baseline: 'top' as CanvasTextBaseline },
        { dx: -labelOffset, dy: labelOffset, align: 'right' as CanvasTextAlign, baseline: 'top' as CanvasTextBaseline },
      ];

      for (let i = 0; i < labelOrderedOurs.length; i++) {
        const entry = labelOrderedOurs[i];
        const isSelected = entry.n === currentSelected;

        const cleanName = entry.name.split(/[،,]/)[0].trim();
        if (!cleanName) continue;

        let sumX = 0;
        let sumY = 0;
        let count = 0;

        for (let p = 0; p < entry.points.length; p++) {
          const pt = project(entry.points[p][0], entry.points[p][1], W, H, v);
          if (pt) {
            sumX += pt.x;
            sumY += pt.y;
            count++;
          }
        }

        if (count === 0) continue;
        const cx = sumX / count;
        const cy = sumY / count;

        const below = isBelowHorizon(entry.points[0][0], entry.points[0][1]);
        const dimFactor = below ? 0.35 : 1.0;

        const metrics = ctx.measureText(cleanName);
        const textWidth = metrics.width;
        const textHeight = 16;

        for (let o = 0; o < offsetCandidates.length; o++) {
          const off = offsetCandidates[o];
          const anchorX = cx + off.dx;
          const anchorY = cy + off.dy;

          let boxLeft = 0;
          let boxRight = 0;
          let boxTop = 0;
          let boxBottom = 0;

          if (off.align === 'left') {
            boxLeft = anchorX;
            boxRight = anchorX + textWidth;
          } else {
            boxLeft = anchorX - textWidth;
            boxRight = anchorX;
          }

          if (off.baseline === 'bottom') {
            boxBottom = anchorY;
            boxTop = anchorY - textHeight;
          } else {
            boxTop = anchorY;
            boxBottom = anchorY + textHeight;
          }

          if (boxLeft < 4 || boxRight > W - 4 || boxTop < 4 || boxBottom > H - 4) {
            continue;
          }

          let overlaps = false;
          for (let b = 0; b < placedBoxes.length; b++) {
            const pb = placedBoxes[b];
            if (!(boxRight < pb.left || boxLeft > pb.right || boxBottom < pb.top || boxTop > pb.bottom)) {
              overlaps = true;
              break;
            }
          }

          if (overlaps) continue;

          placedBoxes.push({
            left: boxLeft - 2,
            right: boxRight + 2,
            top: boxTop - 2,
            bottom: boxBottom + 2,
          });

          ctx.save();
          ctx.globalAlpha = dimFactor;
          ctx.textAlign = off.align;
          ctx.textBaseline = off.baseline;

          ctx.strokeStyle = 'rgba(5, 10, 21, 0.9)';
          ctx.lineWidth = 3;
          ctx.strokeText(cleanName, anchorX, anchorY);

          ctx.fillStyle = isSelected
            ? '#ffffff'
            : entry.type === 'mansion'
            ? 'rgb(233, 196, 106)'
            : 'rgb(127, 180, 230)';
          ctx.fillText(cleanName, anchorX, anchorY);
          ctx.restore();

          break;
        }
      }

      ctx.restore();
    }, [project]);

    const drawRef = useRef(draw);
    drawRef.current = draw;

    useEffect(() => {
      drawRef.current();
    }, [showArabShapes, showConstellationLines, favorites, tonightSky]);

    // Ensure 'Amiri' font is loaded so canvas measureText and rendering use the exact font
    useEffect(() => {
      if (typeof document !== 'undefined' && document.fonts && document.fonts.load) {
        Promise.all([
          document.fonts.load('700 14px "Amiri"'),
          document.fonts.load('bold 14px "Amiri"'),
          document.fonts.load('400 14px "Amiri"'),
          document.fonts.ready,
        ])
          .then(() => {
            drawRef.current();
          })
          .catch(() => {
            drawRef.current();
          });
      }
    }, []);

    const onTick = useCallback((now: number) => {
      animFrameRef.current = null;

      if (transitionRef.current) {
        const tr = transitionRef.current;
        const elapsed = now - tr.startTime;
        const t = Math.min(1, Math.max(0, elapsed / tr.duration));
        const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        viewRef.current.ra = (((tr.startRA + tr.diffRA * ease) % 360) + 360) % 360;
        viewRef.current.dec = tr.startDec + (tr.endDec - tr.startDec) * ease;
        viewRef.current.fov = tr.startFov + (tr.endFov - tr.startFov) * ease;

        drawRef.current();

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(onTick);
        } else {
          transitionRef.current = null;
        }
      } else {
        drawRef.current();
      }
    }, []);

    const requestRender = useCallback(() => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
      animFrameRef.current = requestAnimationFrame(onTick);
    }, [onTick]);

    const setCustomView = useCallback(
      (targetRA: number, targetDec: number, targetFov: number) => {
        const wrappedRA = ((targetRA % 360) + 360) % 360;
        const clampedDec = Math.max(-89, Math.min(89, targetDec));
        const clampedFov = Math.max(4, Math.min(100, targetFov));

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (prefersReducedMotion) {
          viewRef.current.ra = wrappedRA;
          viewRef.current.dec = clampedDec;
          viewRef.current.fov = clampedFov;
          drawRef.current();
          return;
        }

        const currentRA = viewRef.current.ra;
        const diffRA = ((wrappedRA - currentRA + 540) % 360) - 180;

        transitionRef.current = {
          startTime: performance.now(),
          duration: 650,
          startRA: currentRA,
          diffRA,
          startDec: viewRef.current.dec,
          endDec: clampedDec,
          startFov: viewRef.current.fov,
          endFov: clampedFov,
        };
        requestRender();
      },
      [requestRender]
    );

    const selectStar = useCallback(
      (n: number) => {
        const data = mapDataRef.current;
        if (!data) return;

        const entry = data.ours.find((item) => item.n === n);
        if (!entry || entry.points.length === 0) return;

        selectedNRef.current = n;
        setSelectedN(n);

        let sumX = 0;
        let sumY = 0;
        let sumZ = 0;

        for (let i = 0; i < entry.points.length; i++) {
          const [ra, dec] = entry.points[i];
          const raRad = (ra * Math.PI) / 180;
          const decRad = (dec * Math.PI) / 180;
          sumX += Math.cos(decRad) * Math.cos(raRad);
          sumY += Math.cos(decRad) * Math.sin(raRad);
          sumZ += Math.sin(decRad);
        }

        const norm = Math.hypot(sumX, sumY, sumZ);
        if (norm === 0) return;

        const targetDec = (Math.asin(sumZ / norm) * 180) / Math.PI;
        let targetRA = (Math.atan2(sumY, sumX) * 180) / Math.PI;
        targetRA = ((targetRA % 360) + 360) % 360;

        let maxAngularSpan = 0;
        if (entry.points.length > 1) {
          for (let i = 0; i < entry.points.length; i++) {
            for (let j = i + 1; j < entry.points.length; j++) {
              const [ra1, dec1] = entry.points[i];
              const [ra2, dec2] = entry.points[j];
              const r1 = (ra1 * Math.PI) / 180;
              const d1 = (dec1 * Math.PI) / 180;
              const r2 = (ra2 * Math.PI) / 180;
              const d2 = (dec2 * Math.PI) / 180;
              const cosDist =
                Math.sin(d1) * Math.sin(d2) + Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);
              const distDeg = (Math.acos(Math.max(-1, Math.min(1, cosDist))) * 180) / Math.PI;
              if (distDeg > maxAngularSpan) maxAngularSpan = distDeg;
            }
          }
        }

        const targetFov = Math.max(16, Math.min(40, maxAngularSpan * 2.2 + 10));
        setCustomView(targetRA, targetDec, targetFov);
      },
      [setCustomView]
    );

    const resetView = useCallback(() => {
      selectedNRef.current = null;
      setSelectedN(null);
      setCustomView(INITIAL_VIEW.ra, INITIAL_VIEW.dec, INITIAL_VIEW.fov);
    }, [setCustomView]);

    const zoomIn = useCallback(() => {
      transitionRef.current = null;
      viewRef.current.fov = Math.max(4, Math.min(100, viewRef.current.fov * 0.7));
      drawRef.current();
    }, []);

    const zoomOut = useCallback(() => {
      transitionRef.current = null;
      viewRef.current.fov = Math.max(4, Math.min(100, viewRef.current.fov / 0.7));
      drawRef.current();
    }, []);

    useImperativeHandle(ref, () => ({
      selectStar,
      resetView,
      zoomIn,
      zoomOut,
      setCustomView,
    }));

    useEffect(() => {
      (window as unknown as { selectStar?: (n: number) => void }).selectStar = (n: number) => {
        selectStar(n);
      };
      return () => {
        delete (window as unknown as { selectStar?: (n: number) => void }).selectStar;
      };
    }, [selectStar]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      drawRef.current();
      const rAF = requestAnimationFrame(() => {
        drawRef.current();
      });

      const ro = new ResizeObserver(() => {
        drawRef.current();
      });
      ro.observe(canvas);

      const handleWinResize = () => {
        drawRef.current();
      };
      window.addEventListener('resize', handleWinResize);

      if (document.fonts) {
        document.fonts.ready.then(() => {
          drawRef.current();
        });
      }

      return () => {
        cancelAnimationFrame(rAF);
        ro.disconnect();
        window.removeEventListener('resize', handleWinResize);
      };
    }, [dataState.data]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        transitionRef.current = null;
        viewRef.current.fov = Math.max(
          4,
          Math.min(100, viewRef.current.fov * Math.exp(e.deltaY * 0.0015))
        );
        drawRef.current();
      };

      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(e.pointerId);
      isPointerDownRef.current = true;
      isDraggingRef.current = false;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      transitionRef.current = null;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isPointerDownRef.current) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const clientX = e.clientX;
      const clientY = e.clientY;

      const dist = Math.hypot(clientX - dragStartRef.current.x, clientY - dragStartRef.current.y);

      if (!isDraggingRef.current && dist > 5) {
        isDraggingRef.current = true;
        setIsGrabbing(true);
      }

      if (isDraggingRef.current) {
        const dx = clientX - lastPointerRef.current.x;
        const dy = clientY - lastPointerRef.current.y;

        const rect = canvas.getBoundingClientRect();
        const H = rect.height;
        const fov_rad = (viewRef.current.fov * Math.PI) / 180;
        const Rv = (H / 2) / (2 * Math.tan(fov_rad / 2));
        const dec0_rad = (viewRef.current.dec * Math.PI) / 180;

        viewRef.current.ra += (dx * (180 / Math.PI / Rv)) / Math.max(0.2, Math.cos(dec0_rad));
        viewRef.current.dec += dy * (180 / Math.PI / Rv);

        viewRef.current.dec = Math.max(-89, Math.min(89, viewRef.current.dec));
        viewRef.current.ra = ((viewRef.current.ra % 360) + 360) % 360;

        drawRef.current();
      }

      lastPointerRef.current = { x: clientX, y: clientY };
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }

      const wasDragging = isDraggingRef.current;
      isPointerDownRef.current = false;
      isDraggingRef.current = false;
      setIsGrabbing(false);

      if (!wasDragging && canvas) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const W = rect.width;
        const H = rect.height;

        const data = mapDataRef.current;
        if (!data) return;
        const v = viewRef.current;

        interface HitCandidate {
          entry: StarEntry;
          dist: number;
          ptX: number;
          ptY: number;
        }

        const hits: HitCandidate[] = [];

        for (let i = 0; i < data.ours.length; i++) {
          const entry = data.ours[i];
          let bestDist = Infinity;
          let bestPt: ProjectedPoint | null = null;

          for (let p = 0; p < entry.points.length; p++) {
            const pt = project(entry.points[p][0], entry.points[p][1], W, H, v);
            if (!pt) continue;
            const d = Math.hypot(pt.x - clickX, pt.y - clickY);
            if (d < bestDist) {
              bestDist = d;
              bestPt = pt;
            }
          }

          if (bestDist <= 16 && bestPt) {
            hits.push({
              entry,
              dist: bestDist,
              ptX: bestPt.x,
              ptY: bestPt.y,
            });
          }
        }

        if (hits.length > 0) {
          hits.sort((a, b) => a.dist - b.dist);
          const nearest = hits[0];

          const shared = hits.filter(
            (h) => Math.hypot(h.ptX - nearest.ptX, h.ptY - nearest.ptY) <= 3
          );

          const currentSel = selectedNRef.current;
          const idx = shared.findIndex((s) => s.entry.n === currentSel);

          let chosen: StarEntry;
          if (idx >= 0) {
            chosen = shared[(idx + 1) % shared.length].entry;
          } else {
            chosen = shared[0].entry;
          }

          selectStar(chosen.n);
          onSelect?.(chosen.n);
        }
      }
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 2) {
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          pinchDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 2 && pinchDistRef.current !== null) {
          e.preventDefault();
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          if (currentDist > 0 && pinchDistRef.current > 0) {
            const ratio = pinchDistRef.current / currentDist;
            viewRef.current.fov = Math.max(4, Math.min(100, viewRef.current.fov * ratio));
            drawRef.current();
            pinchDistRef.current = currentDist;
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (e.touches.length < 2) {
          pinchDistRef.current = null;
        }
      };

      canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd, { passive: true });
      canvas.addEventListener('touchcancel', handleTouchEnd, { passive: true });

      return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchEnd);
      };
    }, []);

    if (dataState.error) {
      return (
        <div
          className="w-full mx-auto flex flex-col items-center justify-center p-8 rounded-[10px] border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)] min-h-[340px]"
          dir="rtl"
        >
          <p className="text-base font-semibold text-[var(--ember)] mb-1">تعذّر تحميل بيانات النجوم</p>
          <p className="text-xs text-[var(--muted)]">{dataState.error}</p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="w-full flex flex-col gap-2 select-none"
        dir="rtl"
      >
        {/* Toolbar above canvas: +, −, إعادة الضبط + toggles: أشكال العرب, خطوط الأبراج, سماء الآن */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={zoomIn}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] text-base font-semibold transition-colors cursor-pointer"
              title="تكبير"
              aria-label="تكبير"
            >
              +
            </button>
            <button
              type="button"
              onClick={zoomOut}
              className="w-8 h-8 flex items-center justify-center rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] text-base font-semibold transition-colors cursor-pointer"
              title="تصغير"
              aria-label="تصغير"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetView}
              className="h-8 px-3 flex items-center justify-center rounded-[8px] bg-[var(--panel2)] border border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)] text-xs font-medium transition-colors cursor-pointer"
            >
              إعادة الضبط
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowArabShapes((prev) => !prev)}
              className={`h-8 px-3 rounded-[8px] text-xs font-medium border transition-colors cursor-pointer ${
                showArabShapes
                  ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--gold)] font-semibold'
                  : 'bg-[var(--panel)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              أشكال العرب
            </button>

            <button
              type="button"
              onClick={() => setShowConstellationLines((prev) => !prev)}
              className={`h-8 px-3 rounded-[8px] text-xs font-medium border transition-colors cursor-pointer ${
                showConstellationLines
                  ? 'bg-[var(--panel2)] border-[var(--gold)] text-[var(--gold)] font-semibold'
                  : 'bg-[var(--panel)] border-[var(--line)] text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              خطوط الأبراج
            </button>

            {onToggleTonightSky && (
              <button
                id="tour-tonight-btn"
                type="button"
                onClick={onToggleTonightSky}
                className={`h-8 px-3 rounded-[8px] text-xs font-semibold border transition-colors cursor-pointer ${
                  tonightSky?.active
                    ? 'bg-[var(--gold-fill)] border-[var(--gold)] text-[#1a1405]'
                    : 'bg-[var(--panel2)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--gold)]'
                }`}
              >
                {tonightSky?.active ? 'إيقاف سماء الآن' : 'سماء الآن'}
              </button>
            )}
          </div>
        </div>

        {/* Real Sky Map Canvas Container (always dark night sky inside, 1px border uses --line) */}
        <div
          id="tour-map-canvas"
          className="relative w-full rounded-[8px] border border-[var(--line)] overflow-hidden bg-[#050a15] shadow-2xl"
          style={{
            height: 'min(72vh, 620px)',
            minHeight: '340px',
          }}
        >
          {/* Invisible anchor for Guided Tour Step 2 (glowing star target) */}
          <div
            id="tour-star-target"
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full"
          />

          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`w-full block touch-none ${
              isGrabbing ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            style={{
              width: '100%',
              height: 'min(72vh, 620px)',
              minHeight: '340px',
              touchAction: 'none',
            }}
          />
        </div>

        {/* Legend below */}
        <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-[var(--muted)] py-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block bg-[var(--gold)]"
            />
            <span>منزلة</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block bg-[var(--sky)]"
            />
            <span>من مشاهير الكواكب</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block bg-[var(--ink)] border border-[var(--line)]"
            />
            <span>المحدد</span>
          </div>
        </div>
      </div>
    );
  }
);

SkyMap.displayName = 'SkyMap';
export default SkyMap;
