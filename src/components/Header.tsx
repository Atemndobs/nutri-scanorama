import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-nutri-purple to-nutri-pink text-transparent bg-clip-text">
          NutriScan
        </h1>
        <p className="text-sm text-muted-foreground">Track your purchases</p>
      </div>
      <div className="flex items-center">
        <ThemeToggle />
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};