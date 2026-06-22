import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import type { Earning } from "@/lib/repositories/types";

/**
 * EarningsBreakdown — presentational component for the earnings table.
 *
 * Shows an EmptyState when there are no earnings, or a Card-wrapped table
 * with per-row "Paid" badges and a total footer when earnings exist.
 * Extracted from the server component for testability.
 */
export type EarningsBreakdownProps = {
  earnings: Earning[];
  total: number;
};

export function EarningsBreakdown({
  earnings,
  total,
}: EarningsBreakdownProps) {
  if (earnings.length === 0) {
    return (
      <EmptyState
        title="No earnings yet"
        description="When you complete a swing review, the payment will appear here."
      />
    );
  }

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <CardHeader className="sr-only">
        <CardTitle>Earnings breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Parent</th>
              <th className="px-4 py-3 font-medium">Submission</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {earnings.map((e) => (
              <EarningRow key={e.id} earning={e} />
            ))}
          </tbody>
          <tfoot className="bg-muted/50">
            <tr>
              <td className="px-4 py-3 text-sm font-medium" colSpan={4}>
                Total
              </td>
              <td className="px-4 py-3 text-right text-sm font-semibold">
                ${total}
              </td>
            </tr>
          </tfoot>
        </table>
      </CardContent>
    </Card>
  );
}

function EarningRow({ earning }: { earning: Earning }) {
  return (
    <tr className="bg-card">
      <td className="px-4 py-3">{earning.parentEmail}</td>
      <td className="px-4 py-3">
        <a
          href={`/coach/submission/${earning.submissionId}`}
          className="text-primary hover:underline"
        >
          {earning.submissionId.slice(0, 8)}…
        </a>
      </td>
      <td className="px-4 py-3 text-muted-foreground">
        {earning.createdAt.toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <Badge variant="success" size="sm">
          Paid
        </Badge>
      </td>
      <td className="px-4 py-3 text-right font-medium">${earning.amountUsd}</td>
    </tr>
  );
}
