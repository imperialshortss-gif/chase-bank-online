import { useGetMe, useUpdateUserProfile, getGetMeQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Phone, MapPin, Building, ShieldCheck, CreditCard } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
});

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateMutation = useUpdateUserProfile();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
    },
  });

  if (isLoading || !user) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  const initials = user.fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  function onSubmit(values: z.infer<typeof profileSchema>) {
    updateMutation.mutate({ data: values }, {
      onSuccess: (updatedUser) => {
        toast({
          title: "Profile updated",
          description: "Your profile information has been saved successfully.",
        });
        queryClient.setQueryData(getGetMeQueryKey(), updatedUser);
        localStorage.setItem("chase_user", JSON.stringify(updatedUser));
      },
      onError: () => {
        toast({
          title: "Update failed",
          description: "There was an error updating your profile.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Profile & Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account information and preferences.</p>
      </div>

      <Card className="bg-gradient-to-r from-sidebar to-sidebar-accent text-white border-none shadow-lg overflow-hidden">
        <CardContent className="p-8 relative">
          <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
            <ShieldCheck className="w-48 h-48" />
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
            <Avatar className="w-24 h-24 border-4 border-white/20 shadow-xl bg-primary text-primary-foreground">
              <AvatarFallback className="text-3xl font-medium bg-primary">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="space-y-2 flex-1">
              <h2 className="text-3xl font-bold tracking-tight">{user.fullName}</h2>
              <div className="flex flex-wrap gap-4 text-white/80 text-sm">
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <User className="w-4 h-4" /> {user.username}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <Building className="w-4 h-4" /> {user.accountType}
                </span>
                <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  <ShieldCheck className="w-4 h-4" /> {user.accountStatus}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-2 shadow-md">
          <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Update your personal details and how we can reach you.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Legal Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-10" placeholder="name@example.com" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input className="pl-10" placeholder="+1 (555) 000-0000" {...field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mailing Address</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-10" placeholder="123 Main St, City, State ZIP" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="border-t border-border/50 bg-muted/10 p-6 flex justify-end">
                <Button type="submit" disabled={updateMutation.isPending} className="w-full sm:w-auto">
                  {updateMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                Account Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Account Number</p>
                <p className="font-mono font-medium">{user.accountNumber}</p>
              </div>
              <div className="h-px bg-border/50 w-full" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
                <p className="font-semibold text-lg text-primary">{formatCurrency(user.availableBalance)}</p>
              </div>
              <div className="h-px bg-border/50 w-full" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="font-medium">{user.createdAt ? formatDate(user.createdAt) : "N/A"}</p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-md border-primary/20 bg-primary/5">
            <CardContent className="p-6 text-center">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="font-medium text-foreground mb-2">Secure Account</h3>
              <p className="text-sm text-muted-foreground">Your connection to Chase Bank is encrypted with industry-standard 256-bit security.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
