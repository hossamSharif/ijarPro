'use client';

import {
  collection,
  doc,
  type DocumentData,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
  type SnapshotOptions,
  type WithFieldValue,
} from 'firebase/firestore';
import { db } from './config';
import type {
  Company,
  User,
  Building,
  Apartment,
  Customer,
  Invoice,
  Expense,
  Counter,
  AuditLogEntry,
} from '@/lib/types/models';
import type { Account, JournalEntry } from '@/lib/types/accounting';

function createConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: WithFieldValue<T>): DocumentData {
      return data as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): T {
      return snapshot.data(options) as T;
    },
  };
}

// Typed converters
export const companyConverter = createConverter<Company>();
export const userConverter = createConverter<User>();
export const buildingConverter = createConverter<Building>();
export const apartmentConverter = createConverter<Apartment>();
export const customerConverter = createConverter<Customer>();
export const invoiceConverter = createConverter<Invoice>();
export const expenseConverter = createConverter<Expense>();
export const journalEntryConverter = createConverter<JournalEntry>();
export const accountConverter = createConverter<Account>();
export const counterConverter = createConverter<Counter>();
export const auditLogConverter = createConverter<AuditLogEntry>();

// Typed collection references
export const companyRef = doc(db, 'company', 'profile').withConverter(companyConverter);

export const usersCollection = collection(db, 'users').withConverter(userConverter);
export const userDoc = (uid: string) => doc(db, 'users', uid).withConverter(userConverter);

export const buildingsCollection = collection(db, 'buildings').withConverter(buildingConverter);
export const buildingDoc = (id: string) => doc(db, 'buildings', id).withConverter(buildingConverter);

export const apartmentsCollection = collection(db, 'apartments').withConverter(apartmentConverter);
export const apartmentDoc = (id: string) => doc(db, 'apartments', id).withConverter(apartmentConverter);

export const customersCollection = collection(db, 'customers').withConverter(customerConverter);
export const customerDoc = (id: string) => doc(db, 'customers', id).withConverter(customerConverter);

export const invoicesCollection = collection(db, 'invoices').withConverter(invoiceConverter);
export const invoiceDoc = (id: string) => doc(db, 'invoices', id).withConverter(invoiceConverter);

export const expensesCollection = collection(db, 'expenses').withConverter(expenseConverter);
export const expenseDoc = (id: string) => doc(db, 'expenses', id).withConverter(expenseConverter);

export const journalEntriesCollection = collection(db, 'journalEntries').withConverter(journalEntryConverter);
export const journalEntryDoc = (id: string) => doc(db, 'journalEntries', id).withConverter(journalEntryConverter);

export const accountsCollection = collection(db, 'accounts').withConverter(accountConverter);
export const accountDoc = (id: string) => doc(db, 'accounts', id).withConverter(accountConverter);

export const counterDoc = (id: string) => doc(db, 'counters', id).withConverter(counterConverter);

export const auditLogCollection = collection(db, 'auditLog').withConverter(auditLogConverter);
