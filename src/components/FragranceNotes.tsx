interface FragranceNotesProps {
  top: string[];
  heart: string[];
  base: string[];
  keyNotes: string[];
}

export function FragranceNotes({top, heart, base, keyNotes}: FragranceNotesProps) {
  const hasPyramid = top.length > 0 || heart.length > 0 || base.length > 0;
  if (!hasPyramid && keyNotes.length === 0) return null;

  return (
    <div className="note-pyramid" aria-label="Пирамида аромата">
      {top.length > 0 && <p><strong>Верхние ноты</strong><span>{top.join(', ')}</span></p>}
      {heart.length > 0 && <p><strong>Ноты сердца</strong><span>{heart.join(', ')}</span></p>}
      {base.length > 0 && <p><strong>Базовые ноты</strong><span>{base.join(', ')}</span></p>}
      {!hasPyramid && keyNotes.length > 0 && <p><strong>Ключевые ноты</strong><span>{keyNotes.join(', ')}</span></p>}
    </div>
  );
}
