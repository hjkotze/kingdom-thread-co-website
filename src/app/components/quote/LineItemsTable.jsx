import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";

function money(value) {
  return `R${Number(value).toFixed(2)}`;
}

// Same Description/Qty/Unit Price/Amount columns, and the same Shipping/
// VAT/Total rows underneath, used everywhere a quote or invoice is shown
// on screen — mirrors the layout in server/src/lib/documentPdf.js so the
// web preview and the generated PDF always agree.
export default function LineItemsTable({ lines, shippingAmount, vatRatePercent, vatAmount, total }) {
  return (
    <div className="border border-border" style={{ borderRadius: "var(--radius)" }}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lines.map((line, index) => (
            <TableRow key={line.quoteId ?? index}>
              <TableCell>
                <p className="text-foreground font-medium">{line.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {line.size} · {line.colour}
                  {line.requirements ? ` · ${line.requirements}` : ""}
                  {line.font ? ` · Font: ${line.font}` : ""}
                  {line.fontColour ? ` · Font colour: ${line.fontColour}` : ""}
                  {line.threadColourCode ? ` · Thread colour: ${line.threadColourCode}` : ""}
                </p>
              </TableCell>
              <TableCell className="text-right align-top">{line.quantity}</TableCell>
              <TableCell className="text-right align-top">{money(line.unitPrice)}</TableCell>
              <TableCell className="text-right align-top">{money(line.amount)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="px-4 py-3 flex flex-col gap-1.5 border-t border-border text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Shipping</span>
          <span>{money(shippingAmount)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>VAT ({Number(vatRatePercent).toFixed(2)}%)</span>
          <span>{money(vatAmount)}</span>
        </div>
        <div className="flex justify-between text-foreground font-medium text-base pt-1.5 border-t border-border mt-1">
          <span>Total</span>
          <span>{money(total)}</span>
        </div>
      </div>
    </div>
  );
}
