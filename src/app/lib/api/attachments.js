import { apiFetch, API_BASE_URL } from "./client";

export function uploadAttachment(quoteId, type, file, { confirmOverwrite = false } = {}) {
  const formData = new FormData();
  formData.append("type", type);
  formData.append("file", file);
  if (confirmOverwrite) formData.append("confirmOverwrite", "true");

  return apiFetch(`/quotes/${quoteId}/attachments`, { method: "POST", body: formData });
}

export function listAttachments(quoteId) {
  return apiFetch(`/quotes/${quoteId}/attachments`);
}

export function attachmentDownloadUrl(quoteId, attachmentId) {
  return `${API_BASE_URL}/quotes/${quoteId}/attachments/${attachmentId}/download`;
}
