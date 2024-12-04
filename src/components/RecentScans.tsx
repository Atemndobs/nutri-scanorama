import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, ShoppingBag } from "lucide-react";

const mockScans = [
  {
    id: 1,
    store: "REWE",
    date: "2024-02-20",
    total: "€45.67",
  },
  {
    id: 2,
    store: "Aldi",
    date: "2024-02-19",
    total: "€32.99",
  },
];

export const RecentScans = () => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Recent Scans</h2>
      {mockScans.map((scan) => (
        <Card key={scan.id} className="bg-card/50 backdrop-blur-sm hover:bg-card/60 transition-colors cursor-pointer">
          <CardContent className="flex items-center p-4">
            <div className="h-10 w-10 rounded-full bg-nutri-purple/10 flex items-center justify-center mr-4">
              <Receipt className="h-5 w-5 text-nutri-purple" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium flex items-center">
                <ShoppingBag className="h-4 w-4 mr-2 text-nutri-pink" />
                {scan.store}
              </h3>
              <p className="text-sm text-muted-foreground">{scan.date}</p>
            </div>
            <div className="text-right">
              <p className="font-medium">{scan.total}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};