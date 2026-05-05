/**
 * ShapeCarousel — Step 1 of the NoteMaker wizard.
 *
 * Replaces the old horizontal-scroll chip list with a 3-up carousel
 * (prev · active · next). Supports:
 *   • Click the arrow buttons (keyboard left/right also works)
 *   • Pointer drag / touch swipe (horizontal delta > 40px snaps to next)
 *   • Click a side card to jump directly to it
 */

import { useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { noteDesigns } from '../utils/noteDesigns';

// ─── Warm palette for the shape thumbnails ───────────────────────────────────
const ACTIVE_STYLE = {
  '--note-surface': '#c9835b',
  '--note-border': '#a06040',
  '--note-accent': '#5c2e0e',
  '--note-shadow': 'rgba(120,72,30,0.28)',
  '--note-inner': '#f5dece',
};
const SIDE_STYLE = {
  '--note-surface': '#e8d5c0',
  '--note-border': '#d4bca0',
  '--note-accent': '#8a6e58',
  '--note-shadow': 'rgba(0,0,0,0.06)',
  '--note-inner': '#f9f3ec',
};

// Pixels between neighbouring card centres
const SLOT_PX = 215;

export default function StylePicker({ value, onChange }) {
  const activeIndex = noteDesigns.findIndex((d) => d.id === value);

  const goTo = useCallback(
    (idx) => {
      if (idx < 0 || idx >= noteDesigns.length) return;
      onChange(noteDesigns[idx].id);
    },
    [onChange],
  );

  // ── Drag / swipe ─────────────────────────────────────────────────────────
  const dragStartX = useRef(null);
  const trackRef = useRef(null);

  const onPointerDown = (e) => {
    dragStartX.current = e.clientX;
    // Capture so we keep getting events even if pointer leaves the element
    trackRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerUp = (e) => {
    if (dragStartX.current === null) return;
    const delta = e.clientX - dragStartX.current;
    dragStartX.current = null;
    if (Math.abs(delta) > 40) {
      goTo(activeIndex + (delta < 0 ? 1 : -1));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(activeIndex - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goTo(activeIndex + 1); }
  };

  return (
    <div
      className="shape-carousel"
      role="group"
      aria-label="Note shape selector"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {/* ── Left arrow ───────────────────────────────────────────────────── */}
      <button
        type="button"
        className="shape-carousel__arrow shape-carousel__arrow--left"
        onClick={() => goTo(activeIndex - 1)}
        disabled={activeIndex === 0}
        aria-label="Previous shape"
      >
        ‹
      </button>

      {/* ── Carousel track ───────────────────────────────────────────────── */}
      <div
        ref={trackRef}
        className="shape-carousel__track"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        // Prevent context menu on long-press mobile
        onContextMenu={(e) => e.preventDefault()}
      >
        {noteDesigns.map((design, idx) => {
          const offset = idx - activeIndex;
          const isActive = offset === 0;
          const isVisible = Math.abs(offset) <= 1;
          const themeVars = isActive ? ACTIVE_STYLE : SIDE_STYLE;

          return (
            <motion.div
              key={design.id}
              className={`shape-carousel__item note-card ${design.shapeClass}`}
              style={{
                // CSS custom properties for NoteCard theming
                ...themeVars,
                // Positioning: absolute within the centred track
                position: 'absolute',
                marginLeft: -100, // half of 200px card width → centres card on the track axis
                marginTop: -130,  // half of 260px card height
                left: '50%',
                top: '50%',
                // Cards that are completely off-screen shouldn't receive pointer events
                pointerEvents: isVisible ? (isActive ? 'none' : 'auto') : 'none',
              }}
              animate={{
                x: offset * SLOT_PX,
                scale: isActive ? 1 : 0.76,
                opacity: isVisible ? (isActive ? 1 : 0.44) : 0,
              }}
              transition={{ type: 'spring', stiffness: 270, damping: 28 }}
              onClick={() => !isActive && goTo(idx)}
              aria-label={`Select shape: ${design.label}`}
              role="button"
              tabIndex={isVisible && !isActive ? 0 : -1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') goTo(idx);
              }}
            >
              {/* ── Decorations ──────────────────────────────────────── */}
              {design.decoration === 'pin' && (
                <motion.span
                  className="note-pin"
                  initial={{ y: -10, rotate: -14, opacity: 0 }}
                  animate={{ y: 0, rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.45, ease: 'easeOut' }}
                />
              )}
              {design.decoration === 'tape' && (
                <motion.span
                  className="note-tape"
                  initial={{ y: -8, rotate: -8, opacity: 0 }}
                  animate={{ y: 0, rotate: -4, opacity: 1 }}
                  transition={{ duration: 0.42, ease: 'easeOut' }}
                />
              )}
              {design.decoration === 'sprinkle' && (
                <span className="note-corner note-corner--sprinkle">⋰</span>
              )}
              {design.decoration === 'sleepy' && (
                <span className="note-corner note-corner--sleepy">⋆</span>
              )}

              {/* ── Card inner (label) ───────────────────────────────── */}
              <div className="note-card__inner shape-carousel__inner">
                <div style={{ flex: 1 }} />
                <div className="note-card__footer">
                  <span className="note-card__name">{design.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Right arrow ──────────────────────────────────────────────────── */}
      <button
        type="button"
        className="shape-carousel__arrow shape-carousel__arrow--right"
        onClick={() => goTo(activeIndex + 1)}
        disabled={activeIndex === noteDesigns.length - 1}
        aria-label="Next shape"
      >
        ›
      </button>
    </div>
  );
}
