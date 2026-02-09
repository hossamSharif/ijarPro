'use client';

import { useState, useEffect } from 'react';
import {
  onSnapshot,
  type Query,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore';

export type WithId<T> = T & { id: string };

interface UseCollectionResult<T> {
  data: WithId<T>[];
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export function useCollection<T extends DocumentData>(query: Query<T> | null): UseCollectionResult<T> {
  const [data, setData] = useState<WithId<T>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    if (!query) {
      return;
    }

    const unsub = onSnapshot(
      query,
      { includeMetadataChanges: true },
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setData(items);
        setFromCache(snapshot.metadata.fromCache);
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [query]);

  return { data, loading, error, fromCache, hasPendingWrites };
}

interface UseDocumentResult<T> {
  data: WithId<T> | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export function useDocument<T extends DocumentData>(ref: DocumentReference<T> | null): UseDocumentResult<T> {
  const [data, setData] = useState<WithId<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [hasPendingWrites, setHasPendingWrites] = useState(false);

  useEffect(() => {
    if (!ref) {
      return;
    }

    const unsub = onSnapshot(
      ref,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ ...snapshot.data(), id: snapshot.id });
        } else {
          setData(null);
        }
        setFromCache(snapshot.metadata.fromCache);
        setHasPendingWrites(snapshot.metadata.hasPendingWrites);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [ref]);

  return { data, loading, error, fromCache, hasPendingWrites };
}
