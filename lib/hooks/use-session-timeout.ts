'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getDoc } from 'firebase/firestore';
import { signOut } from '@/lib/firebase/auth';
import { companyRef } from '@/lib/firebase/firestore';

const DEFAULT_TIMEOUT_MINUTES = 30;
const WARNING_BEFORE_MS = 60_000; // Show warning 1 minute before logout

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;

export function useSessionTimeout() {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timeoutMs = useRef(DEFAULT_TIMEOUT_MINUTES * 60_000);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    logoutTimer.current = null;
    warningTimer.current = null;
    countdownInterval.current = null;
  }, []);

  const handleLogout = useCallback(async () => {
    clearTimers();
    setShowWarning(false);
    await signOut();
  }, [clearTimers]);

  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    const warningAt = timeoutMs.current - WARNING_BEFORE_MS;

    if (warningAt > 0) {
      warningTimer.current = setTimeout(() => {
        setShowWarning(true);
        setSecondsLeft(Math.ceil(WARNING_BEFORE_MS / 1000));
        countdownInterval.current = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              handleLogout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, warningAt);
    }

    logoutTimer.current = setTimeout(() => {
      handleLogout();
    }, timeoutMs.current);
  }, [clearTimers, handleLogout]);

  const stayLoggedIn = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  // Load company session timeout setting
  useEffect(() => {
    getDoc(companyRef).then((snap) => {
      if (snap.exists()) {
        const timeout = snap.data().sessionTimeout;
        if (timeout && timeout >= 5) {
          timeoutMs.current = timeout * 60_000;
        }
      }
      resetTimers();
    }).catch(() => {
      resetTimers();
    });

    return () => clearTimers();
  }, [resetTimers, clearTimers]);

  // Listen for user activity to reset timers
  useEffect(() => {
    const onActivity = () => {
      if (!showWarning) {
        resetTimers();
      }
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true });
    }

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity);
      }
    };
  }, [resetTimers, showWarning]);

  return {
    showWarning,
    secondsLeft,
    stayLoggedIn,
    logout: handleLogout,
  };
}
