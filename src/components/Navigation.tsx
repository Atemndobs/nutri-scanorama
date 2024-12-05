import { Home, Receipt, PieChart, Settings, Grid } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="container max-w-md mx-auto">
        <div className="flex justify-around py-2">
          <Link
            to="/"
            className={`flex flex-col items-center p-2 ${
              isActive("/") ? "text-nutri-purple" : "text-muted-foreground"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            to="/scans"
            className={`flex flex-col items-center p-2 ${
              isActive("/scans") ? "text-nutri-purple" : "text-muted-foreground"
            }`}
          >
            <Receipt className="h-5 w-5" />
            <span className="text-xs">Scans</span>
          </Link>
          <Link
            to="/categories"
            className={`flex flex-col items-center p-2 ${
              isActive("/categories") ? "text-nutri-purple" : "text-muted-foreground"
            }`}
          >
            <Grid className="h-5 w-5" />
            <span className="text-xs">Categories</span>
          </Link>
          <Link
            to="/stats"
            className={`flex flex-col items-center p-2 ${
              isActive("/stats") ? "text-nutri-purple" : "text-muted-foreground"
            }`}
          >
            <PieChart className="h-5 w-5" />
            <span className="text-xs">Stats</span>
          </Link>
          <Link
            to="/settings"
            className={`flex flex-col items-center p-2 ${
              isActive("/settings") ? "text-nutri-purple" : "text-muted-foreground"
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </div>
    </nav>
  );
};