import { useCallback, useEffect, useRef, useState } from "react";

/** Inactivité tolérée avant l'avertissement, puis délai pour répondre avant la déconnexion. */
export const IDLE_MS = 15 * 60_000;
export const WARNING_MS = 60_000;

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Déconnecte la personne après une période sans activité : un avertissement s'affiche d'abord
 * (« Rester connecté »), puis la déconnexion a lieu quand le délai de réponse est écoulé.
 * Le jeton Keycloak se renouvelle seul : sans ce garde-fou, une session oubliée sur un poste partagé resterait ouverte.
 */
export function useIdleLogout(enabled: boolean, onTimeout: () => void, idleMs = IDLE_MS, warningMs = WARNING_MS) {
  const [warning, setWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(warningMs / 1000));
  const lastActivity = useRef(0);
  const warningRef = useRef(false);
  const onTimeoutRef = useRef(onTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  const stay = useCallback(() => {
    lastActivity.current = Date.now();
    warningRef.current = false;
    setWarning(false);
  }, []);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    lastActivity.current = Date.now();
    warningRef.current = false;

    // Pendant l'avertissement, seul le bouton « Rester connecté » compte : un simple mouvement de souris ne suffit pas.
    const onActivity = () => {
      if (!warningRef.current) {
        lastActivity.current = Date.now();
      }
    };

    ACTIVITY_EVENTS.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;

      if (idle >= idleMs + warningMs) {
        window.clearInterval(timer);
        warningRef.current = false;
        setWarning(false);
        onTimeoutRef.current();
      } else if (idle >= idleMs) {
        warningRef.current = true;
        setWarning(true);
        setSecondsLeft(Math.max(0, Math.ceil((idleMs + warningMs - idle) / 1000)));
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      ACTIVITY_EVENTS.forEach((name) => window.removeEventListener(name, onActivity));
    };
  }, [enabled, idleMs, warningMs]);

  return { warning: enabled && warning, secondsLeft, stay };
}
