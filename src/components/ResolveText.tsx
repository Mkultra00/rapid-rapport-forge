import { useEffect, useRef, useState } from "react";

const POOL = "abcdefghijkmnpqrstuvwxyz23456789";

/** Characters scrambling and resolving into the derived marker. */
export function ResolveText({
  value,
  className = "",
  speed = 28,
}: {
  value: string;
  className?: string;
  speed?: number;
}) {
  const [shown, setShown] = useState(value);
  const frame = useRef(0);

  useEffect(() => {
    let raf = 0;
    let i = 0;
    frame.current = 0;
    const tick = () => {
      frame.current += 1;
      if (frame.current % 2 === 0) i += 1;
      const locked = Math.min(i, value.length);
      const out =
        value.slice(0, locked) +
        value
          .slice(locked)
          .split("")
          .map((c) => (/[a-z0-9]/i.test(c) ? POOL[Math.floor(Math.random() * POOL.length)] : c))
          .join("");
      setShown(out);
      if (locked < value.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, speed]);

  return (
    <span className={`mono-tag tabular-nums ${className}`} aria-label={value}>
      {shown}
    </span>
  );
}
