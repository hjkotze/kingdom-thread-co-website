import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Download, AlertTriangle } from "lucide-react";
import { uploadAttachment, attachmentDownloadUrl } from "../../lib/api/attachments";
import { ApiError } from "../../lib/api/client";
import FileDropzone from "./FileDropzone";

const TYPE_CONFIG = {
  image: {
    label: "Image",
    icon: ImageIcon,
    accept: ".png,.jpg,.jpeg,.webp,.svg",
    helperText: "PNG, JPG, WEBP, SVG · max 20 MB",
  },
  text: {
    label: "Text / wording file",
    icon: FileText,
    accept: ".txt,.pdf,.doc,.docx",
    helperText: "TXT, PDF, DOC, DOCX · max 20 MB",
  },
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsSection({ quoteId, attachments, onUploaded }) {
  return (
    <div className="flex flex-col gap-6">
      {Object.keys(TYPE_CONFIG).map((type) => (
        <TypeSlot
          key={type}
          type={type}
          quoteId={quoteId}
          attachments={attachments.filter((a) => a.fileType === type)}
          onUploaded={onUploaded}
        />
      ))}
    </div>
  );
}

function TypeSlot({ type, quoteId, attachments, onUploaded }) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  const current = attachments.find((a) => a.isCurrent);
  const history = attachments.filter((a) => !a.isCurrent);

  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const replaceInputRef = useRef(null);

  const doUpload = async (file, confirmOverwrite) => {
    setUploading(true);
    setError("");
    try {
      await uploadAttachment(quoteId, type, file, { confirmOverwrite });
      setPendingFile(null);
      onUploaded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-muted-foreground" />
        <h3 className="text-sm text-foreground font-medium">{config.label}</h3>
      </div>

      {error && (
        <p
          className="text-xs text-destructive bg-destructive/10 border border-destructive/30 px-3 py-2 mb-2"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error}
        </p>
      )}

      {pendingFile ? (
        <div
          className="border border-accent bg-accent/10 p-4 flex flex-col gap-3"
          style={{ borderRadius: "var(--radius)" }}
        >
          <p className="text-sm text-foreground flex items-start gap-2">
            <AlertTriangle size={16} className="text-accent shrink-0 mt-0.5" />
            This will replace your current {config.label.toLowerCase()} (
            <strong>{current?.originalFilename}</strong>) with <strong>{pendingFile.name}</strong>. The
            previous file stays on record but won't be used going forward.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => doUpload(pendingFile, true)}
              disabled={uploading}
              className="bg-accent text-accent-foreground px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
              style={{ borderRadius: "var(--radius)" }}
            >
              {uploading ? "Replacing…" : "Replace file"}
            </button>
            <button
              onClick={() => setPendingFile(null)}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : current ? (
        <div
          className="border border-border p-4 flex items-center justify-between gap-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          <div className="min-w-0">
            <p className="text-sm text-foreground truncate">{current.originalFilename}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(current.sizeBytes)} · uploaded {new Date(current.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={attachmentDownloadUrl(quoteId, current.id)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={`Download ${current.originalFilename}`}
            >
              <Download size={16} />
            </a>
            <button
              onClick={() => replaceInputRef.current?.click()}
              className="text-xs text-accent font-medium"
            >
              Replace
            </button>
          </div>
          <input
            ref={replaceInputRef}
            type="file"
            accept={config.accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setPendingFile(file);
              e.target.value = "";
            }}
          />
        </div>
      ) : (
        <FileDropzone
          label=""
          accept={config.accept}
          helperText={config.helperText}
          fileName={uploading ? "Uploading…" : null}
          onSelect={(file) => doUpload(file, false)}
        />
      )}

      {history.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowHistory((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showHistory ? "Hide" : "Show"} previous uploads ({history.length})
          </button>
          {showHistory && (
            <ul className="flex flex-col gap-1.5 mt-2">
              {history.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span className="truncate">{a.originalFilename}</span>
                  <span className="flex items-center gap-3 shrink-0">
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    <a href={attachmentDownloadUrl(quoteId, a.id)} className="hover:text-foreground">
                      <Download size={12} />
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
