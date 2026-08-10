import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAdminLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import chaseLogo from "@assets/images_1783889036399.png";
import { motion } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AdminLogin() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useAdminLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        login(res.token, res.user || null, res.isAdmin);
        setLocation("/admin/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err.message || "Invalid admin credentials",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#020b18] flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-[#0a2540] border border-[#1a3857] p-10 rounded-xl shadow-2xl z-10"
        >
          <div className="text-center mb-10">
            <img src={chaseLogo} alt="Chase" className="h-12 object-contain mx-auto mb-4 brightness-0 invert" />
            <h1 className="text-xl font-medium tracking-widest text-[#c9a227] uppercase">Administration</h1>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Admin ID</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter Admin ID" 
                        {...field} 
                        className="bg-[#020b18] border-[#1a3857] text-white focus-visible:ring-[#c9a227]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Security Key</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Enter password" 
                        {...field} 
                        className="bg-[#020b18] border-[#1a3857] text-white focus-visible:ring-[#c9a227]" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 bg-[#c9a227] hover:bg-[#b08d22] text-[#0a2540] text-lg font-semibold shadow-md transition-all mt-4" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Authenticating..." : "Secure Login"}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-white/40">
            <p>Demo: admin / admin123</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
