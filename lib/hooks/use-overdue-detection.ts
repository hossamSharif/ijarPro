'use client';

import { useEffect, useRef } from 'react';
import {
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { invoicesCollection, invoiceDoc } from '@/lib/firebase/firestore';
import type { Invoice } from '@/lib/types/models';

/**
 * On dashboard load, checks for invoices that should be marked overdue.
 * Transitions issued/partially_paid invoices past their rentalPeriodEnd to overdue.
 * Runs once per session (per mount).
 */
export function useOverdueDetection(userId: string | undefined, userName: string | undefined) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!userId || !userName || hasRun.current) return;
    hasRun.current = true;

    async function detectOverdue() {
      const now = Timestamp.now();

      // Query issued invoices past rental period end
      const issuedQuery = query(
        invoicesCollection,
        where('status', '==', 'issued'),
        where('rentalPeriodEnd', '<', now)
      );

      const partialQuery = query(
        invoicesCollection,
        where('status', '==', 'partially_paid'),
        where('rentalPeriodEnd', '<', now)
      );

      const [issuedSnap, partialSnap] = await Promise.all([
        getDocs(issuedQuery),
        getDocs(partialQuery),
      ]);

      const overdueInvoices: Array<{ id: string; data: Invoice }> = [];

      issuedSnap.forEach((docSnap) => {
        overdueInvoices.push({ id: docSnap.id, data: docSnap.data() });
      });
      partialSnap.forEach((docSnap) => {
        overdueInvoices.push({ id: docSnap.id, data: docSnap.data() });
      });

      if (overdueInvoices.length === 0) return;

      // Batch update all overdue invoices
      const batch = writeBatch(db);

      for (const inv of overdueInvoices) {
        const ref = invoiceDoc(inv.id);
        batch.update(ref, {
          status: 'overdue',
          statusHistory: arrayUnion({
            status: 'overdue',
            timestamp: now,
            userId: userId!,
            note: 'Auto-detected overdue',
          }),
          updatedAt: now,
          updatedBy: userId!,
        });
      }

      await batch.commit();
    }

    detectOverdue().catch(() => {
      // Silently fail — will retry on next dashboard visit
    });
  }, [userId, userName]);
}
