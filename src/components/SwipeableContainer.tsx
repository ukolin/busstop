import React, { useRef, useState, useEffect, useCallback } from 'react';

interface SwipeableContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  showFadeIndicators?: boolean;
}

export const SwipeableContainer: React.FC<SwipeableContainerProps> = ({
  children,
  className = '',
  id,
  showFadeIndicators = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [checkScroll, children]);

  // Support mouse click & drag swipe for desktop preview
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftRef.current = el.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    e.preventDefault();
    const el = containerRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;
    el.scrollLeft = scrollLeftRef.current - walk;
    checkScroll();
  };

  const handleMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  return (
    <div className="relative w-full min-w-0 overflow-hidden group">
      {/* Left fade indicator */}
      {showFadeIndicators && canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-5 bg-gradient-to-r from-[#FDFBF7] to-transparent pointer-events-none z-10 transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Main scrollable/swipeable track */}
      <div
        id={id}
        ref={containerRef}
        onScroll={checkScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        className={`flex items-center overflow-x-auto no-scrollbar touch-pan-x overscroll-x-contain select-none ${className}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>

      {/* Right fade indicator */}
      {showFadeIndicators && canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#FDFBF7] via-[#FDFBF7]/80 to-transparent pointer-events-none z-10 transition-opacity duration-200 flex items-center justify-end pr-0.5"
          aria-hidden="true"
        >
          <span className="w-1 h-3 rounded-full bg-[#4A6741]/30 animate-pulse" />
        </div>
      )}
    </div>
  );
};
