import { useState } from "react";
import { useGetAdminTransfers, useUpdateTransferStatus, getGetAdminTransfersQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminTransfers() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetAdminTransfers(
    { 
      search: search || undefined,
      status: statusFilter !== "all" ? statusFilter as any : undefined
    }, 
    { query: { queryKey: getGetAdminTransfersQueryKey({ 
      search: search || undefined,
      status: statusFilter !== "all" ? statusFilter as any : undefined
    }) } }
  );

  const updateStatusMutation = useUpdateTransferStatus();

  const handleStatusUpdate = (id: number, status: "Completed" | "Cancelled") => {
    updateStatusMutation.mutate({ id, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Transfer status updated", description: `Transfer marked as ${status}.` });
        queryClient.invalidateQueries({ queryKey: getGetAdminTransfersQueryKey() });
      }
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0a2540] dark:text-white">Transfer Review Queue</h1>
        <p className="text-[#64748b] dark:text-gray-400 mt-1">Monitor, approve, or cancel wire transfers.</p>
      </div>

      <Card className="shadow-lg border-[#e2e8f0] dark:border-[#1a3857] dark:bg-[#0a2540]">
        <CardHeader className="border-b border-[#e2e8f0] dark:border-[#1a3857] bg-gray-50/50 dark:bg-[#0d1f35]/50 pb-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by reference, account..."
                className="pl-9 bg-white dark:bg-[#020b18] border-[#e2e8f0] dark:border-[#1a3857] text-[#0a2540] dark:text-white"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-white dark:bg-[#020b18] border-[#e2e8f0] dark:border-[#1a3857] text-white">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-[#0a2540] dark:border-[#1a3857]">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Processing">Processing / Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !data ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded dark:bg-[#1a3857]" />)}
            </div>
          ) : data.transfers.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No transfers match your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#0d1f35]/80">
                  <tr>
                    <th className="px-6 py-4 font-medium">Details</th>
                    <th className="px-6 py-4 font-medium">Sender</th>
                    <th className="px-6 py-4 font-medium">Beneficiary</th>
                    <th className="px-6 py-4 font-medium text-right">Amount</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#1a3857]">
                  {data.transfers.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-[#0d1f35]/30">
                      <td className="px-6 py-4">
                        <div className="font-mono font-medium text-[#0a2540] dark:text-gray-300">{tx.transactionReference}</div>
                        <div className="text-xs text-gray-500 mt-1">{formatDate(tx.createdAt)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#0a2540] dark:text-gray-300">{tx.userName || `User ID: ${tx.userId}`}</div>
                        <div className="text-xs font-mono text-gray-500 mt-1">{tx.userAccountNumber}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-[#0a2540] dark:text-gray-300">{tx.beneficiaryName}</div>
                        <div className="text-xs text-gray-500 mt-1">{tx.bankName} • {tx.accountNumber}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-[#0a2540] dark:text-white">{formatCurrency(tx.amount)}</div>
                        <div className="text-xs text-gray-500">{tx.currency}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          tx.status === 'Completed' ? 'bg-green-900/30 text-green-400 border-green-800' :
                          tx.status === 'Processing' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' :
                          'bg-red-900/30 text-red-400 border-red-800'
                        }`}>
                          {tx.status === 'Completed' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                           tx.status === 'Processing' ? <Clock className="w-3 h-3 mr-1" /> :
                           <XCircle className="w-3 h-3 mr-1" />}
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {tx.status === "Processing" ? (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 border-green-800 text-green-400 hover:bg-green-900/30"
                              onClick={() => handleStatusUpdate(tx.id, "Completed")}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-8 border-red-800 text-red-400 hover:bg-red-900/30"
                              onClick={() => handleStatusUpdate(tx.id, "Cancelled")}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
