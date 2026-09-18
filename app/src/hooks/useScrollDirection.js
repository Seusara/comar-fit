import { useEffect, useRef, useState } from 'react';

const THRESHOLD = 10;
const TOP_OFFSET = 40;

export function useScrollDirection() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function handleScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;

      if (y <= TOP_OFFSET) {
        setHidden(false);
      } else if (delta > THRESHOLD) {
        setHidden(true);
        lastY.current = y;
      } else if (delta < -THRESHOLD) {
        setHidden(false);
        lastY.current = y;
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return hidden;
}
