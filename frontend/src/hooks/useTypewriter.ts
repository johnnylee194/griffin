import { useState, useEffect, useRef } from 'react';

export function useTypewriter(text: string, speed: number = 30) {
  const [displayed, setDisplayed] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!text) {
      setDisplayed('');
      setIsComplete(true);
      return;
    }

    indexRef.current = 0;
    setDisplayed('');
    setIsComplete(false);

    timerRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        const nextLen = Math.min(indexRef.current + 3, text.length);
        setDisplayed(text.slice(0, nextLen));
        indexRef.current = nextLen;
      } else {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setIsComplete(true);
      }
    }, speed);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [text, speed]);

  return { displayed, isComplete };
}
