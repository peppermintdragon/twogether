import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { themeMap } from '../utils/colorThemes';
import { noteDesignMap } from '../utils/noteDesigns';
import { patternMap } from '../utils/paperPatterns';

const MotionDiv = motion.div;

const NoteCard = forwardRef(function NoteCard(
  {
    note,
    preview = false,
    board = false,
    onClick,
    interactive = false,
    style,
  },
  ref
) {
  const theme = themeMap[note.theme_id || note.themeId];
  const design = noteDesignMap[note.design_id || note.designId];
  const stickers = note.stickers || [];
  const rotation = note.rotation || 0;

  // Paper pattern: overlay on top of the solid surface colour
  const pattern = patternMap[note.paper_id || note.paperId];
  const patternBg = pattern?.css?.(theme.border) ?? null;

  const cardStyle = {
    '--note-surface': theme.surface,
    '--note-inner': theme.inner,
    '--note-border': theme.border,
    '--note-accent': theme.accent,
    '--note-shadow': theme.shadow,
    // Merge pattern layers with the base surface colour when a pattern is selected
    ...(patternBg && { background: `${patternBg}, ${theme.surface}` }),
    width: preview ? 'min(74vw, 280px)' : `${design.boardWidth}px`,
    minHeight: preview ? '290px' : `${design.boardHeight}px`,
    transform: board ? `rotate(${rotation}deg)` : undefined,
    ...style,
  };

  return (
    <MotionDiv
      ref={ref}
      className={`note-card ${design.shapeClass} ${preview ? 'is-preview' : ''} ${interactive ? 'is-interactive' : ''}`}
      style={cardStyle}
      onClick={onClick}
      whileHover={interactive ? { y: -5, scale: 1.03 } : undefined}
      whileTap={interactive ? { scale: 0.98 } : undefined}
      layout
    >
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
      {design.decoration === 'sprinkle' && <span className="note-corner note-corner--sprinkle">⋰</span>}
      {design.decoration === 'sleepy' && <span className="note-corner note-corner--sleepy">⋆</span>}

      <div className="note-card__inner">
        <div className="note-stickers">
          {stickers.map((sticker) => (
            <span key={`${note.id || note.message}-${sticker}`} className="note-sticker">
              {sticker}
            </span>
          ))}
        </div>

        <div className="note-card__message">
          {note.message?.trim() || (preview ? '說點什麼...' : '')}
        </div>

        <div className="note-card__footer">
          <span className="note-card__name">{note.name?.trim() || '匿名'}</span>
        </div>
      </div>
    </MotionDiv>
  );
});

export default NoteCard;
