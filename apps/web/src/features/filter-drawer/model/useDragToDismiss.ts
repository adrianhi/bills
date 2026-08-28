import { useRef, useState, type TouchEvent } from 'react';

export const useDragToDismiss = (onDismiss: () => void) => {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const onTouchStart = (event: TouchEvent) => { startY.current = event.touches[0].clientY; setIsDragging(true); };
  const onTouchMove = (event: TouchEvent) => { if (isDragging) setDragY(Math.max(0, event.touches[0].clientY - startY.current)); };
  const onTouchEnd = () => { setIsDragging(false); if (dragY > 70) onDismiss(); setDragY(0); };
  return { dragY, isDragging, handlers: { onTouchStart, onTouchMove, onTouchEnd } };
};
