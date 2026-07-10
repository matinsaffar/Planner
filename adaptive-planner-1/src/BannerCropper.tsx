import React, { useRef, useState, useEffect } from "react";

// Lightweight pan+zoom cropper for banner images. No external deps.
// The user drags the image to reposition it and uses a slider to zoom, then
// "Apply" bakes the currently-visible region into a canvas at a fixed output
// size matching the banner's aspect ratio, so large/mismatched images can be
// framed correctly instead of just being squashed by object-fit:cover.

const OUT_W = 900;
const OUT_H = 260; // ~3.46:1, matches the banner-upload preview's proportions

interface Props {
  src: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

export default function BannerCropper({ src, onCancel, onConfirm }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragState = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null);

  useEffect(() => {
    const measure = () => {
      if (viewportRef.current) {
        const r = viewportRef.current.getBoundingClientRect();
        setViewport({ w: r.width, h: r.height });
      }
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function onImgLoad() {
    const img = imgRef.current;
    if (img) setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  const baseScale = natural.w && viewport.w ? Math.max(viewport.w / natural.w, viewport.h / natural.h) : 1;
  const totalScale = baseScale * zoom;
  const dispW = natural.w * totalScale;
  const dispH = natural.h * totalScale;
  const maxOffX = Math.max(0, (dispW - viewport.w) / 2);
  const maxOffY = Math.max(0, (dispH - viewport.h) / 2);

  function clamp(v: number, max: number) { return Math.max(-max, Math.min(max, v)); }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({
      x: clamp(dragState.current.offX + dx, maxOffX),
      y: clamp(dragState.current.offY + dy, maxOffY),
    });
  }
  function onPointerUp() { dragState.current = null; }

  function handleApply() {
    if (!natural.w || !viewport.w) return;
    const left = viewport.w / 2 - dispW / 2 + offset.x;
    const top = viewport.h / 2 - dispH / 2 + offset.y;
    const cropX = -left / totalScale;
    const cropY = -top / totalScale;
    const cropW = viewport.w / totalScale;
    const cropH = viewport.h / totalScale;

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d");
    if (!ctx || !imgRef.current) return;
    ctx.drawImage(imgRef.current, cropX, cropY, cropW, cropH, 0, 0, OUT_W, OUT_H);
    onConfirm(canvas.toDataURL("image/jpeg", 0.9));
  }

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="sheet glass" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <h3>Position your banner</h3>
        <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
          Drag to reposition, use the slider to zoom, then apply.
        </p>
        <div
          ref={viewportRef}
          className="banner-crop-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={onImgLoad}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: natural.w,
              height: natural.h,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${totalScale})`,
              transformOrigin: "center",
              maxWidth: "none",
            }}
          />
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>Zoom</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => {
              const z = Number(e.target.value);
              setZoom(z);
              // re-clamp offset for new scale so image never leaves a gap
              const nd_w = natural.w * baseScale * z;
              const nd_h = natural.h * baseScale * z;
              const mx = Math.max(0, (nd_w - viewport.w) / 2);
              const my = Math.max(0, (nd_h - viewport.h) / 2);
              setOffset((o) => ({ x: clamp(o.x, mx), y: clamp(o.y, my) }));
            }}
            style={{ width: "100%" }}
          />
        </div>
        <div className="btn-row">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="btn btn-primary" onClick={handleApply}>Apply</button>
        </div>
      </div>
    </div>
  );
}
