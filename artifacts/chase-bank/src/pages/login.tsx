import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import chaseLogo from "@assets/images_1783889036399.png";
import { motion } from "framer-motion";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

export default function Login() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      rememberMe: false,
    },
  });

  function onSubmit(values: z.infer<typeof loginSchema>) {
    loginMutation.mutate({ data: values }, {
      onSuccess: (res) => {
        login(res.token, res.user || null, res.isAdmin);
        setLocation(res.isAdmin ? "/admin/dashboard" : "/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err.message || "Invalid credentials",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex justify-center border-b border-border/40 bg-card">
        <img src={chaseLogo} alt="Chase" className="h-44 object-contain" />
      </header>

      <main className="flex-1 flex items-center justify-center p-6 relative">
        {/* Subtle background decoration */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md bg-card/60 backdrop-blur-xl border border-card-border p-8 rounded-xl shadow-2xl z-10"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground">Welcome to Online Banking</h1>
            <p className="text-muted-foreground mt-2">Sign in to manage your accounts</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} className="bg-background" />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                        Remember me
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-12 text-lg font-medium shadow-md hover:shadow-lg transition-all" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
            By logging in, you agree to our Terms of Service and Privacy Policy.
            All connections are encrypted.
          </p>

          <div className="mt-4 pt-4 border-t border-border text-center">
            <a
              href="/admin"
              className="text-sm text-primary hover:underline font-medium"
            >
              Admin Portal →
            </a>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
