import LineItemsTable from "./LineItemsTable";
import { invoicePdfUrl } from "../../lib/api/quotes";

// Read-only — payments are recorded by the admin only (manual/offline
// EFT), never something a customer records themselves here. Only ever
// rendered once the invoice has actually been sent (the quote detail page
// only fetches invoice/lines data for an order that exists, and an order
// only exists once accepted).
export default function CustomerInvoiceSection({ quote, invoice, lines, payments, customerAddress }) {
  if (!invoice) return null;

  return (
    <div className="mb-8">
      <h2 className="text-sm text-foreground font-medium mb-4">Invoice {invoice.invoiceNumber}</h2>

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

      <div className="border border-border p-6" style={{ borderRadius: "var(--radius)", background: "var(--card)" }}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-muted-foreground">Amount paid</span>
          <span className="text-foreground">R{invoice.amountPaid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm mb-4">
          <span className="text-muted-foreground">Outstanding balance</span>
          <span className="text-foreground font-medium">R{invoice.outstanding.toFixed(2)}</span>
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

        <a href={invoicePdfUrl(quote.id)} className="text-sm text-accent font-medium" target="_blank" rel="noreferrer">
          Download invoice PDF
        </a>
      </div>
    </div>
  );
}
