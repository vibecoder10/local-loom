export function buildCutPlan(cuts = [], trim = {}, duration = 0) {
  const total = Number(duration);
  if (!Number.isFinite(total) || total < 0) throw new Error('A valid video duration is required.');
  const start = trim.start === '' || trim.start === undefined ? 0 : finite(trim.start);
  const end = trim.end === '' || trim.end === undefined ? total : finite(trim.end);
  if (start < 0 || end > total || end < start) throw new Error('Trim bounds are invalid.');
  const ranges = cuts.filter((cut) => cut.enabled !== false).map((cut) => ({ start: finite(cut.start), end: finite(cut.end) }));
  for (const cut of ranges) {
    if (cut.start < 0 || cut.end > total || cut.end <= cut.start) throw new Error('Each removal must be within the original video and end after it starts.');
  }
  const clipped = ranges.filter((cut) => cut.end > start && cut.start < end)
    .map((cut) => ({ start: Math.max(start, cut.start), end: Math.min(end, cut.end) })).sort((a, b) => a.start - b.start);
  const merged = clipped.reduce((all, cut) => { const last = all.at(-1); if (last && cut.start <= last.end) last.end = Math.max(last.end, cut.end); else all.push(cut); return all; }, []);
  const removedSeconds = merged.reduce((sum, cut) => sum + cut.end - cut.start, 0) + start + (total - end);
  const remainingSeconds = total - removedSeconds;
  if (remainingSeconds <= 0) throw new Error('Edits cannot remove the entire video.');
  return { cuts: merged, trim: { start, end }, removedSeconds, remainingSeconds };
}
function finite(value, fallback = NaN) { const number = Number(value); if (!Number.isFinite(number)) { if (Number.isFinite(fallback)) return fallback; throw new Error('Edit times must be finite numbers.'); } return number; }
