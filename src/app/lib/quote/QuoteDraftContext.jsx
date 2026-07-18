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

  const startDraft = useCallback((productId, fields) => {
    const next = { productId, ...fields };
    setDraftState(next);
    persist(next);
  }, []);

  const updateDraft = useCallback((fields) => {
    setDraftState((prev) => {
      const next = { ...prev, ...fields };
      persist(next);
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    setDraftState(null);
    persist(null);
  }, []);

  return (
    <QuoteDraftContext.Provider value={{ draft, startDraft, updateDraft, clearDraft }}>
      {children}
    </QuoteDraftContext.Provider>
  );
}

export function useQuoteDraft() {
  const ctx = useContext(QuoteDraftContext);
  if (!ctx) throw new Error("useQuoteDraft must be used within a QuoteDraftProvider");
  return ctx;
}
