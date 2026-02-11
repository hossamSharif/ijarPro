'use client';

import { useState, useEffect, useCallback } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { onAuthChange, refreshToken } from '@/lib/firebase/auth';
import { userDoc } from '@/lib/firebase/firestore';
import type { User } from '@/lib/types/models';

interface AuthState {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    firebaseUser: null,
    userProfile: null,
    loading: true,
    error: null,
  });

  const forceRefreshToken = useCallback(async () => {
    if (state.firebaseUser) {
      await refreshToken(state.firebaseUser);
    }
  }, [state.firebaseUser]);

  useEffect(() => {
    const unsubAuth = onAuthChange((firebaseUser) => {
      if (!firebaseUser) {
        setState({ firebaseUser: null, userProfile: null, loading: false, error: null });
        return;
      }

      setState((prev) => ({ ...prev, firebaseUser, loading: true }));

      const unsubProfile = onSnapshot(
        userDoc(firebaseUser.uid),
        (doc) => {
          if (doc.exists()) {
            setState({
              firebaseUser,
              userProfile: doc.data(),
              loading: false,
              error: null,
            });
          } else {
            setState({
              firebaseUser,
              userProfile: null,
              loading: false,
              error: 'User profile not found',
            });
          }
        },
        (error) => {
          setState((prev) => ({ ...prev, loading: false, error: error.message }));
        }
      );

      return () => unsubProfile();
    });

    return () => unsubAuth();
  }, []);

  const isAdmin = state.userProfile?.role === 'admin';
  const isAuthenticated = !!state.firebaseUser;

  return {
    ...state,
    isAdmin,
    isAuthenticated,
    forceRefreshToken,
  };
}
