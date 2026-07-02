import { useState, useEffect, useRef } from 'react';

export function CounterUp({ end, duration = 2000, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  // Parse the end value to separate numbers from text
  const numValue = parseInt(end.toString().replace(/[^0-9]/g, ''), 10) || 0;
  // Use suffix passed as prop, or try to extract it from the end string if it's like "200+"
  const finalSuffix = suffix || end.toString().replace(/[0-9]/g, '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Opcional: desconectar si solo queremos que anime una vez
          // observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime = null;
    let animationFrameId;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const easeOut = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setCount(Math.floor(numValue * easeOut));

      if (percentage < 1) {
        animationFrameId = window.requestAnimationFrame(animate);
      } else {
        setCount(numValue);
      }
    };

    animationFrameId = window.requestAnimationFrame(animate);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [isVisible, numValue, duration]);

  return (
    <span ref={elementRef}>
      {count}{finalSuffix}
    </span>
  );
}
