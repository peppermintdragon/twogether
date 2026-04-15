import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import StylePicker from '../components/StylePicker';
import ThemePicker from '../components/ThemePicker';
import StickerTray from '../components/StickerTray';
import NotePreview from '../components/NotePreview';
import { exportNotePng } from '../utils/exportNotePng';
import { getBalancedPlacement } from '../utils/boardPlacement';
import { supabase } from '../lib/supabase';

const defaultDraft = {
  name: localStorage.getItem('notie-name') || '',
  message: '',
  designId: 'toast-rounded-square',
  themeId: 'cream',
  stickers: [],
};

export default function WritePage() {
  const navigate = useNavigate();
  const exportRef = useRef(null);
  const [draft, setDraft] = useState(defaultDraft);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pulsePreview, setPulsePreview] = useState(false);
  const [error, setError] = useState('');

  const messageCount = draft.message.length;

  const updateDraft = (patch) => {
    const next = { ...draft, ...patch };
    setDraft(next);

    if (typeof patch.name === 'string') {
      localStorage.setItem('notie-name', patch.name);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const message = draft.message.trim();
    const name = draft.name.trim();

    if (!name || !message) {
      setError('Please add a name and a short message.');
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured yet.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    setPulsePreview(true);

    try {
      const { data: existingRows, error: countError } = await supabase
        .from('notes')
        .select('pos_x, pos_y', { count: 'exact' });

      if (countError) throw countError;

      const placement = getBalancedPlacement(existingRows || []);

      const { error: insertError } = await supabase.from('notes').insert({
        name,
        message,
        design_id: draft.designId,
        theme_id: draft.themeId,
        stickers: draft.stickers,
        ...placement,
      });

      if (insertError) throw insertError;

      setTimeout(() => navigate('/board'), 260);
    } catch (submitError) {
      setError(submitError.message || 'Could not post your note.');
      setIsSubmitting(false);
      setPulsePreview(false);
      return;
    }
  };

  return (
    <div className="app-bg app-bg--write">
      <main className="notie-shell" role="main" aria-label="Create sticky note">
        <Header />

        <motion.form
          className="write-layout"
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          role="region"
          aria-label="Sticky note creation form"
        >
          <div className="write-layout__controls">
            <section aria-label="Design customization options">
              <h2 className="control-block__label">Design Style</h2>
              <StylePicker value={draft.designId} onChange={(designId) => updateDraft({ designId })} />
            </section>

            <section aria-label="Color theme selection">
              <h2 className="control-block__label">Color Theme</h2>
              <ThemePicker value={draft.themeId} onChange={(themeId) => updateDraft({ themeId })} />
            </section>

            <section aria-label="Sticker selection">
              <h2 className="control-block__label">Stickers</h2>
              <StickerTray value={draft.stickers} onChange={(stickers) => updateDraft({ stickers })} />
            </section>

            <section className="control-block">
              <label className="control-block__label" htmlFor="name-input">名字</label>
              <input
                id="name-input"
                className="text-input"
                maxLength={12}
                value={draft.name}
                onChange={(event) => updateDraft({ name: event.target.value.slice(0, 12) })}
                placeholder="你的名字"
                aria-label="Your name"
              />
            </section>

            <section className="control-block">
              <label className="control-block__label" htmlFor="message-input">內容</label>
              <textarea
                id="message-input"
                className="text-area"
                maxLength={25}
                value={draft.message}
                onChange={(event) => updateDraft({ message: event.target.value.slice(0, 25) })}
                placeholder="說點什麼..."
                aria-label="Message content"
              />
              <div className={`character-counter ${messageCount >= 23 ? 'is-warning' : ''}`} aria-live="polite">
                {messageCount} / 25
              </div>
            </section>

            {error ? <p className="form-error" role="alert">{error}</p> : null}

            <div className="action-row">
              <button
                type="button"
                className="secondary-button"
                onClick={() => exportNotePng(exportRef.current, 'preview')}
                aria-label="Download sticky note as PNG"
              >
                ⬇️ 存成 PNG
              </button>
              <motion.button
                type="submit"
                className="primary-button"
                disabled={isSubmitting}
                whileHover={{ y: -2, boxShadow: '0 16px 28px rgba(120, 87, 47, 0.25)' }}
                whileTap={{ scale: 0.98 }}
                aria-label="Post sticky note to the board"
              >
                {isSubmitting ? '貼上中...' : '📌 貼到黑板！'}
              </motion.button>
            </div>
          </div>

          <div className="write-layout__preview">
            <NotePreview note={draft} exportRef={exportRef} pulse={pulsePreview} />
          </div>
        </motion.form>
      </main>
    </div>
  );
}
