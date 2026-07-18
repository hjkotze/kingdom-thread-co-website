import { createContext, useCallback, useContext, useState } from "react";

const STORAGE_KEY = "blankets.quoteDraft";
const QuoteDraftContext = createContext(null);

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(draft) {
  try {
    if (draft) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage unavailable (e.g. private browsing) — draft just won't
    // survive a refresh/redirect, not fatal to the flow.
  }
}

// Persists the in-progress quote selection across the login/register
// redirect (§4: "resume the flow that was interrupted") and page refreshes
// within the same tab, without requiring the customer to be authenticated
// until the final submit step.
export function QuoteDraftProvider({ children }) {
  const [draft, setDraftState] = useState(loadDraft);
  // File objects can't be JSON-serialized into sessionStorage, so they live
  // only in memory. They survive the client-side login/register redirect
  // (the app never unmounts for that), but not a hard page refresh — an
  // acceptable gap, since no web app can persist File objects across a
  // reload without much heavier machinery (IndexedDB) than this needs.
  const [files, setFilesState] = useState({ image: null, text: null });

  const startDraft = useCallback((productId, fields) => {
    const next = { productId, ...fields };
    setDraftState(next);
    persist(next);
    setFilesState({ image: null, text: null });
  }, []);

  const updateDraft = useCallback((fields) => {
    setDraftState((prev) => {
      const next = { ...prev, ...fields };
      persist(next);
      return next;
    });
  }, []);

  const setDraftFile = useCallback((type, file) => {
    setFilesState((prev) => ({ ...prev, [type]: file }));
  }, []);

  const clearDraft = useCallback(() => {
    setDraftState(null);
    persist(null);
    setFilesState({ image: null, text: null });
  }, []);

  return (
    <QuoteDraftContext.Provider value={{ draft, files, startDraft, updateDraft, setDraftFile, clearDraft }}>
      {children}
    </QuoteDraftContext.Provider>
  );
}

export function useQuoteDraft() {
  const ctx = useContext(QuoteDraftContext);
  if (!ctx) throw new Error("useQuoteDraft must be used within a QuoteDraftProvider");
  return ctx;
}
