/**
 * NoteMaker — 5-step guided note creation wizard at /make
 *
 * Step 1  Pick a shape     → ShapeCarousel (was StylePicker chips)
 * Step 2  Style the paper  → ThemePicker with colour + pattern tabs + live preview
 * Step 3  Add stickers     → StickerTray + mini preview
 * Step 4  Write            → Message/name inputs with prominent note preview stage
 * Step 5  Done!            → Floating note + 3-tier action buttons (share/pin/download)
 *
 * Transitions: directional slide (forward → slide left, back → slide right)
 */

import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StylePicker from './StylePicker';
import ThemePicker from './ThemePicker';
import StickerTray from './StickerTray';
import NotePreview from './NotePreview';
import NoteCard from './NoteCard';
import { exportNotePng } from '../utils/exportNotePng';
import { getBalancedPlacement } from '../utils/boardPlacement';
import { supabase } from '../lib/supabase';

// ── Step metadata ─────────────────────────────────────────────────────────────
const steps = [
  { id: 1, label: 'Choose a shape',  title: 'Pick a shape that feels like you.' },
  { id: 2, label: 'Pick a style',    title: 'Style the paper.' },
  { id: 3, label: 'Add stickers',    title: 'Sprinkle some personality.' },
  { id: 4, label: 'Write your note', title: 'Say something nice.' },
  { id: 5, label: 'Share & celebrate', title: 'You are done! Pinned!' },
];

// ── Slide-transition variants ─────────────────────────────────────────────────
const PAGE_VARIANTS = {
  enter: (dir) => ({ opacity: 0, x: dir > 0 ? 48 : -48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir > 0 ? -48 : 48 }),
};
const PAGE_TRANSITION = { duration: 0.28, ease: [0.32, 0, 0.36, 1] };

// ── Default draft ─────────────────────────────────────────────────────────────
const defaultDraft = () => ({
  designId: 'toast-rounded-square',
  themeId: 'cream',
  paperId: 'plain',
  stickers: [],
  name: localStorage.getItem('notie-name') || '',
  message: '',
  leaveBlank: false,
});

// Helper: build a minimal note object for NoteCard/NotePreview from draft
function draftToNote(draft) {
  return {
    id: 'preview',
    design_id: draft.designId,
    theme_id: draft.themeId,
    paper_id: draft.paperId,
    stickers: draft.stickers,
    name: draft.name,
    message: draft.message,
  };
}

export default function NoteMaker() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [draft, setDraft] = useState(defaultDraft());
  const [isPosting, setIsPosting] = useState(false);
  const [error, setError] = useState('');

  // Direction ref for slide transitions: +1 = forward, -1 = back
  const direction = useRef(0);

  // Ref for the note element on the done screen (used for PNG export)
  const exportRef = useRef(null);

  // ── Draft helpers ──────────────────────────────────────────────────────────
  const updateDraft = (patch) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (typeof patch.name === 'string') {
        localStorage.setItem('notie-name', patch.name);
      }
      return next;
    });
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (currentStep < steps.length) {
      direction.current = 1;
      setCurrentStep((s) => s + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      direction.current = -1;
      setCurrentStep((s) => s - 1);
      setError('');
    }
  };

  // ── Post to public board ───────────────────────────────────────────────────
  const handlePinToBoard = async () => {
    const name = draft.name.trim();
    const message = draft.message.trim();

    if (!name) {
      setError('Please add your name first.');
      direction.current = -1;
      setCurrentStep(4);
      return;
    }
    if (!draft.leaveBlank && !message) {
      setError('Please add a message or check "Leave it blank".');
      direction.current = -1;
      setCurrentStep(4);
      return;
    }
    if (!supabase) {
      setError('Board connection not available. Check your Supabase config.');
      return;
    }

    setIsPosting(true);
    setError('');

    try {
      const { data: rows } = await supabase
        .from('notes')
        .select('pos_x, pos_y');

      const placement = getBalancedPlacement(rows || []);

      const { error: insertError } = await supabase.from('notes').insert({
        name,
        message: draft.leaveBlank ? '' : message,
        design_id: draft.designId,
        theme_id: draft.themeId,
        paper_id: draft.paperId,
        stickers: draft.stickers,
        ...placement,
      });

      if (insertError) throw insertError;

      setTimeout(() => navigate('/board'), 280);
    } catch (e) {
      setError(e.message || 'Could not post your note. Try again.');
      setIsPosting(false);
    }
  };

  // ── Share (Web Share API with clipboard fallback) ──────────────────────────
  const handleShare = async () => {
    const shareData = {
      title: 'Notie — a note for you',
      text: draft.message || 'I made you a little note on Notie!',
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        // Brief visual feedback handled by the button itself via CSS
      }
    } catch {
      // User cancelled — no-op
    }
  };

  // ── Download PNG ───────────────────────────────────────────────────────────
  const handleDownload = () => exportNotePng(exportRef.current, 'my-notie');

  // ── Step content renderer ──────────────────────────────────────────────────
  const renderStep = () => {
    switch (currentStep) {
      // ── Step 1: Shape ────────────────────────────────────────────────────
      case 1:
        return (
          <div className="wizard__step">
            <p className="wizard__step-category">CHOOSE A SHAPE</p>
            <h1 className="wizard__title">{steps[0].title}</h1>
            <p className="wizard__subtitle">
              Select the decorative paper cut-out first. The rest of the note stays classic Notie.
            </p>
            <StylePicker
              value={draft.designId}
              onChange={(designId) => updateDraft({ designId })}
            />
          </div>
        );

      // ── Step 2: Colour + Pattern ──────────────────────────────────────────
      case 2:
        return (
          <div className="wizard__split">
            {/* Left: controls */}
            <div className="wizard__step wizard__step--no-padding-top">
              <p className="wizard__step-category">BACKGROUND COLOR AND PATTERN</p>
              <h1 className="wizard__title">{steps[1].title}</h1>
              <p className="wizard__subtitle">
                Patterns sit behind the chosen shape. Your note stays square and cozy like the original Notie.
              </p>
              <ThemePicker
                themeValue={draft.themeId}
                patternValue={draft.paperId}
                onThemeChange={(themeId) => updateDraft({ themeId })}
                onPatternChange={(paperId) => updateDraft({ paperId })}
              />
            </div>

            {/* Right: sticky live preview */}
            <div className="wizard__split-preview">
              <p className="wizard__step-label wizard__step-label--sm">Live preview</p>
              <NotePreview note={draftToNote(draft)} />
            </div>
          </div>
        );

      // ── Step 3: Stickers ──────────────────────────────────────────────────
      case 3:
        return (
          <div className="wizard__step">
            <h1 className="wizard__title">{steps[2].title}</h1>
            <StickerTray
              value={draft.stickers}
              onChange={(stickers) => updateDraft({ stickers })}
            />
            {/* Mini preview so users see stickers placed on their note */}
            <div className="wizard__sticker-preview">
              <NotePreview note={draftToNote(draft)} />
            </div>
          </div>
        );

      // ── Step 4: Write ─────────────────────────────────────────────────────
      case 4: {
        const msgLen = draft.message.length;
        return (
          <div className="wizard__step">
            <h1 className="wizard__title">{steps[3].title}</h1>

            {/* Prominent note preview stage (warm brown mini-corkboard) */}
            <div className="wizard__write-stage">
              <NoteCard
                preview
                note={draftToNote(draft)}
              />
            </div>

            <div className="wizard__write-section">
              {/* Name */}
              <section>
                <label htmlFor="nm-name" className="wizard__label">
                  SIGNED BY
                </label>
                <input
                  id="nm-name"
                  className="text-input"
                  maxLength={12}
                  value={draft.name}
                  onChange={(e) => updateDraft({ name: e.target.value.slice(0, 12) })}
                  placeholder="Your name"
                />
              </section>

              {/* Message */}
              <section>
                <label htmlFor="nm-msg" className="wizard__label">
                  YOUR MESSAGE
                </label>
                <textarea
                  id="nm-msg"
                  className="text-area"
                  maxLength={100}
                  value={draft.message}
                  onChange={(e) => updateDraft({ message: e.target.value.slice(0, 100) })}
                  placeholder="Write a little note..."
                  disabled={draft.leaveBlank}
                />
                <div className={`character-counter ${msgLen >= 90 ? 'is-warning' : ''}`}>
                  {msgLen} / 100
                </div>
              </section>

              {/* Leave blank toggle */}
              <section style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  id="nm-blank"
                  type="checkbox"
                  checked={draft.leaveBlank}
                  onChange={(e) =>
                    updateDraft({
                      leaveBlank: e.target.checked,
                      message: e.target.checked ? '' : draft.message,
                    })
                  }
                  style={{ width: 18, height: 18, cursor: 'pointer' }}
                />
                <label
                  htmlFor="nm-blank"
                  style={{ cursor: 'pointer', flex: 1, color: '#8a6a4c', fontWeight: 600 }}
                >
                  Leave it blank
                </label>
              </section>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
        );
      }

      // ── Step 5: Done ──────────────────────────────────────────────────────
      case 5:
        return (
          <div className="wizard__done">
            <motion.h1
              className="wizard__done-title"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, ease: 'easeOut' }}
            >
              {steps[4].title}
            </motion.h1>

            {/* Note on a raised stage with idle float animation */}
            <motion.div
              className="wizard__done-stage"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
            >
              <motion.div
                ref={exportRef}
                animate={{ y: [0, -7, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <NoteCard
                  preview
                  note={draftToNote(draft)}
                />
              </motion.div>
            </motion.div>

            {/* 3-tier button hierarchy */}
            <div className="wizard__done-buttons">
              <motion.button
                type="button"
                className="primary-button btn-done-primary wizard__done-btn"
                onClick={handleShare}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                whileHover={{ y: -2, boxShadow: '0 16px 28px rgba(180,130,40,0.32)' }}
                whileTap={{ scale: 0.97 }}
              >
                Share it to someone
              </motion.button>

              <motion.button
                type="button"
                className="primary-button btn-done-secondary wizard__done-btn"
                onClick={handlePinToBoard}
                disabled={isPosting}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                {isPosting ? 'Pinning…' : 'Pin it on public board'}
              </motion.button>

              <motion.button
                type="button"
                className="secondary-button btn-done-tertiary wizard__done-btn"
                onClick={handleDownload}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.34 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
              >
                Download PNG
              </motion.button>
            </div>

            {error && (
              <p className="form-error" role="alert" style={{ marginTop: 12, textAlign: 'center' }}>
                {error}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // ── Layout ─────────────────────────────────────────────────────────────────
  // Step 5 swaps to a warm brown background
  const isDoneStep = currentStep === 5;

  return (
    <div
      className={`notie-wizard ${isDoneStep ? 'notie-wizard--done' : ''}`}
      style={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      {/* ── Zone 1: Progress bar ─────────────────────────────────────────── */}
      <div className="wizard__topbar">
        <p className="wizard__step-label">
          STEP {currentStep} OF {steps.length}
        </p>
        <div className="wizard__progress-dots" role="list" aria-label="Progress">
          {steps.map((_, i) => (
            <span
              key={i}
              role="listitem"
              className={`wizard__dot ${i + 1 <= currentStep ? 'wizard__dot--active' : ''}`}
              aria-label={`Step ${i + 1} ${i + 1 < currentStep ? 'completed' : i + 1 === currentStep ? 'current' : ''}`}
            />
          ))}
        </div>
        <p className="wizard__step-name">{steps[currentStep - 1].label}</p>
      </div>

      {/* ── Zone 2: Scrollable content ───────────────────────────────────── */}
      <div className="wizard__scroll-zone">
        <AnimatePresence mode="wait" custom={direction.current}>
          <motion.div
            key={currentStep}
            custom={direction.current}
            variants={PAGE_VARIANTS}
            initial="enter"
            animate="center"
            exit="exit"
            transition={PAGE_TRANSITION}
            className="wizard__page"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Zone 3: Button bar (hidden on done screen) ───────────────────── */}
      {!isDoneStep && (
        <div className="wizard__button-bar">
          <button
            type="button"
            className="secondary-button"
            onClick={goBack}
            disabled={currentStep === 1}
            style={{ opacity: currentStep === 1 ? 0.45 : 1 }}
          >
            Back
          </button>
          <motion.button
            type="button"
            className="primary-button"
            onClick={goNext}
            whileHover={{ y: -2, boxShadow: '0 16px 28px rgba(110,77,45,0.22)' }}
            whileTap={{ scale: 0.97 }}
          >
            Next →
          </motion.button>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className={`wizard__credit-bar ${isDoneStep ? 'wizard__credit-bar--dark' : ''}`}>
        Made with love by Selena Loong |{' '}
        <a href="#" onClick={(e) => e.preventDefault()}>
          Contact Us
        </a>{' '}
        | © 2026 Selena Loong. All rights reserved.
      </div>
    </div>
  );
}
