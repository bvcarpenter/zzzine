// Local persistence of multiple named drafts in IndexedDB.
//
// Each draft's full data (document + image assets) is stored under its own key
// so listing drafts only reads a small index, not every image. The draft's
// display name mirrors its document title.

import type { Asset, Zine } from "../types";

const DB_NAME = "zzzine";
const STORE = "kv";
const INDEX_KEY = "draftIndex";
const CURRENT_KEY = "currentDraftId";
const LEGACY_KEY = "project";
const draftKey = (id: string) => `draft:${id}`;

export interface DraftMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface DraftData {
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

function kvGet<T>(key: string): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const req = tx.objectStore(STORE).get(key);
        req.onsuccess = () => {
          resolve(req.result as T | undefined);
          db.close();
        };
        req.onerror = () => {
          reject(req.error);
          db.close();
        };
      }),
  );
}

function kvSet(key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => {
          resolve();
          db.close();
        };
        tx.onerror = () => {
          reject(tx.error);
          db.close();
        };
      }),
  );
}

export async function getDraftIndex(): Promise<DraftMeta[]> {
  return (await kvGet<DraftMeta[]>(INDEX_KEY)) ?? [];
}

export async function getCurrentDraftId(): Promise<string | null> {
  return (await kvGet<string>(CURRENT_KEY)) ?? null;
}

export async function setCurrentDraftId(id: string): Promise<void> {
  await kvSet(CURRENT_KEY, id);
}

export async function loadDraft(id: string): Promise<DraftData | null> {
  return (await kvGet<DraftData>(draftKey(id))) ?? null;
}

/** Write a draft's data and upsert its index entry in one transaction. */
export async function saveDraft(
  id: string,
  name: string,
  data: DraftData,
): Promise<DraftMeta[]> {
  const db = await openDb();
  try {
    return await new Promise<DraftMeta[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      const now = Date.now();
      store.put(data, draftKey(id));
      let nextIndex: DraftMeta[] = [];
      const getReq = store.get(INDEX_KEY);
      getReq.onsuccess = () => {
        const idx = (getReq.result as DraftMeta[]) ?? [];
        const existing = idx.find((m) => m.id === id);
        if (existing) {
          nextIndex = idx.map((m) =>
            m.id === id ? { ...m, name, updatedAt: now } : m,
          );
        } else {
          nextIndex = [...idx, { id, name, createdAt: now, updatedAt: now }];
        }
        store.put(nextIndex, INDEX_KEY);
      };
      tx.oncomplete = () => resolve(nextIndex);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteDraft(id: string): Promise<DraftMeta[]> {
  const db = await openDb();
  try {
    return await new Promise<DraftMeta[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      store.delete(draftKey(id));
      let nextIndex: DraftMeta[] = [];
      const getReq = store.get(INDEX_KEY);
      getReq.onsuccess = () => {
        const idx = (getReq.result as DraftMeta[]) ?? [];
        nextIndex = idx.filter((m) => m.id !== id);
        store.put(nextIndex, INDEX_KEY);
      };
      tx.oncomplete = () => resolve(nextIndex);
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Rename a draft (updates the index and the stored document title). */
export async function renameDraft(id: string, name: string): Promise<void> {
  const data = await loadDraft(id);
  if (!data) return;
  await saveDraft(id, name, { ...data, doc: { ...data.doc, title: name } });
}

/**
 * One-time migration: an older single "project" record becomes the first
 * draft. Also initializes an empty index so this only runs once.
 */
export async function migrateLegacyIfNeeded(): Promise<void> {
  const idx = await kvGet<DraftMeta[]>(INDEX_KEY);
  if (idx) return;
  const legacy = await kvGet<DraftData>(LEGACY_KEY);
  if (legacy?.doc) {
    const id = "draft-legacy";
    await saveDraft(id, legacy.doc.title || "My zine", legacy);
    await setCurrentDraftId(id);
  } else {
    await kvSet(INDEX_KEY, []);
  }
}
