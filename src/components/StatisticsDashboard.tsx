import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Euro, ShoppingBag, Receipt, TrendingUp } from "lucide-react";

export const StatisticsDashboard = () => {
  const receipts = useLiveQuery(() => db.receipts.toArray());

  const totalSpent = receipts?.reduce((sum, receipt) => sum + (receipt.totalAmount || 0), 0) || 0;
  const totalReceipts = receipts?.length || 0;
  const averagePerReceipt = totalReceipts > 0 ? totalSpent / totalReceipts : 0;

  // Prepare data for the spending trend chart
  const spendingTrend = receipts?.reduce((acc: any[], receipt) => {
    const date = new Date(receipt.uploadDate).toLocaleDateString();
    const existingEntry = acc.find(entry => entry.date === date);
    
    if (existingEntry) {
      existingEntry.amount += receipt.totalAmount || 0;
    } else {
      acc.push({ date, amount: receipt.totalAmount || 0 });
    }
    
    return acc;
  }, []) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Statistics Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <Euro className="h-4 w-4 text-nutri-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{totalSpent.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Receipts</CardTitle>
            <Receipt className="h-4 w-4 text-nutri-pink" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReceipts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average per Receipt</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{averagePerReceipt.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Spending Trend</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={spendingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#8884d8" 
                name="Amount (€)"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};