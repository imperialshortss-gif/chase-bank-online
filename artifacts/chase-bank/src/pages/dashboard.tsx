import { useGetDashboard, getGetDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateShort } from "@/lib/utils";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowRightLeft,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

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

export default function Dashboard() {
  const { data, isLoading } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });

  if (isLoading || !data) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  const { user, currentBalance, monthlyDeposits, monthlyWithdrawals, totalTransactions, recentTransactions } = data;

  const summaryCards = [
    {
      label: "Current Balance",
      value: formatCurrency(currentBalance),
      icon: CreditCard,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      label: "Monthly Deposits",
      value: formatCurrency(monthlyDeposits),
      icon: TrendingUp,
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "Monthly Withdrawals",
      value: formatCurrency(monthlyWithdrawals),
      icon: TrendingDown,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Total Transactions",
      value: totalTransactions.toLocaleString(),
      icon: Activity,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-8">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Welcome back, {user.fullName}</h1>
          <p className="text-muted-foreground mt-1">Here's your account overview</p>
        </div>
        <Link href="/transfer">
          <Button className="gap-2" data-testid="button-transfer-funds">
            <ArrowRightLeft className="w-4 h-4" />
            Transfer Funds
          </Button>
        </Link>
      </div>

      {/* Balance Card */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="relative overflow-hidden border-none shadow-lg bg-gradient-to-br from-[#0a2540] via-[#0d3260] to-[#117aca] text-white">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <ShieldCheck className="w-full h-full" />
          </div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-white/60 uppercase tracking-widest mb-1">Available Balance</p>
                <motion.p
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight break-words"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" as const }}
                  data-testid="text-available-balance"
                >
                  {formatCurrency(user.availableBalance)}
                </motion.p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-2">
                <div className="text-sm text-white/60">
                  <span className="font-medium text-white">{user.accountType}</span> Account
                </div>
                <div className="font-mono text-sm text-white/70" data-testid="text-account-number">
                  •••• •••• {user.accountNumber.slice(-4)}
                </div>
                <Badge className="bg-white/20 text-white hover:bg-white/20 border-0" data-testid="status-account">
                  {user.accountStatus}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} custom={i + 1} variants={cardVariants} initial="hidden" animate="visible">
              <Card className="border border-border shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.bg}`}>
                    <Icon className={`w-5 h-5 ${card.color}`} />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                    {card.label}
                  </p>
                  <p className="text-base sm:text-lg md:text-xl font-bold text-foreground break-words" data-testid={`text-${card.label.toLowerCase().replace(/ /g, "-")}`}>
                    {card.value}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Recent Transactions */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
        <Card className="border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Recent Transactions</CardTitle>
            <Link href="/transactions">
              <Button variant="outline" size="sm" data-testid="link-view-all-transactions">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentTransactions.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">No transactions yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-recent-transactions">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Debit</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Credit</th>
                      <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Balance</th>
                      <th className="text-center px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentTransactions.map((txn, idx) => (
                      <motion.tr
                        key={txn.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.04 }}
                        className="hover:bg-muted/20 transition-colors"
                        data-testid={`row-transaction-${txn.id}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-muted-foreground">
                          {formatDateShort(txn.createdAt)}
                        </td>
                        <td className="px-6 py-4 max-w-[200px]">
                          <span className="truncate block font-medium text-foreground">
                            {txn.description ?? txn.beneficiaryName ?? txn.transactionReference}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {txn.debit && txn.debit > 0 ? (
                            <span className="text-destructive">{formatCurrency(txn.debit)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono">
                          {txn.credit && txn.credit > 0 ? (
                            <span className="text-green-600 dark:text-green-400">{formatCurrency(txn.credit)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-medium">
                          {formatCurrency(txn.balanceAfter ?? 0)}
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
        </Card>
      </motion.div>
    </div>
  );
}
