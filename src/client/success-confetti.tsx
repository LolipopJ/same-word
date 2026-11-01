import confetti from "canvas-confetti";
import { useEffect, useRef } from "react";

export function SuccessConfetti({ requestId }: { requestId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d")!;
    const theme = getComputedStyle(document.documentElement);
    const colors = [
      "--color-primary",
      "--color-secondary",
      "--color-accent",
    ].map((token) => {
      context.fillStyle = theme.getPropertyValue(token);
      context.fillRect(0, 0, 1, 1);
      const [red, green, blue] = context.getImageData(0, 0, 1, 1).data;
      return `#${[red!, green!, blue!].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
    });
    context.clearRect(0, 0, canvas.width, canvas.height);
    const burst = confetti.create(canvas, {
      resize: true,
      disableForReducedMotion: true,
    });
    const budget = matchMedia("(min-width: 640px)").matches ? 120 : 60;
    for (const side of [0, 1]) {
      void burst({
        particleCount: budget / 2,
        angle: side === 0 ? 60 : 120,
        spread: 65,
        startVelocity: 35,
        ticks: 150,
        colors,
        origin: { x: side, y: 0.65 },
      });
    }
    const timer = setTimeout(() => burst.reset(), 2500);
    return () => {
      clearTimeout(timer);
      burst.reset();
    };
  }, [requestId]);
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-20 size-full"
    />
  );
}
