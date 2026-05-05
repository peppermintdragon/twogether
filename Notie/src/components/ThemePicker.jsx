/**
 * ThemePicker — Step 2 of the NoteMaker wizard.
 *
 * Redesigned to combine:
 *   • Colour swatch row (8 themes)
 *   • Category tabs: Core / Sweet / Graphic
 *   • 5-pattern grid for the selected category
 *
 * Props (new API):
 *   themeValue      — active theme id
 *   patternValue    — active pattern id
 *   onThemeChange   — (themeId: string) => void
 *   onPatternChange — (patternId: string) => void
 *
 * Backwards-compat shim: the old API (value / onChange) still works so
 * WritePage.jsx doesn't break.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { colorThemes, themeMap } from '../utils/colorThemes';
import { paperPatterns, patternCategories } from '../utils/paperPatterns';

const TAB_LABELS = { core: 'Core', sweet: 'Sweet', graphic: 'Graphic' };

export default function ThemePicker({
  // New API
  themeValue,
  patternValue = 'plain',
  onThemeChange,
  onPatternChange,
  // Old API shim (WritePage.jsx)
  value,
  onChange,
}) {
  // Resolve which API is in use
  const activeTheme = themeValue ?? value ?? 'cream';
  const handleTheme = onThemeChange ?? onChange ?? (() => {});
  const handlePattern = onPatternChange ?? (() => {});
  const isLegacyMode = !onThemeChange; // WritePage uses old API without pattern

  const [activeTab, setActiveTab] = useState('core');
  const theme = themeMap[activeTheme] ?? colorThemes[0];
  const patterns = paperPatterns[activeTab];

  return (
    <section className="control-block theme-picker">
      {/* ── Section header ──────────────────────────────────────────────── */}
      {!isLegacyMode && (
        <p className="theme-picker__category-label">BACKGROUND COLOR AND PATTERN</p>
      )}

      {/* ── Colour swatches ─────────────────────────────────────────────── */}
      <div className="swatch-row" aria-label="Color theme picker">
        {colorThemes.map((t) => (
          <motion.button
            key={t.id}
            type="button"
            className={`swatch ${activeTheme === t.id ? 'is-active' : ''}`}
            style={{ '--swatch-color': t.surface, '--swatch-border': t.border }}
            aria-label={`Select ${t.label} theme`}
            onClick={() => handleTheme(t.id)}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.94 }}
          />
        ))}
      </div>

      {/* ── Pattern section (only in new API mode) ──────────────────────── */}
      {!isLegacyMode && (
        <>
          {/* Category tabs */}
          <div className="pattern-tabs" role="tablist" aria-label="Pattern category">
            {patternCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeTab === cat}
                className={`pattern-tab ${activeTab === cat ? 'is-active' : ''}`}
                onClick={() => setActiveTab(cat)}
              >
                {TAB_LABELS[cat]}
              </button>
            ))}
          </div>

          {/* Pattern grid */}
          <motion.div
            key={activeTab}
            className="pattern-grid"
            aria-label={`${TAB_LABELS[activeTab]} patterns`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {patterns.map((p) => {
              const patternBg = p.css?.(theme.border) ?? null;
              const isActivePattern = patternValue === p.id;

              return (
                <div key={p.id} className="pattern-tile-wrapper">
                  <motion.button
                    type="button"
                    className={`pattern-tile ${isActivePattern ? 'is-active' : ''}`}
                    style={{
                      background: patternBg
                        ? `${patternBg}, ${theme.surface}`
                        : theme.surface,
                    }}
                    aria-label={`Select ${p.label} pattern`}
                    aria-pressed={isActivePattern}
                    onClick={() => handlePattern(p.id)}
                    whileHover={{ translateY: -2 }}
                    whileTap={{ scale: 0.96 }}
                  />
                  <span className="pattern-tile__label">{p.label}</span>
                </div>
              );
            })}
          </motion.div>
        </>
      )}
    </section>
  );
}
