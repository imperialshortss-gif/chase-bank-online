import { useState } from "react";
import {
  useGetAdminUsers,
  useCreateAdminUser,
  useUpdateUserStatus,
  useUpdateUserBalance,
  useAddAdminTransaction,
  getGetAdminUsersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/utils";
import { Search, MoreVertical, ShieldAlert, DollarSign, Eye, ShieldCheck, Banknote, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

type CreateForm = {
  fullName: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  address: string;
  accountType: string;
  accountStatus: string;
  availableBalance: string;
};

const defaultCreate: CreateForm = {
  fullName: "",
  username: "",
  password: "",
  email: "",
  phone: "",
  address: "",
  accountType: "Checking",
  accountStatus: "Active",
  availableBalance: "0.00",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [balanceDialog, setBalanceDialog] = useState<{
  open: boolean;
  userId: number | null;
  type: "debit" | "credit";
  amount: string;
  description: string;
  transactionDate: string;
}>({
  open: false,
  userId: null,
  type: "debit",
  amount: "",
  description: "",
  transactionDate: new Date().toISOString().split("T")[0],
});
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(defaultCreate);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useGetAdminUsers(
    { search: search || undefined },
    { query: { queryKey: getGetAdminUsersQueryKey({ search: search || undefined }) } }
  );

  const updateStatusMutation = useUpdateUserStatus();
  const updateBalanceMutation = useUpdateUserBalance();
const addTransactionMutation = useAddAdminTransaction();
const createMutation = useCreateAdminUser();

  const handleStatusChange = (userId: number, status: "Active" | "Suspended") => {
    updateStatusMutation.mutate({ id: userId, data: { status } }, {
      onSuccess: () => {
        toast({ title: "Status updated", description: `User status set to ${status}` });
        queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
      },
    });
  };

  const handleBalanceSubmit = () => {
    if (
      !balanceDialog.userId ||
      !balanceDialog.amount ||
      !balanceDialog.description.trim()
    ) {
      toast({
        title: "Missing fields",
        description: "Amount and description are required.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(balanceDialog.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than zero.",
        variant: "destructive",
      });
      return;
    }

    addTransactionMutation.mutate(
      {
        id: balanceDialog.userId,
        data: {
          type: balanceDialog.type,
          amount,
          description: balanceDialog.description.trim(),
          transactionDate: balanceDialog.transactionDate,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: `${balanceDialog.type === "credit" ? "Credit" : "Debit"} posted`,
            description: "The balance and transaction history have been updated.",
          });

          setBalanceDialog({
            open: false,
            userId: null,
            type: "debit",
            amount: "",
            description: "",
            transactionDate: new Date().toISOString().split("T")[0],
          });

          queryClient.invalidateQueries({
            queryKey: getGetAdminUsersQueryKey(),
          });
        },
        onError: (err: any) => {
          toast({
            title: "Transaction failed",
            description: err?.message || "Unable to update the account.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const handleCreateSubmit = () => {
    if (!createForm.fullName || !createForm.username || !createForm.password) {
      toast({ title: "Missing fields", description: "Full name, username and password are required.", variant: "destructive" });
      return;
    }
    createMutation.mutate(
      {
        data: {
          fullName: createForm.fullName,
          username: createForm.username,
          password: createForm.password,
          email: createForm.email || undefined,
          phone: createForm.phone || undefined,
          address: createForm.address || undefined,
          accountType: createForm.accountType,
          accountStatus: createForm.accountStatus,
          availableBalance: parseFloat(createForm.availableBalance) || 0,
        },
      },
      {
        onSuccess: (newUser) => {
          toast({ title: "Account created", description: `${newUser.fullName}'s account has been created successfully.` });
          setCreateOpen(false);
          setCreateForm(defaultCreate);
          queryClient.invalidateQueries({ queryKey: getGetAdminUsersQueryKey() });
        },
        onError: (err: any) => {
          toast({ title: "Failed to create account", description: err?.message || "An error occurred.", variant: "destructive" });
        },
      }
    );
  };

  const field = (key: keyof CreateForm, label: string, opts?: { type?: string; placeholder?: string }) => (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <Input
        type={opts?.type ?? "text"}
        placeholder={opts?.placeholder ?? label}
        className="bg-[#020b18] border-[#1a3857] text-white placeholder:text-gray-600"
        value={createForm[key]}
        onChange={(e) => setCreateForm((prev) => ({ ...prev, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#0a2540] dark:text-white">User Management</h1>
          <p className="text-[#64748b] dark:text-gray-400 mt-1">Manage accounts, balances, and security statuses.</p>
        </div>
        <Button
          className="gap-2 bg-[#c9a227] hover:bg-[#b08d22] text-[#0a2540] font-semibold"
          onClick={() => setCreateOpen(true)}
        >
          <UserPlus className="w-4 h-4" />
          Create Account
        </Button>
      </div>

      <Card className="shadow-lg border-[#e2e8f0] dark:border-[#1a3857] dark:bg-[#0a2540]">
        <CardHeader className="border-b border-[#e2e8f0] dark:border-[#1a3857] bg-gray-50/50 dark:bg-[#0d1f35]/50 pb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name, username, account..."
              className="pl-9 bg-white dark:bg-[#020b18] border-[#e2e8f0] dark:border-[#1a3857] text-[#0a2540] dark:text-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading || !data ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded dark:bg-[#1a3857]" />
              ))}
            </div>
          ) : data.users.length === 0 ? (
            <div className="p-12 text-center text-gray-500 dark:text-gray-400">
              No users found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-[#0d1f35]/80">
                  <tr>
                    <th className="px-6 py-4 font-medium">Customer</th>
                    <th className="px-6 py-4 font-medium">Account Info</th>
                    <th className="px-6 py-4 font-medium text-right">Available Balance</th>
                    <th className="px-6 py-4 font-medium text-center">Status</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-[#1a3857]">
                  {data.users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-[#0d1f35]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-[#0a2540] dark:text-white">{user.fullName}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.email || user.username}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-mono text-[#0a2540] dark:text-gray-300">{user.accountNumber}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.accountType}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-bold text-[#0a2540] dark:text-white">{formatCurrency(user.availableBalance)}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                            user.accountStatus === "Active"
                              ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800"
                              : "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800"
                          }`}
                        >
                          {user.accountStatus === "Active" ? (
                            <ShieldCheck className="w-3 h-3 mr-1" />
                          ) : (
                            <ShieldAlert className="w-3 h-3 mr-1" />
                          )}
                          {user.accountStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 dark:hover:bg-[#1a3857] dark:text-gray-300">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="dark:bg-[#0a2540] dark:border-[#1a3857]">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <Link href={`/admin/users/${user.id}`}>
                              <DropdownMenuItem className="cursor-pointer dark:hover:bg-[#1a3857]">
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                            </Link>
                            <DropdownMenuItem
                              className="cursor-pointer dark:hover:bg-[#1a3857]"
                              onClick={() =>
                                setBalanceDialog({
                                  open: true,
                                  userId: user.id,
                                  type: "debit",
                                  amount: "",
                                  description: "",
                                  transactionDate: new Date().toISOString().split("T")[0],
                                })
                              }
                            >
                              <DollarSign className="mr-2 h-4 w-4" /> Manage Balance
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="dark:bg-[#1a3857]" />
                            {user.accountStatus === "Active" ? (
                              <DropdownMenuItem
                                className="cursor-pointer text-red-600 dark:text-red-400 dark:hover:bg-[#1a3857]"
                                onClick={() => handleStatusChange(user.id, "Suspended")}
                              >
                                <ShieldAlert className="mr-2 h-4 w-4" /> Suspend Account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                className="cursor-pointer text-green-600 dark:text-green-400 dark:hover:bg-[#1a3857]"
                                onClick={() => handleStatusChange(user.id, "Active")}
                              >
                                <ShieldCheck className="mr-2 h-4 w-4" /> Activate Account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Balance Dialog */}
      <Dialog open={balanceDialog.open} onOpenChange={(open) => setBalanceDialog((prev) => ({ ...prev, open }))}>
        <DialogContent className="dark:bg-[#0a2540] dark:border-[#1a3857] sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Banknote className="w-5 h-5 text-[#c9a227]" />
              Manage Ledger Balance
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Directly modify the available balance for this account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-300">Transaction Type</label>
              <Select
                value={balanceDialog.type}
                onValueChange={(val: "debit" | "credit") =>
                  setBalanceDialog((prev) => ({ ...prev, type: val }))
                }
              >
                <SelectTrigger className="bg-[#020b18] border-[#1a3857] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#020b18] border-[#1a3857] text-white">
                  <SelectItem value="debit">Debit (-)</SelectItem>
                  <SelectItem value="credit">Credit (+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-300">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8 bg-[#020b18] border-[#1a3857] text-white text-lg font-semibold"
                  value={balanceDialog.amount}
                  onChange={(e) => setBalanceDialog((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-300">Transaction Date</label>
              <Input
                type="date"
                className="bg-[#020b18] border-[#1a3857] text-white"
                value={balanceDialog.transactionDate}
                onChange={(e) =>
                  setBalanceDialog((prev) => ({
                    ...prev,
                    transactionDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-gray-300">Description</label>
              <Input
                type="text"
                placeholder="e.g. Account adjustment"
                className="bg-[#020b18] border-[#1a3857] text-white"
                value={balanceDialog.description}
                onChange={(e) =>
                  setBalanceDialog((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBalanceDialog((prev) => ({ ...prev, open: false }))}
              className="border-[#1a3857] text-gray-300 hover:bg-[#1a3857] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBalanceSubmit}
              className="bg-[#c9a227] hover:bg-[#b08d22] text-[#0a2540] font-semibold"
              disabled={updateBalanceMutation.isPending || !balanceDialog.amount}
            >
              {updateBalanceMutation.isPending ? "Executing..." : "Execute Ledger Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="dark:bg-[#0a2540] dark:border-[#1a3857] sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <UserPlus className="w-5 h-5 text-[#c9a227]" />
              Create New Account
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Fill in the details to open a new customer account. The customer will log in with the username and password you set.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <p className="text-xs font-semibold text-[#c9a227] uppercase tracking-widest">Identity</p>
            <div className="grid grid-cols-2 gap-3">
              {field("fullName", "Full Name", { placeholder: "e.g. Jane Smith" })}
              {field("username", "Username", { placeholder: "e.g. jsmith" })}
            </div>
            {field("password", "Password", { type: "password", placeholder: "Set a strong password" })}

            <p className="text-xs font-semibold text-[#c9a227] uppercase tracking-widest mt-2">Contact (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              {field("email", "Email", { placeholder: "email@example.com" })}
              {field("phone", "Phone", { placeholder: "+1 (555) 000-0000" })}
            </div>
            {field("address", "Address", { placeholder: "123 Main St, City, State" })}

            <p className="text-xs font-semibold text-[#c9a227] uppercase tracking-widest mt-2">Account Settings</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-gray-300">Account Type</label>
                <Select
                  value={createForm.accountType}
                  onValueChange={(v) => setCreateForm((prev) => ({ ...prev, accountType: v }))}
                >
                  <SelectTrigger className="bg-[#020b18] border-[#1a3857] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#020b18] border-[#1a3857] text-white">
                    <SelectItem value="Checking">Checking</SelectItem>
                    <SelectItem value="Savings">Savings</SelectItem>
                    <SelectItem value="Premium">Premium</SelectItem>
                    <SelectItem value="Business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-gray-300">Status</label>
                <Select
                  value={createForm.accountStatus}
                  onValueChange={(v) => setCreateForm((prev) => ({ ...prev, accountStatus: v }))}
                >
                  <SelectTrigger className="bg-[#020b18] border-[#1a3857] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#020b18] border-[#1a3857] text-white">
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-gray-300">Opening Balance (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="pl-8 bg-[#020b18] border-[#1a3857] text-white font-semibold"
                  value={createForm.availableBalance}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, availableBalance: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => { setCreateOpen(false); setCreateForm(defaultCreate); }}
              className="border-[#1a3857] text-gray-300 hover:bg-[#1a3857] hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              className="bg-[#c9a227] hover:bg-[#b08d22] text-[#0a2540] font-semibold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
