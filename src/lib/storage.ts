// Minimal IndexedDB key/value store for persisting the project locally.
//
// The whole project (document + image assets) is saved as a single record.
// IndexedDB is used instead of localStorage because base64 image data quickly
// exceeds localStorage's ~5MB ceiling.

import type { Asset, Zine } from "../types";

const DB_NAME = "zzzine";
const STORE = "kv";
const PROJECT_KEY = "project";

export interface PersistedProject {
  doc: Zine;
  assets: Asset[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveProject(project: PersistedProject): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(project, PROJECT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadProject(): Promise<PersistedProject | null> {
  const db = await openDb();
  try {
    return await new Promise<PersistedProject | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(PROJECT_KEY);
      req.onsuccess = () => resolve((req.result as PersistedProject) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function clearProject(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(PROJECT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}
