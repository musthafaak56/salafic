import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
} from "firebase/firestore";

// Compatibility for the existing domain workflows. Authorization is always enforced
// by Firestore rules, never by this browser-side adapter or its permission helpers.
export function sparkStore(database) {
  const snapshot = (s) => ({
    id: s.id,
    exists: s.exists(),
    data: () => s.data(),
  });
  const snapshots = (s) => ({
    docs: s.docs.map(snapshot),
    size: s.size,
    empty: s.empty,
  });
  function ref(path, isCollection = false, constraints = []) {
    const native = isCollection
      ? query(collection(database, path), ...constraints)
      : doc(database, path);
    return {
      id: path.split("/").at(-1),
      native,
      isCollection,
      doc: (id = doc(collection(database, path)).id) => ref(`${path}/${id}`),
      collection: (name) => ref(`${path}/${name}`, true),
      where: (...args) => ref(path, true, [...constraints, where(...args)]),
      limit: (count) => ref(path, true, [...constraints, limit(count)]),
      get: async () =>
        isCollection
          ? snapshots(await getDocs(native))
          : snapshot(await getDoc(native)),
    };
  }
  return {
    doc: (path) => ref(path),
    collection: (path) => ref(path, true),
    runTransaction: (work) =>
      runTransaction(database, (tx) =>
        work({
          // Collection reads are used only for reconciliation, fenced by financeState
          // read first in the transaction. Every ledger mutation also changes that state.
          get: async (r) =>
            r.isCollection ? r.get() : snapshot(await tx.get(r.native)),
          set: (r, value) => tx.set(r.native, value),
          create: (r, value) => tx.set(r.native, value),
          update: (r, value) => tx.update(r.native, value),
          delete: (r) => tx.delete(r.native),
        }),
      ),
  };
}
