"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

const SWIPE_THRESHOLD_PX = 56;
const SWIPE_MAX_VERTICAL_DRIFT_PX = 80;
const SWIPE_PREVIEW_MAX_PX = 96;
const SWIPE_PREVIEW_RATIO = 0.44;
const SWIPE_PREVIEW_EDGE_RATIO = 0.24;

interface UseMonthSwipePreviewOptions {
  canGoPrev: boolean;
  canGoNext: boolean;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
}

export function useMonthSwipePreview({
  canGoPrev,
  canGoNext,
  onSwipePrev,
  onSwipeNext,
}: UseMonthSwipePreviewOptions) {
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeHandledRef = useRef(false);
  const activePointerIdRef = useRef<number | null>(null);
  const suppressTapRef = useRef(false);

  const releaseTapSuppression = useCallback(() => {
    window.setTimeout(() => {
      suppressTapRef.current = false;
    }, 0);
  }, []);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (!event.isPrimary) {
      return;
    }

    activePointerIdRef.current = event.pointerId;
    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
    swipeHandledRef.current = false;
    suppressTapRef.current = false;
    setIsDragging(true);
  }, []);

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const swipeStart = swipeStartRef.current;

      if (!event.isPrimary || !swipeStart || activePointerIdRef.current !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;

      if (
        Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT_PX ||
        Math.abs(deltaY) > Math.abs(deltaX)
      ) {
        setDragOffsetX(0);
        return;
      }

      const isBlockedDirection = (deltaX > 0 && !canGoPrev) || (deltaX < 0 && !canGoNext);
      const previewRatio = isBlockedDirection ? SWIPE_PREVIEW_EDGE_RATIO : SWIPE_PREVIEW_RATIO;
      const nextOffset = Math.max(
        -SWIPE_PREVIEW_MAX_PX,
        Math.min(SWIPE_PREVIEW_MAX_PX, deltaX * previewRatio)
      );

      setDragOffsetX(nextOffset);
    },
    [canGoNext, canGoPrev]
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const swipeStart = swipeStartRef.current;
      activePointerIdRef.current = null;
      swipeStartRef.current = null;
      setIsDragging(false);
      setDragOffsetX(0);

      if (!event.isPrimary || !swipeStart || swipeHandledRef.current) {
        return;
      }

      const deltaX = event.clientX - swipeStart.x;
      const deltaY = event.clientY - swipeStart.y;

      if (
        Math.abs(deltaX) < SWIPE_THRESHOLD_PX ||
        Math.abs(deltaY) > SWIPE_MAX_VERTICAL_DRIFT_PX ||
        Math.abs(deltaY) > Math.abs(deltaX)
      ) {
        releaseTapSuppression();
        return;
      }

      swipeHandledRef.current = true;
      suppressTapRef.current = true;
      releaseTapSuppression();

      if (deltaX < 0) {
        onSwipeNext();
        return;
      }

      onSwipePrev();
    },
    [onSwipeNext, onSwipePrev, releaseTapSuppression]
  );

  const handlePointerCancel = useCallback(() => {
    activePointerIdRef.current = null;
    swipeStartRef.current = null;
    swipeHandledRef.current = false;
    setIsDragging(false);
    setDragOffsetX(0);
    releaseTapSuppression();
  }, [releaseTapSuppression]);

  const handleClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressTapRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressTapRef.current = false;
  }, []);

  const surfaceStyle = useMemo<CSSProperties>(() => ({ touchAction: "pan-y" }), []);
  const contentStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate3d(${dragOffsetX}px, 0, 0)`,
      transition: isDragging ? "none" : "transform 180ms cubic-bezier(0.22, 1, 0.36, 1)",
      willChange: isDragging ? "transform" : undefined,
    }),
    [dragOffsetX, isDragging]
  );

  return {
    surfaceProps: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: handlePointerCancel,
      onClickCapture: handleClickCapture,
      style: surfaceStyle,
    },
    contentStyle,
  };
}
