// Firebase implementation conforming to the common store interface
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, writeBatch, query, getDocs, orderBy } from 'firebase/firestore';

export function createFirebaseStore({ firebaseConfig, appId, initialAuthToken }) {
  let listeners = new Set();
  let unsubSnapshot = null;
  let db = null;
  let auth = null;
  let userId = null;

  const notify = (all) => listeners.forEach((cb) => cb(all));

  const collectionRef = () => collection(db, 'artifacts', appId, 'users', userId, 'bookmarks');

  const api = {
    async init() {
      if (!firebaseConfig) throw new Error('firebaseConfig required');
      const app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      await new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, async (user) => {
          if (user) {
            userId = user.uid;
            unsub();
            resolve();
          } else {
            try {
              if (initialAuthToken) await signInWithCustomToken(auth, initialAuthToken);
              else await signInAnonymously(auth);
            } catch (e) {
              // retry or resolve anyway
              resolve();
            }
          }
        });
      });
  // Subscribe to changes ordered by position (then title as tiebreaker)
  unsubSnapshot = onSnapshot(query(collectionRef(), orderBy('position', 'asc'), orderBy('title', 'asc')), (snapshot) => {
        const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        notify(all);
      });
    },
    async list() {
  const snap = await getDocs(query(collectionRef(), orderBy('position', 'asc'), orderBy('title', 'asc')));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async create(bookmark) {
      const ref = await addDoc(collectionRef(), { ...bookmark, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      await setDoc(ref, { id: ref.id }, { merge: true });
      return { ...bookmark, id: ref.id };
    },
    async update(id, patch) {
      const ref = doc(collectionRef(), id);
      await setDoc(ref, { ...patch, updatedAt: new Date().toISOString() }, { merge: true });
    },
    async remove(id) {
      const ref = doc(collectionRef(), id);
      await deleteDoc(ref);
    },
    async removeMany(ids = []) {
      if (!ids || ids.length === 0) return;
      const batch = writeBatch(db);
      ids.forEach((id) => {
        const ref = doc(collectionRef(), id);
        batch.delete(ref);
      });
      await batch.commit();
    },
    async bulkReplace(bookmarks) {
      const batch = writeBatch(db);
      const snap = await getDocs(query(collectionRef()));
      snap.forEach(d => batch.delete(d.ref));
      bookmarks.forEach((b, index) => {
        const dref = doc(collectionRef());
        batch.set(dref, { ...b, id: dref.id, position: typeof b.position === 'number' ? b.position : index, createdAt: b.createdAt || new Date().toISOString(), updatedAt: b.updatedAt || new Date().toISOString() });
      });
      await batch.commit();
    },
    /**
     * Set explicit order using a position field. Items not in orderedIds keep their relative order and are appended.
     */
    async reorderBookmarks(orderedIds = []) {
      const current = await this.list();
      const existingIds = current.map((b) => b.id);
      const orderedSet = new Set(orderedIds);
      const normalized = [
        ...orderedIds.filter((id) => existingIds.includes(id)),
        ...existingIds.filter((id) => !orderedSet.has(id)),
      ];
      const batch = writeBatch(db);
      normalized.forEach((id, idx) => {
        const ref = doc(collectionRef(), id);
        batch.set(ref, { position: idx, updatedAt: new Date().toISOString() }, { merge: true });
      });
      await batch.commit();
    },
    /**
     * Compute a sorted order by field and persist via positions.
     */
    async persistSortedOrder({ sortBy = 'title', order = 'asc' } = {}) {
      const list = await this.list();
      const sorted = [...list].sort((a, b) => {
        let valA = a[sortBy] ?? '';
        let valB = b[sortBy] ?? '';
        if (sortBy === 'rating') {
          valA = a.rating || 0;
          valB = b.rating || 0;
        } else {
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
        }
        if (order === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0;
        return valA > valB ? -1 : valA < valB ? 1 : 0;
      });
      const orderedIds = sorted.map((b) => b.id);
      await this.reorderBookmarks(orderedIds);
    }
  };

  return api;
}
