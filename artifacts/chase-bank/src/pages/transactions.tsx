import { useState } from "react";
import { useGetTransactions, getGetTransactionsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import { ListOrdered, ChevronLeft, ChevronRight } from "lucide-react";

type StatusFilter = "all" | "Processing" | "Completed" | "Cancelled";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Completed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    Processing: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    Cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? styles.Processing}`}
    >
      {status}
    </span>
  );
}

const PAGE_SIZE = 15;

export default function Transactions() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const queryParams: Record<string, unknown> = { page, limit: PAGE_SIZE };
  if (statusFilter !== "all") queryParams.status = statusFilter;

  const { data, isLoading } = useGetTransactions(queryParams as Parameters<typeof useGetTransactions>[0], {
    query: { queryKey: getGetTransactionsQueryKey(queryParams as Parameters<typeof useGetTransactions>[0]) },
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ListOrdered className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Transaction History</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {data ? `${data.total.toLocaleString()} total transactions` : "Loading..."}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Filter by status:</span>
          <Select
            value={statusFilter}
            onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(1); }}
          >
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Processing">Processing</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Card className="border border-border shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            ) : !data || data.transactions.length === 0 ? (
              <div className="py-24 text-center">
                <ListOrdered className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground font-medium">No transactions found</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  {statusFilter !== "all" ? "Try changing the filter." : "Your transactions will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-transactions">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Reference</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Debit</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Credit</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Balance</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.transactions.map((txn, idx) => (
                      <motion.tr
                        key={txn.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.025 }}
                        className="hover:bg-muted/20 transition-colors"
                        data-testid={`row-transaction-${txn.id}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground text-xs">
                          {formatDate(txn.createdAt)}
                        </td>
                        <td className="px-6 py-4 max-w-[180px]">
                          <span className="truncate block font-medium text-foreground">
                            {txn.description ?? txn.beneficiaryName ?? "Transaction"}
                          </span>
                          {txn.beneficiaryName && txn.bankName && (
                            <span className="text-xs text-muted-foreground truncate block">
                              {txn.bankName}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-muted-foreground hidden md:table-cell">
                          {txn.transactionReference}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {txn.debit && txn.debit > 0 ? (
                            <span className="text-destructive font-medium">{formatCurrency(txn.debit)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {txn.credit && txn.credit > 0 ? (
                            <span className="text-green-600 dark:text-green-400 font-medium">{formatCurrency(txn.credit)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-semibold hidden sm:table-cell">
                          {txn.balanceAfter != null ? formatCurrency(txn.balanceAfter) : "—"}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <StatusBadge status={txn.status} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {data && totalPages > 1 && (
            <div className="border-t border-border px-6 py-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages} · {data.total} transactions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
