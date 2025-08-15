// Local composite store: Chrome Bookmarks for storage + localStorage for metadata
// Persists bookmark nodes in Chrome bookmarks; stores additional metadata (description, tags, rating, faviconUrl, urlStatus, timestamps)
// in sessionStorage keyed by bookmark id. This allows non-destructive metadata alongside native Chrome bookmarks.

import { createChromeBookmarksStore } from './chromeBookmarksStore.js';

const META_KEY_PREFIX = 'bm_meta:'; // localStorage key prefix

function readMeta(id) {
  try {
    const raw = localStorage.getItem(META_KEY_PREFIX + id);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeMeta(id, meta) {
  try {
    localStorage.setItem(META_KEY_PREFIX + id, JSON.stringify(meta || {}));
  } catch {}
}

function deleteMeta(id) {
  try { localStorage.removeItem(META_KEY_PREFIX + id); } catch {}
}

function mergeNodeWithMeta(node) {
  const meta = readMeta(node.id);
  return {
    ...node,
    description: meta.description ?? node.description ?? '',
    tags: meta.tags ?? node.tags ?? [],
    rating: meta.rating ?? node.rating ?? 0,
    faviconUrl: meta.faviconUrl ?? node.faviconUrl ?? '',
    urlStatus: meta.urlStatus ?? node.urlStatus ?? 'valid',
    createdAt: meta.createdAt ?? node.createdAt ?? '',
    updatedAt: meta.updatedAt ?? node.updatedAt ?? '',
  // Prefer stored folderId label when present, else underlying node folder
  folderId: meta.folderId ?? node.folderId ?? '',
  };
}

export function createLocalCompositeStore(options = {}) {
  const chromeStore = createChromeBookmarksStore(options);
  let listeners = new Set();

  const notify = async () => {
    const all = await api.list();
    listeners.forEach((cb) => cb(all));
  };

  const api = {
    async init() {
      // Initialize underlying chrome store and subscribe to propagate updates
      await chromeStore.init?.();
      // When chrome changes, refresh and re-emit merged bookmarks
      chromeStore.subscribe?.(() => notify());
      await notify();
    },
    async list() {
      const base = await chromeStore.list();
      return base.map(mergeNodeWithMeta);
    },
    /**
     * Reorder persisted bookmark order using underlying chrome store.
     */
    async reorderBookmarks(orderedIds = []) {
      if (typeof chromeStore.reorderBookmarks === 'function') {
        await chromeStore.reorderBookmarks(orderedIds);
      }
      await notify();
    },
    /**
     * Persist sorted order for bookmarks according to sortBy and order.
     */
    async persistSortedOrder({ sortBy = 'title', order = 'asc' } = {}) {
      // Compute sorted order from merged metadata so rating/tags/title work consistently
      const merged = await this.list();
      const key = sortBy === 'folder' ? 'folderId' : sortBy;
      const sorted = [...merged].sort((a, b) => {
        let valA = a[key] ?? '';
        let valB = b[key] ?? '';
        if (key === 'rating') {
          valA = a.rating || 0;
          valB = b.rating || 0;
        } else if (key === 'createdAt' || key === 'updatedAt') {
          valA = a[key] ? new Date(a[key]).getTime() : 0;
          valB = b[key] ? new Date(b[key]).getTime() : 0;
        } else {
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
        }
        if (order === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0;
        return valA > valB ? -1 : valA < valB ? 1 : 0;
      });
      const orderedIds = sorted.map((b) => b.id);
      if (typeof chromeStore.reorderBookmarks === 'function') {
        await chromeStore.reorderBookmarks(orderedIds);
      } else if (typeof chromeStore.persistSortedOrder === 'function') {
        await chromeStore.persistSortedOrder({ sortBy, order });
      }
      await notify();
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async create(bookmark) {
      // Create in chrome first (title/url only supported)
      const node = await chromeStore.create({ title: bookmark.title, url: bookmark.url, folderId: bookmark.folderId });
      // Save metadata separately
      const now = new Date().toISOString();
      writeMeta(node.id, {
        description: bookmark.description || '',
        tags: bookmark.tags || [],
        rating: bookmark.rating || 0,
        faviconUrl: bookmark.faviconUrl || node.faviconUrl || '',
        urlStatus: bookmark.urlStatus || 'valid',
        folderId: bookmark.folderId || '',
        createdAt: bookmark.createdAt || now,
        updatedAt: bookmark.updatedAt || now,
      });
      await notify();
      return mergeNodeWithMeta(node);
    },
    async update(id, patch) {
      // Split supported chrome fields vs metadata
      const chromePatch = {};
      if (typeof patch.title === 'string') chromePatch.title = patch.title;
      if (typeof patch.url === 'string') chromePatch.url = patch.url;
      if (Object.prototype.hasOwnProperty.call(patch, 'folderId')) chromePatch.folderId = patch.folderId;
      if (Object.keys(chromePatch).length > 0) {
        await chromeStore.update(id, chromePatch);
      }
      // Merge and write metadata
      const meta = readMeta(id);
      const merged = {
        ...meta,
        description: patch.description ?? meta.description ?? '',
        tags: patch.tags ?? meta.tags ?? [],
        rating: patch.rating ?? meta.rating ?? 0,
        faviconUrl: patch.faviconUrl ?? meta.faviconUrl ?? '',
        urlStatus: patch.urlStatus ?? meta.urlStatus ?? 'valid',
        folderId: patch.folderId ?? meta.folderId ?? '',
        createdAt: meta.createdAt ?? '',
        updatedAt: new Date().toISOString(),
      };
      writeMeta(id, merged);
      await notify();
    },
    async remove(id) {
      await chromeStore.remove(id);
      deleteMeta(id);
      await notify();
    },
    async removeMany(ids = []) {
      if (typeof chromeStore.removeMany === 'function') {
        await chromeStore.removeMany(ids);
      } else {
        for (const id of ids) {
          await chromeStore.remove(id).catch(() => {});
        }
      }
      ids.forEach(deleteMeta);
      await notify();
    },
    async bulkReplace(bookmarks) {
      // Replace chrome list with provided entries (title/url only), then write metadata for each
      await chromeStore.bulkReplace(bookmarks);
      // After replace, chrome will have new IDs; we need to map titles/urls back to ids.
      // Strategy: read current list and build a lookup by title+url (case-insensitive)
      const current = await chromeStore.list();
      const index = new Map(current.map(n => [`${(n.title||'').toLowerCase()}|${(n.url||'').toLowerCase()}`, n]));
      // Clear all old meta that no longer match current IDs for safety? We'll keep as-is to avoid data loss.
      for (const b of bookmarks) {
        const key = `${(b.title||'').toLowerCase()}|${(b.url||'').toLowerCase()}`;
        const node = index.get(key);
        if (!node) continue;
        const now = new Date().toISOString();
        writeMeta(node.id, {
          description: b.description || '',
          tags: b.tags || [],
          rating: b.rating || 0,
          faviconUrl: b.faviconUrl || node.faviconUrl || '',
          urlStatus: b.urlStatus || 'valid',
          folderId: b.folderId || '',
          createdAt: b.createdAt || now,
          updatedAt: b.updatedAt || now,
        });
      }
      await notify();
    }
  };

  return api;
}
