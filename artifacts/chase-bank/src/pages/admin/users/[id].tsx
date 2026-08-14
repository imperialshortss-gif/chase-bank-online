import { useState } from "react";
import { useParams } from "wouter";
import { 
  useGetAdminUser, 
  useGetAdminUserTransactions, 
  useAddAdminTransaction,
  getGetAdminUserQueryKey,
  getGetAdminUserTransactionsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { User, Mail, Phone, MapPin, Hash, Plus, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminUserDetail() {
  const params = useParams();
  const userId = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split("T")[0];
  const [txDialog, setTxDialog] = useState<{ open: boolean, type: "deposit" | "withdrawal" | "credit" | "debit", amount: string, description: string, transactionDate: string }>({
    open: false, type: "deposit", amount: "", description: "", transactionDate: today
  });

  const { data: user, isLoading: userLoading } = useGetAdminUser(userId, { 
    query: { queryKey: getGetAdminUserQueryKey(userId), enabled: !!userId } 
  });
  
  const { data: transactions, isLoading: txLoading } = useGetAdminUserTransactions(userId, {
    query: { queryKey: getGetAdminUserTransactionsQueryKey(userId), enabled: !!userId }
  });

  const addTxMutation = useAddAdminTransaction();

  const handleTxSubmit = () => {
    if (!txDialog.amount) return;
    
    addTxMutation.mutate({ 
      id: userId, 
      data: { 
        type: txDialog.type, 
        amount: parseFloat(txDialog.amount),
        description: txDialog.description || undefined,
        transactionDate: txDialog.transactionDate || undefined,
      } 
    }, {
      onSuccess: () => {
        toast({ title: "Transaction posted successfully" });
        setTxDialog({ open: false, type: "deposit", amount: "", description: "", transactionDate: today });
        queryClient.invalidateQueries({ queryKey: getGetAdminUserQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: getGetAdminUserTransactionsQueryKey(userId) });
      }
    });
  };

  if (userLoading || !user) {
    return <div className="space-y-6"><Skeleton className="h-64 w-full dark:bg-[#1a3857]" /></div>;
  }

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center gap-4">
        <Link href="/admin/users">
          <Button variant="outline" size="icon" className="border-[#1a3857] text-gray-300 hover:bg-[#1a3857]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0a2540] dark:text-white">{user.fullName}</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">Customer Profile & Ledger</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-[#1a3857] dark:bg-[#0a2540] shadow-lg text-white">
          <CardHeader className="bg-[#0d1f35]/50 border-b border-[#1a3857]">
            <CardTitle className="text-lg text-gray-200">Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-gray-300">
                <User className="w-4 h-4 text-[#117aca]" />
                <span className="font-medium text-white">{user.username}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="w-4 h-4 text-[#117aca]" />
                <span>{user.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="w-4 h-4 text-[#117aca]" />
                <span>{user.phone || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <MapPin className="w-4 h-4 text-[#117aca]" />
                <span>{user.address || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <Hash className="w-4 h-4 text-[#117aca]" />
                <span className="font-mono text-white">{user.accountNumber}</span>
              </div>
            </div>

            <div className="pt-6 border-t border-[#1a3857]">
              <p className="text-sm text-gray-400 mb-1">Ledger Balance</p>
              <p className="text-3xl font-bold text-[#c9a227]">{formatCurrency(user.availableBalance)}</p>
              <div className="mt-4 flex gap-2">
                <span className={`px-2 py-1 text-xs rounded border ${user.accountStatus === 'Active' ? 'bg-green-900/30 text-green-400 border-green-800' : 'bg-red-900/30 text-red-400 border-red-800'}`}>
                  {user.accountStatus}
                </span>
                <span className="px-2 py-1 text-xs rounded border bg-blue-900/30 text-blue-400 border-blue-800">
                  {user.accountType}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-[#1a3857] dark:bg-[#0a2540] shadow-lg">
          <CardHeader className="bg-[#0d1f35]/50 border-b border-[#1a3857] flex flex-row items-center justify-between">
            <CardTitle className="text-lg text-gray-200">Transaction Ledger</CardTitle>
            <Button 
              size="sm" 
              className="bg-[#c9a227] hover:bg-[#b08d22] text-[#0a2540]"
              onClick={() => setTxDialog({ open: true, type: "deposit", amount: "", description: "", transactionDate: today })}
            >
              <Plus className="w-4 h-4 mr-1" /> Post Entry
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {txLoading ? (
              <div className="p-6"><Skeleton className="h-40 w-full dark:bg-[#1a3857]" /></div>
            ) : !transactions || transactions.transactions.length === 0 ? (
              <div className="p-12 text-center text-gray-500">No transactions recorded.</div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs uppercase bg-[#0d1f35] sticky top-0 border-b border-[#1a3857]">
                    <tr>
                      <th className="px-4 py-3 font-medium">Date/Ref</th>
                      <th className="px-4 py-3 font-medium">Description</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a3857]">
                    {transactions.transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[#0d1f35]/50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-white">{formatDate(tx.transactionDate)}</div>
                          <div className="text-xs text-gray-500 font-mono">{tx.transactionReference}</div>
                        </td>
                        <td className="px-4 py-3">{tx.description || tx.beneficiaryName || "Ledger Entry"}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${tx.credit ? 'text-green-400' : 'text-white'}`}>
                          {tx.credit ? '+' : '-'}{formatCurrency(tx.credit || tx.debit || 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatCurrency(tx.balanceAfter || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={txDialog.open} onOpenChange={(open) => setTxDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="bg-[#0d1f35] border-[#1a3857] text-white sm:max-w-[520px] p-0 overflow-hidden">
          <div className="px-7 pt-6 pb-2 border-b border-[#1a3857]">
            <DialogTitle className="text-lg font-semibold text-white tracking-wide">Manual Transaction Entry</DialogTitle>
          </div>

          <div className="px-7 py-6 grid gap-5">
            {/* TYPE + AMOUNT row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Type</label>
                <Select
                  value={txDialog.type}
                  onValueChange={(val: any) => setTxDialog(prev => ({ ...prev, type: val }))}
                >
                  <SelectTrigger className="bg-[#0a2540] border-[#2a4a6b] text-white h-11 rounded-md focus:ring-1 focus:ring-[#117aca]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0a2540] border-[#2a4a6b] text-white z-[200]">
                    <SelectItem value="deposit" className="focus:bg-[#1a3857] focus:text-white cursor-pointer">Deposit</SelectItem>
                    <SelectItem value="credit" className="focus:bg-[#1a3857] focus:text-white cursor-pointer">Credit</SelectItem>
                    <SelectItem value="withdrawal" className="focus:bg-[#1a3857] focus:text-white cursor-pointer">Withdrawal</SelectItem>
                    <SelectItem value="debit" className="focus:bg-[#1a3857] focus:text-white cursor-pointer">Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Amount (USD)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  className="bg-[#0a2540] border-[#2a4a6b] text-white h-11 placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-[#117aca]"
                  value={txDialog.amount}
                  onChange={(e) => setTxDialog(prev => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>

            {/* TRANSACTION DATE */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Transaction Date</label>
              <Input
                type="date"
                className="bg-[#0a2540] border-[#2a4a6b] text-white h-11 focus-visible:ring-1 focus-visible:ring-[#117aca] [color-scheme:dark]"
                value={txDialog.transactionDate}
                onChange={(e) => setTxDialog(prev => ({ ...prev, transactionDate: e.target.value }))}
              />
            </div>

            {/* DESCRIPTION */}
            <div className="grid gap-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Description</label>
              <Input
                className="bg-[#0a2540] border-[#2a4a6b] text-white h-11 placeholder:text-gray-600 focus-visible:ring-1 focus-visible:ring-[#117aca]"
                placeholder="e.g. Wire Transfer Ref: 12345"
                value={txDialog.description}
                onChange={(e) => setTxDialog(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>

          <div className="px-7 pb-6">
            <Button
              onClick={handleTxSubmit}
              disabled={addTxMutation.isPending || !txDialog.amount}
              className="w-full h-12 bg-[#0a2540] hover:bg-[#0d2d4a] border border-[#2a4a6b] text-white font-bold tracking-widest uppercase text-sm rounded-md transition-colors"
            >
              {addTxMutation.isPending ? "Processing..." : "Execute Transaction"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
