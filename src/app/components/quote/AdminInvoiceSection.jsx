import { useState } from "react";
import LineItemsTable from "./LineItemsTable";
import {
  recordInvoicePayment,
  sendInvoice,
  invoicePdfUrl,
  workOrderPdfUrl,
} from "../../lib/api/adminInvoices";
import { ApiError } from "../../lib/api/client";

const today = () => new Date().toISOString().slice(0, 10);

// Only rendered once a quote has actually been accepted — an invoice is
// auto-generated at that point (see server acceptSnapshot), but no longer
// auto-emailed: it starts "not yet sent" until the explicit Send action
// below, so shipping/notes can be reviewed first.
export default function AdminInvoiceSection({ invoice, lines, payments, workOrders, customerAddress, onUpdated }) {
  const [amount, setAmount] = useState("");
  const [paidAt, setPaidAt] = useState(today());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (!invoice) return null;

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await recordInvoicePayment(invoice.id, { amount: Number(amount), paidAt, note });
      setAmount("");
      setNote("");
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendInvoice = async () => {
    setSending(true);
    setError("");
    try {
      await sendInvoice(invoice.id);
      onUpdated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to send invoice.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-sm text-foreground font-medium mb-4">Invoice {invoice.invoiceNumber}</h2>

      {error && (
        <p
          className="text-sm text-destructive bg-destructive/10 border border-destructive/30 px-4 py-2.5 mb-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          {error}
        </p>
      )}

      {customerAddress && (
        <div className="mb-4 text-sm text-foreground">
          <p className="text-xs text-muted-foreground font-medium mb-1">Delivery address</p>
          <p className="whitespace-pre-line">{customerAddress}</p>
        </div>
      )}

      <div className="mb-4">
        <LineItemsTable
          lines={lines}
          shippingAmount={invoice.shippingAmount}
          vatRatePercent={invoice.vatRatePercent}
          vatAmount={invoice.vatAmount}
          total={invoice.total}
        />
      </div>

      <div className="bg-card border border-border p-5 mb-4" style={{ borderRadius: "var(--radius)" }}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Amount paid</span>
          <span className="text-foreground">R{invoice.amountPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-muted-foreground">Outstanding balance</span>
          <span className="text-foreground font-medium">R{invoice.outstanding.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <a href={invoicePdfUrl(invoice.id)} className="text-xs text-accent font-medium" target="_blank" rel="noreferrer">
            Download invoice PDF
          </a>
          <button
            onClick={handleSendInvoice}
            disabled={sending}
            className="text-xs text-accent font-medium disabled:opacity-60"
          >
            {sending ? "Sending…" : invoice.sentAt ? "Resend invoice" : "Send invoice"}
          </button>
          {invoice.sentAt && (
            <span className="text-xs text-muted-foreground">Sent {new Date(invoice.sentAt).toLocaleString()}</span>
          )}
        </div>

        {payments.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Payments received</p>
            <div className="flex flex-col gap-1.5">
              {payments.map((p) => (
                <div key={p.id} className="flex justify-between text-xs text-foreground">
                  <span>
                    {new Date(p.paidAt).toLocaleDateString()}
                    {p.note ? ` — ${p.note}` : ""}
                  </span>
                  <span>R{p.amount}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border" style={{ borderColor: workOrders.length > 0 ? "var(--accent)" : "var(--border)" }}>
          {workOrders.length > 0 ? (
            <div className="flex flex-col gap-1">
              {workOrders.map((wo) => (
                <p key={wo.id} className="text-xs text-accent font-medium">
                  Work order {wo.workOrderNumber} generated —{" "}
                  <a href={workOrderPdfUrl(invoice.id)} target="_blank" rel="noreferrer">
                    download PDF
                  </a>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Awaiting full payment (R{invoice.total.toFixed(2)}) before the work order is generated.
            </p>
          )}
        </div>
      </div>

      {invoice.outstanding > 0 && (
        <form
          onSubmit={handleRecordPayment}
          className="bg-card border border-border p-5 flex flex-col gap-4"
          style={{ borderRadius: "var(--radius)" }}
        >
          <p className="text-sm text-foreground font-medium">Record a payment</p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Amount (R)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Date received</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                required
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-foreground font-medium">Note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. EFT payment"
                className="bg-input-background border border-border px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                style={{ borderRadius: "var(--radius)" }}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-accent text-accent-foreground py-2.5 px-6 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 self-start"
            style={{ borderRadius: "var(--radius)" }}
          >
            {submitting ? "Saving…" : "Record payment"}
          </button>
        </form>
      )}
    </div>
  );
}
