import { runTransaction } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { counterDoc } from '@/lib/firebase/firestore';

function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let deviceId = localStorage.getItem('ijar-device-id');
  if (!deviceId) {
    deviceId = crypto.randomUUID().slice(0, 12);
    localStorage.setItem('ijar-device-id', deviceId);
  }
  return deviceId;
}

const SEQ_STORAGE_KEY = 'ijar-offline-invoice-seq';

function getPersistedSeq(): number {
  if (typeof window === 'undefined') return 0;
  const stored = localStorage.getItem(SEQ_STORAGE_KEY);
  return stored ? parseInt(stored, 10) || 0 : 0;
}

let localSeq = -1; // -1 signals uninitialized

export function generateOfflineInvoiceId(): string {
  if (localSeq === -1) {
    localSeq = getPersistedSeq();
  }
  localSeq++;
  if (typeof window !== 'undefined') {
    localStorage.setItem(SEQ_STORAGE_KEY, String(localSeq));
  }
  const deviceId = getDeviceId();
  return `OFFLINE-${deviceId}-${localSeq}`;
}

export function isOfflineInvoiceId(id: string): boolean {
  return id.startsWith('OFFLINE-');
}

export async function getNextInvoiceNumber(prefix: string = 'INV-', padding: number = 4): Promise<string> {
  const ref = counterDoc('invoices');

  const newValue = await runTransaction(db, async (transaction) => {
    const doc = await transaction.get(ref);
    let currentValue = 0;

    if (doc.exists()) {
      currentValue = doc.data().currentValue;
    }

    const nextValue = currentValue + 1;
    transaction.set(ref, {
      currentValue: nextValue,
      prefix,
      padding,
    });
    return nextValue;
  });

  return `${prefix}${String(newValue).padStart(padding, '0')}`;
}

export async function getNextCreditNoteNumber(): Promise<string> {
  const ref = counterDoc('creditNotes');

  const newValue = await runTransaction(db, async (transaction) => {
    const doc = await transaction.get(ref);
    let currentValue = 0;

    if (doc.exists()) {
      currentValue = doc.data().currentValue;
    }

    const nextValue = currentValue + 1;
    transaction.set(ref, {
      currentValue: nextValue,
      prefix: 'CN-',
      padding: 4,
    });
    return nextValue;
  });

  return `CN-${String(newValue).padStart(4, '0')}`;
}
