import { useGetAdminStats, getGetAdminStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, UserCheck, UserX, ArrowDownRight, ArrowUpRight, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() }
  });

  if (isLoading || !stats) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7].map(i => <Skeleton key={i} className="h-32 rounded-xl bg-[#1a3857]" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-400" },
    { title: "Active Users", value: stats.activeUsers, icon: UserCheck, color: "text-green-400" },
    { title: "Suspended Users", value: stats.suspendedUsers, icon: UserX, color: "text-red-400" },
    { title: "Total Deposits", value: formatCurrency(stats.totalDeposits), icon: ArrowDownRight, color: "text-green-400" },
    { title: "Total Withdrawals", value: formatCurrency(stats.totalWithdrawals), icon: ArrowUpRight, color: "text-red-400" },
    { title: "Pending Transfers", value: stats.pendingTransfers, icon: Clock, color: "text-yellow-400" },
    { title: "Completed Transfers", value: stats.completedTransfers, icon: CheckCircle, color: "text-green-400" },
  ];

  return (
    <div className="space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0a2540] dark:text-white">Admin Dashboard</h1>
        <p className="text-[#64748b] dark:text-gray-400 mt-1">Platform overview and statistics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
          >
            <Card className="bg-[#0a2540] border-[#1a3857] shadow-lg text-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-[#1a3857] bg-[#0d1f35]/50 rounded-t-xl">
                <CardTitle className="text-sm font-medium text-gray-300">{stat.title}</CardTitle>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </CardHeader>
              <CardContent className="pt-6">
                <div className="text-3xl font-bold tracking-tight text-[#c9a227]">{stat.value}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
