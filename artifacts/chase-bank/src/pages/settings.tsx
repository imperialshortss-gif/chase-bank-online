import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/components/theme-provider";
import { Moon, Sun, Laptop } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">App Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application preferences and appearance.</p>
      </div>

      <Card className="shadow-md">
        <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the application looks on your device.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Label className="text-base">Theme Preference</Label>
            <RadioGroup
              defaultValue={theme}
              onValueChange={(val) => setTheme(val as any)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2"
            >
              <div>
                <RadioGroupItem value="light" id="theme-light" className="peer sr-only" />
                <Label
                  htmlFor="theme-light"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/10 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                >
                  <Sun className="mb-3 h-8 w-8 text-amber-500" />
                  <span className="font-medium">Light Mode</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem value="dark" id="theme-dark" className="peer sr-only" />
                <Label
                  htmlFor="theme-dark"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/10 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                >
                  <Moon className="mb-3 h-8 w-8 text-blue-400" />
                  <span className="font-medium">Dark Mode</span>
                </Label>
              </div>
              
              <div>
                <RadioGroupItem value="system" id="theme-system" className="peer sr-only" />
                <Label
                  htmlFor="theme-system"
                  className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent/10 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                >
                  <Laptop className="mb-3 h-8 w-8 text-slate-500" />
                  <span className="font-medium">System Default</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader className="border-b border-border/50 bg-muted/10 pb-4">
          <CardTitle>Session Security</CardTitle>
          <CardDescription>Manage your active session details.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 text-sm text-muted-foreground">
          <p>For your security, your online banking session will automatically expire after 15 minutes of inactivity. Please log out when you have completed your banking.</p>
        </CardContent>
      </Card>
    </div>
  );
}
