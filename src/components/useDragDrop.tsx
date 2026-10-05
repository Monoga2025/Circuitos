// Minimal pointer-based drag & drop (mouse + touch). Drop targets carry data-drop="id".
// A short tap selects the item instead (then tap a target), so it also works without dragging.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

interface DragState<T> {
  item: T;
  label: ReactNode;
  x: number;
  y: number;
  sx: number;
  sy: number;
  moved: boolean;
}

export function useDragDrop<T>(onDrop: (item: T, target: string) => void, onTap?: (item: T) => void) {
  const [drag, setDrag] = useState<DragState<T> | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const ref = useRef(drag);
  ref.current = drag;
  const dropRef = useRef(onDrop);
  dropRef.current = onDrop;
  const tapRef = useRef(onTap);
  tapRef.current = onTap;

  const targetAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    return el?.closest<HTMLElement>('[data-drop]')?.dataset.drop ?? null;
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = ref.current;
      if (!d) return;
      const moved = d.moved || Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 6;
      setDrag({ ...d, x: e.clientX, y: e.clientY, moved });
      setOver(moved ? targetAt(e.clientX, e.clientY) : null);
    };
    const up = (e: PointerEvent) => {
      const d = ref.current;
      setDrag(null);
      setOver(null);
      if (!d) return;
      if (!d.moved) {
        tapRef.current?.(d.item);
        return;
      }
      const t = targetAt(e.clientX, e.clientY);
      if (t) dropRef.current(d.item, t);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback((e: React.PointerEvent, item: T, label: ReactNode) => {
    e.preventDefault();
    setDrag({ item, label, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false });
  }, []);

  const ghost =
    drag && drag.moved ? (
      <div className="drag-ghost" style={{ left: drag.x, top: drag.y }}>
        {drag.label}
      </div>
    ) : null;

  return { start, ghost, over, dragging: drag?.moved ? drag.item : null };
}
