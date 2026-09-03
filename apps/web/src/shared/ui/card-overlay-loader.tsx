import { Loader2 } from 'lucide-react';

interface CardOverlayLoaderProps {
  visible: boolean;
}

/**
 * Semi-transparent overlay with spinner, placed over a card's content
 * to indicate a background refresh without hiding stale data.
 * Parent element must have `position: relative`.
 */
export function CardOverlayLoader({ visible }: CardOverlayLoaderProps) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 backdrop-blur-[1px]">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
