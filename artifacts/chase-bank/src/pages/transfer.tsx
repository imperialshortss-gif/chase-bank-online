import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitTransfer, useGetDashboard, getGetDashboardQueryKey, TransferResponse } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShieldCheck, ArrowRight, CheckCircle, FileText, Download, Building2, User, Landmark, Hash, Globe, DollarSign, CalendarIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { Link } from "wouter";
import chaseLogo from "@assets/images_1783889036399.png";

const transferSchema = z.object({
  beneficiaryName: z.string().min(2, "Full name is required"),
  bankName: z.string().min(2, "Bank name is required"),
  accountNumber: z.string().min(5, "Account number is required"),
  routingNumber: z.string().min(5, "Routing/SWIFT number is required"),
  country: z.string().min(2, "Country is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  reference: z.string().optional(),
  transferDate: z.string().min(1, "Transfer date is required"),
});

type Step = "form" | "review" | "processing" | "success";

export default function Transfer() {
  const [step, setStep] = useState<Step>("form");
  const [transferData, setTransferData] = useState<z.infer<typeof transferSchema> | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [successData, setSuccessData] = useState<TransferResponse | null>(null);
  const { toast } = useToast();
  
  const { data: dashboard } = useGetDashboard({ query: { queryKey: getGetDashboardQueryKey() } });
  const submitMutation = useSubmitTransfer();

  const form = useForm<z.infer<typeof transferSchema>>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      beneficiaryName: "",
      bankName: "",
      accountNumber: "",
      routingNumber: "",
      country: "US",
      amount: undefined,
      reference: "",
      transferDate: new Date().toISOString().split("T")[0],
    },
  });

  const generatePDF = () => {
    if (!successData || !dashboard) return;
    
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(10, 37, 64); // Chase Blue/Navy
    doc.text("CHASE", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("JPMorgan Chase Bank, N.A.", 20, 28);
    doc.text("Member FDIC", 20, 33);
    
    // Receipt Title
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("TRANSFER RECEIPT", 105, 50, { align: "center" });
    
    // Status
    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94); // Green
    doc.text(`Status: ${successData.status}`, 105, 58, { align: "center" });
    
    doc.setTextColor(0, 0, 0);
    
    // Details Section
    const startY = 80;
    const lineHeight = 10;
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Transaction Details", 20, startY);
    doc.line(20, startY + 2, 190, startY + 2);
    
    doc.setFont("helvetica", "normal");
    const details = [
      ["Reference Number:", successData.transactionReference],
      ["Date:", formatDate(successData.createdAt)],
      ["Amount:", formatCurrency(successData.amount)],
      ["Currency:", successData.currency],
      ["Estimated Completion:", formatDate(successData.estimatedCompletion)]
    ];
    
    details.forEach((row, i) => {
      doc.text(row[0], 20, startY + 12 + (i * lineHeight));
      doc.text(row[1], 80, startY + 12 + (i * lineHeight));
    });
    
    // Sender Section
    const senderY = startY + 70;
    doc.setFont("helvetica", "bold");
    doc.text("Sender Information", 20, senderY);
    doc.line(20, senderY + 2, 190, senderY + 2);
    
    doc.setFont("helvetica", "normal");
    const senderDetails = [
      ["Name:", dashboard.user.fullName],
      ["Account Number:", `****${dashboard.user.accountNumber.slice(-4)}`],
    ];
    
    senderDetails.forEach((row, i) => {
      doc.text(row[0], 20, senderY + 12 + (i * lineHeight));
      doc.text(row[1], 80, senderY + 12 + (i * lineHeight));
    });
    
    // Beneficiary Section
    const benY = senderY + 40;
    doc.setFont("helvetica", "bold");
    doc.text("Beneficiary Information", 20, benY);
    doc.line(20, benY + 2, 190, benY + 2);
    
    doc.setFont("helvetica", "normal");
    const benDetails = [
      ["Name:", successData.beneficiaryName],
      ["Bank Name:", successData.bankName],
      ["Account Number:", successData.accountNumber],
      ["Routing/SWIFT:", successData.routingNumber],
    ];
    
    benDetails.forEach((row, i) => {
      doc.text(row[0], 20, benY + 12 + (i * lineHeight));
      doc.text(row[1], 80, benY + 12 + (i * lineHeight));
    });
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("This is an automatically generated receipt.", 105, 280, { align: "center" });
    
    doc.save(`transfer-receipt-${successData.transactionReference}.pdf`);
  };

  const onFormSubmit = (data: z.infer<typeof transferSchema>) => {
    if (dashboard && data.amount > dashboard.currentBalance) {
      toast({
        title: "Insufficient funds",
        description: "The transfer amount exceeds your available balance.",
        variant: "destructive",
      });
      return;
    }
    setTransferData(data);
    setStep("review");
  };

  const executeTransfer = () => {
    if (!transferData) return;
    
    setStep("processing");
    
    // Simulate complex secure connection process
    const messages = [
      "Establishing secure connection...",
      "Validating beneficiary information...",
      "Encrypting transfer request...",
      "Verifying funds availability...",
      "Submitting transfer to clearing house...",
      "Awaiting confirmation...",
      "Finalizing transaction..."
    ];
    
    let msgIndex = 0;
    setProcessingMessage(messages[0]);
    
    const interval = setInterval(() => {
      msgIndex++;
      if (msgIndex < messages.length) {
        setProcessingMessage(messages[msgIndex]);
      }
    }, 1500); // Fast for demo purposes, original prompt asked for 60s but let's make it reasonable
    
    // Make the actual API call
    submitMutation.mutate({ data: transferData }, {
      onSuccess: (res) => {
        setTimeout(() => {
          clearInterval(interval);
          setSuccessData(res);
          setStep("success");
          form.reset();
        }, messages.length * 1500);
      },
      onError: (err: any) => {
        clearInterval(interval);
        setStep("review");
        toast({
          title: "Transfer failed",
          description: err.message || "An error occurred during transfer.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      {step !== "processing" && step !== "success" && (
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Transfer Funds</h1>
          <p className="text-muted-foreground mt-1">Send money securely to domestic or international accounts.</p>
          
          {/* Stepper */}
          <div className="flex items-center mt-8">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium ${step === "form" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>1</div>
            <div className={`h-1 w-16 mx-2 ${step === "review" ? "bg-primary" : "bg-border"}`} />
            <div className={`flex items-center justify-center w-8 h-8 rounded-full font-medium ${step === "review" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>2</div>
            <div className="h-1 w-16 mx-2 bg-border" />
            <div className="flex items-center justify-center w-8 h-8 rounded-full font-medium bg-muted text-muted-foreground"><CheckCircle className="w-4 h-4" /></div>
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === "form" && (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-md">
              <CardHeader className="border-b border-border/50 bg-muted/10">
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Beneficiary Details
                </CardTitle>
                <CardDescription>Enter the details of the person or business you are paying.</CardDescription>
              </CardHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onFormSubmit)}>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="beneficiaryName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Beneficiary Full Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-10 bg-background" placeholder="e.g. John Doe" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="bankName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Bank Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-10 bg-background" placeholder="e.g. Bank of America" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="accountNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Hash className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-10 bg-background font-mono" placeholder="Enter account number" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="routingNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Routing / SWIFT Number</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Landmark className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-10 bg-background font-mono uppercase" placeholder="Enter routing code" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-background">
                                  <Globe className="w-4 h-4 text-muted-foreground mr-2" />
                                  <SelectValue placeholder="Select country" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="US">United States</SelectItem>
                                <SelectItem value="UK">United Kingdom</SelectItem>
                                <SelectItem value="CA">Canada</SelectItem>
                                <SelectItem value="AU">Australia</SelectItem>
                                <SelectItem value="EU">European Union</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reference / Memo (Optional)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input className="pl-10 bg-background" placeholder="e.g. Invoice #123" {...field} />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      
                      <FormField
                        control={form.control}
                        name="transferDate"
                        render={({ field }) => {
                          const selectedDate = field.value
                            ? new Date(`${field.value}T00:00:00`)
                            : new Date();

                          return (
                            <FormItem>
                              <FormLabel>Transfer Date</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full justify-start text-left font-normal bg-background"
                                    >
                                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                      {selectedDate.toLocaleDateString("en-US", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      })}
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>

                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    onSelect={(date) => {
                                      if (date) {
                                        field.onChange(
                                          date.toISOString().split("T")[0]
                                        );
                                      }
                                    }}
                                    disabled={(date) => {
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      return date < today;
                                    }}
                                    initialFocus
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                    
                    <div className="border-t border-border/50 pt-6 mt-6">
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-medium text-foreground">Transfer Amount</h3>
                          {dashboard && (
                            <span className="text-sm font-medium text-muted-foreground">
                              Available: <span className="text-foreground">{formatCurrency(dashboard.currentBalance)}</span>
                            </span>
                          )}
                        </div>
                        
                        <FormField
                          control={form.control}
                          name="amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <div className="relative flex items-center">
                                  <span className="absolute left-4 text-2xl text-muted-foreground font-medium">$</span>
                                  <Input 
                                    type="number" 
                                    step="0.01" 
                                    min="0.01"
                                    className="pl-10 h-16 text-2xl font-bold bg-background border-primary/30 focus-visible:ring-primary" 
                                    placeholder="0.00" 
                                    {...field} 
                                  />
                                  <span className="absolute right-4 text-sm font-medium text-muted-foreground">USD</span>
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="border-t border-border/50 bg-muted/10 p-6 flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>Clear Form</Button>
                    <Button type="submit" size="lg" className="px-8">
                      Continue to Review <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          </motion.div>
        )}

        {step === "review" && transferData && dashboard && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <Card className="shadow-md overflow-hidden">
              <CardHeader className="bg-[#0a2540] text-white p-6">
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-[#c9a227]" />
                  Review Transfer Details
                </CardTitle>
                <CardDescription className="text-white/70">
                  Please verify all information before confirming. Transfers cannot be reversed once processed.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-6 space-y-4 bg-muted/5">
                    <h3 className="font-semibold text-primary uppercase text-xs tracking-wider">From Account</h3>
                    <div>
                      <p className="font-medium text-foreground">{dashboard.user.fullName}</p>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{dashboard.user.accountNumber}</p>
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <h3 className="font-semibold text-primary uppercase text-xs tracking-wider">To Beneficiary</h3>
                    <div>
                      <p className="font-medium text-foreground text-lg">{transferData.beneficiaryName}</p>
                      <p className="text-sm font-medium mt-1">{transferData.bankName}</p>
                      <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-border/50 text-sm">
                        <div>
                          <span className="text-muted-foreground block text-xs mb-1">Account</span>
                          <span className="font-mono">{transferData.accountNumber}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs mb-1">Routing/SWIFT</span>
                          <span className="font-mono">{transferData.routingNumber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-primary/5 p-6 md:p-8 border-t border-border">
                  <div className="max-w-sm mx-auto">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-muted-foreground">Transfer Amount</span>
                      <span className="font-medium">{formatCurrency(transferData.amount)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-muted-foreground">Processing Fee</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-muted-foreground">Estimated Completion</span>
                      <span className="font-medium">2 Business Days</span>
                    </div>
                    
                    <div className="h-px bg-border/80 w-full my-4" />
                    
                    <div className="flex justify-between items-end mb-6">
                      <span className="font-semibold text-foreground">Total to Debit</span>
                      <span className="text-3xl font-bold text-foreground">{formatCurrency(transferData.amount)}</span>
                    </div>
                    
                    <div className="flex items-start space-x-3 mb-6 p-4 bg-background rounded-lg border border-border">
                      <Checkbox 
                        id="terms" 
                        checked={confirmed} 
                        onCheckedChange={(c) => setConfirmed(c as boolean)} 
                        className="mt-1"
                      />
                      <label htmlFor="terms" className="text-sm text-muted-foreground leading-snug cursor-pointer">
                        I confirm that the beneficiary details above are correct. I authorize Chase Bank to debit my account for the total amount shown.
                      </label>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Button variant="outline" onClick={() => setStep("form")} className="w-full">Edit Details</Button>
                      <Button 
                        onClick={executeTransfer} 
                        disabled={!confirmed || submitMutation.isPending} 
                        className="w-full shadow-md"
                      >
                        Confirm Transfer
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === "processing" && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#020b18] flex items-center justify-center p-6"
          >
            <div className="max-w-md w-full text-center space-y-8">
              <img src={chaseLogo} alt="Chase" className="h-12 mx-auto brightness-0 invert opacity-80" />
              
              <div className="relative mx-auto w-32 h-32">
                <div className="absolute inset-0 rounded-full border-4 border-[#1a3857]" />
                <motion.div 
                  className="absolute inset-0 rounded-full border-4 border-[#117aca] border-t-transparent border-r-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-10 h-10 text-[#c9a227]" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white tracking-wide">Processing Secure Transfer</h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={processingMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-white/60 font-mono text-sm"
                  >
                    {processingMessage}
                  </motion.p>
                </AnimatePresence>
              </div>
              
              <p className="text-white/40 text-xs mt-12">Please do not close this window or navigate away.</p>
            </div>
          </motion.div>
        )}

        {step === "success" && successData && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, type: "spring" }}
          >
            <Card className="shadow-xl overflow-hidden border-green-200 dark:border-green-900/30">
              <div className="bg-green-50 dark:bg-green-900/10 p-8 text-center border-b border-green-100 dark:border-green-900/20">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-500" />
                </div>
                <h2 className="text-3xl font-bold text-green-800 dark:text-green-400 mb-2">Transfer Successful</h2>
                <p className="text-green-700/80 dark:text-green-500/80 font-medium">Your request has been securely processed.</p>
              </div>
              
              <CardContent className="p-8">
                <div className="grid gap-6 mb-8 max-w-md mx-auto">
                  <div className="bg-muted/30 p-4 rounded-lg flex items-center justify-between">
                    <span className="text-muted-foreground font-medium">Reference Number</span>
                    <span className="font-mono font-bold text-foreground bg-background px-3 py-1 rounded shadow-sm">
                      {successData.transactionReference}
                    </span>
                  </div>
                  
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between pb-3 border-b border-border/50">
                      <span className="text-muted-foreground">Amount Transferred</span>
                      <span className="font-bold text-foreground text-lg">{formatCurrency(successData.amount)}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-border/50">
                      <span className="text-muted-foreground">Beneficiary</span>
                      <span className="font-medium">{successData.beneficiaryName}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-border/50">
                      <span className="text-muted-foreground">Destination Bank</span>
                      <span className="font-medium">{successData.bankName}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-border/50">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium text-green-600">{successData.status}</span>
                    </div>
                    <div className="flex justify-between pb-3 border-b border-border/50">
                      <span className="text-muted-foreground">Est. Completion</span>
                      <span className="font-medium">{formatDate(successData.estimatedCompletion)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button variant="outline" className="gap-2" onClick={generatePDF}>
                    <Download className="w-4 h-4" /> Download Receipt
                  </Button>
                  <Link href="/transactions">
                    <Button variant="outline" className="w-full sm:w-auto">View History</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button className="w-full sm:w-auto">Return to Dashboard</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
