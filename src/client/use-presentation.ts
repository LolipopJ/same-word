import { useEffect, useState } from "react";

import { advancePresentation, type PresentationInput } from "./presentation.js";
import type { RoomUpdate } from "./room-update.js";

export function usePresentation(
  update: RoomUpdate | null,
  online: boolean,
  showResult: boolean,
) {
  const [environment, setEnvironment] = useState(() => ({
    visible: document.visibilityState === "visible",
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  }));
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const refresh = () =>
      setEnvironment({
        visible: document.visibilityState === "visible",
        reducedMotion: preference.matches,
      });
    document.addEventListener("visibilitychange", refresh);
    preference.addEventListener("change", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      preference.removeEventListener("change", refresh);
    };
  }, []);
  const input: PresentationInput = {
    update,
    online,
    showResult,
    ...environment,
  };
  const [state, setState] = useState(() => advancePresentation(null, input));
  if (
    state.input.update !== update ||
    state.input.online !== online ||
    state.input.showResult !== showResult ||
    state.input.visible !== environment.visible ||
    state.input.reducedMotion !== environment.reducedMotion
  ) {
    setState(advancePresentation(state, input));
  }
  const feedback = state.feedback;
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(
      () =>
        setState((current) =>
          current.feedback?.id === feedback.id
            ? { ...current, feedback: null }
            : current,
        ),
      feedback.success ? 2600 : 800,
    );
    return () => clearTimeout(timer);
  }, [feedback]);
  return {
    feedback,
    motionEnabled: online && environment.visible && !environment.reducedMotion,
  };
}
