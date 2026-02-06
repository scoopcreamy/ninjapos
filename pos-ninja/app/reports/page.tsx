"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { LayoutDashboard, TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet, ClipboardList, Printer, X } from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from "recharts";

interface Order {
  total_amount: number;
  created: string;
  order_date?: string; // Added optional field
  status: string;
  payment_method: string;
}

interface Expense {
  amount: number;
  created: string;
  date: string;
}

export default function ReportsPage() {
  const [salesTotal, setSalesTotal] = useState(0);
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Closing Sale State
  const [closingOpen, setClosingOpen] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    total: 0,
    cash: 0,
    qr: 0,
    ewallet: 0,
    card: 0,
    count: 0
  });

  // Month Filter State (Default: Current Month YYYY-MM)
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [debugLog, setDebugLog] = useState("Initializing...");

  const fetchData = async () => {
    setLoading(true);
    let log = `Filter: ${monthFilter}\n`;

    // Shared state for aggregation
    const dailyMap = new Map<string, { sales: number; expenses: number }>();
    let totalSales = 0;
    let totalExpenses = 0;

    // --- FETCH ORDERS ---
    try {
      const orders = await pb.collection("orders").getFullList<Order>({
        requestKey: null,
      });
      log += `Raw Orders: ${orders.length}\n`;

      // Filter for COMPLETED orders only (case insensitive)
      const validOrders = orders.filter(o =>
        o.status?.toLowerCase().includes("complete") ||
        o.status?.toLowerCase().includes("success") ||
        o.status?.toLowerCase() === "completed"
      );
      log += `Valid Status Orders: ${validOrders.length}\n`;

      // Filter Orders by Selected Month or Date Range
      const monthlyOrders = validOrders.filter(o => {
        const created = o.order_date || o.created || "";
        if (!created) {
          console.warn("Order missing created date:", o);
          return false;
        }

        // If date range is specified, use it instead of month filter
        if (startDate && endDate) {
          const orderDate = created.split(" ")[0]; // Get YYYY-MM-DD part
          return orderDate >= startDate && orderDate <= endDate;
        }

        // Otherwise use month filter
        return created.startsWith(monthFilter);
      });
      log += `Monthly Orders: ${monthlyOrders.length}\n`;
      if (orders.length > 0) log += `Sample Order Date: ${orders[0].order_date || orders[0].created || "N/A"}\n`;
      if (orders.length > 0) log += `Sample Order Keys: ${Object.keys(orders[0]).join(", ")}\n`;

      totalSales = monthlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

      // --- Calculate Daily Closing (Today's Data) ---
      const today = new Date().toISOString().split("T")[0];
      const todayOrders = validOrders.filter(o => (o.created || "").startsWith(today));

      const stats = todayOrders.reduce((acc, o) => {
        acc.total += o.total_amount || 0;
        acc.count += 1;
        const method = o.payment_method?.toLowerCase() || "cash";
        if (method.includes("cash")) acc.cash += o.total_amount || 0;
        else if (method.includes("duitnow") || method.includes("qr")) acc.qr += o.total_amount || 0;
        else if (method.includes("wallet") || method.includes("tng")) acc.ewallet += o.total_amount || 0;
        else if (method.includes("card") || method.includes("debit") || method.includes("credit")) acc.card += o.total_amount || 0;
        else acc.cash += o.total_amount || 0;
        return acc;
      }, { total: 0, cash: 0, qr: 0, ewallet: 0, card: 0, count: 0 });
      setDailyStats(stats);

      // Update Chart Data (Orders)
      monthlyOrders.forEach((o) => {
        const date = (o.created || "").split(" ")[0];
        if (!date) return;
        if (!dailyMap.has(date)) dailyMap.set(date, { sales: 0, expenses: 0 });
        dailyMap.get(date)!.sales += o.total_amount || 0;
      });

    } catch (e: any) {
      console.error("Error fetching orders:", e);
      log += `ERROR ORDERS: ${e.message}\n`;
    }

    // --- FETCH EXPENSES ---
    try {
      const expenses = await pb.collection("expenses").getFullList<Expense>({
        requestKey: null,
      });
      log += `Raw Expenses: ${expenses.length}\n`;
      if (expenses.length > 0) {
        log += `Sample Exp Keys: ${Object.keys(expenses[0]).join(", ")}\n`;
      }

      // Filter Expenses by Selected Month or Date Range
      const monthlyExpenses = expenses.filter(e => {
        const d = e.date || e.created || "";
        if (!d) return false;

        // If date range is specified, use it instead of month filter
        if (startDate && endDate) {
          const expenseDate = d.split(" ")[0]; // Get YYYY-MM-DD part
          return expenseDate >= startDate && expenseDate <= endDate;
        }

        // Otherwise use month filter
        return d.startsWith(monthFilter);
      });
      log += `Monthly Expenses: ${monthlyExpenses.length}\n`;
      if (expenses.length > 0) log += `Sample Exp Date: ${expenses[0].date || expenses[0].created || "N/A"}\n`;

      totalExpenses = monthlyExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      // Update Chart Data (Expenses)
      monthlyExpenses.forEach((e) => {
        const d = e.date || e.created || "";
        const date = d.split("T")[0]; // Ensure consistent YYYY-MM-DD
        if (!date) return;
        if (!dailyMap.has(date)) dailyMap.set(date, { sales: 0, expenses: 0 });
        dailyMap.get(date)!.expenses += e.amount || 0;
      });

    } catch (e: any) {
      console.error("Error fetching expenses:", e);
      log += `ERROR EXPENSES: ${e.message}\n`;
    }

    // Finalize State Updates
    setSalesTotal(totalSales);
    setExpensesTotal(totalExpenses);

    const data = Array.from(dailyMap.entries())
      .map(([date, values]) => ({
        name: date.slice(8, 10), // Show DD
        fullDate: date,
        sales: parseFloat(values.sales.toFixed(2)),
        expenses: parseFloat(values.expenses.toFixed(2)),
      }))
      .sort((a, b) => a.fullDate.localeCompare(b.fullDate));

    setChartData(data);
    setLoading(false);
    setDebugLog(log);
  };

  useEffect(() => {
    fetchData();
  }, [monthFilter, startDate, endDate]); // Re-fetch when month or date range changes


  const profit = salesTotal - expensesTotal;

  return (
    <div className="p-8 space-y-8 h-full overflow-auto bg-gray-50 dark:bg-zinc-950/50">

      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Business Reports
          </h1>
          <p className="text-muted-foreground">Overview of your P&L and performance.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border p-1 rounded-lg shadow-sm">
            <span className="text-xs font-bold px-2 text-muted-foreground uppercase">Month:</span>
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => {
                setMonthFilter(e.target.value);
                // Clear date range when month is selected
                setStartDate("");
                setEndDate("");
              }}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer"
              disabled={!!(startDate || endDate)}
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border p-1 rounded-lg shadow-sm">
            <span className="text-xs font-bold px-2 text-muted-foreground uppercase">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer"
            />
            <span className="text-xs font-bold px-2 text-muted-foreground">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent font-bold text-sm outline-none cursor-pointer"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                title="Clear date range"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2">
            <Button
              variant={(startDate === new Date().toISOString().split('T')[0] && endDate === new Date().toISOString().split('T')[0]) ? "default" : "outline"}
              size="sm"
              onClick={() => {
                const today = new Date().toISOString().split('T')[0];
                setStartDate(today);
                setEndDate(today);
              }}
              className="font-bold"
            >
              Today
            </Button>
          </div>

          {/* Closing Sale Button */}
          <Dialog open={closingOpen} onOpenChange={setClosingOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="gap-2 font-bold shadow-lg shadow-primary/20">
                <ClipboardList className="h-5 w-5" />
                Daily Closing
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black uppercase text-center">Todays Closing</DialogTitle>
                <DialogDescription className="text-center font-mono">
                  {new Date().toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="py-6 space-y-6">
                <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-2xl border-2 border-green-100 dark:border-green-800">
                  <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-1">Total Collected</p>
                  <p className="text-4xl font-black text-green-700 dark:text-green-400">RM {dailyStats.total.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{dailyStats.count} Transactions</p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">💵</div>
                      <span className="font-bold text-sm">Cash in Drawer</span>
                    </div>
                    <span className="font-mono font-bold">RM {dailyStats.cash.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">📷</div>
                      <span className="font-bold text-sm">DuitNow / QR</span>
                    </div>
                    <span className="font-mono font-bold">RM {dailyStats.qr.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">💳</div>
                      <span className="font-bold text-sm">Credit / Debit Card</span>
                    </div>
                    <span className="font-mono font-bold">RM {dailyStats.card.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-white dark:bg-zinc-900 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">📱</div>
                      <span className="font-bold text-sm">E-Wallet</span>
                    </div>
                    <span className="font-mono font-bold">RM {dailyStats.ewallet.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button className="w-full font-bold" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" /> Print Report
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">RM {salesTotal.toFixed(2)}</div>
              <ArrowUpCircle className="h-8 w-8 text-green-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">RM {expensesTotal.toFixed(2)}</div>
              <ArrowDownCircle className="h-8 w-8 text-red-500 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${profit >= 0 ? "border-l-primary" : "border-l-zinc-500"} shadow-sm bg-zinc-900 text-white`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400 uppercase">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-primary">RM {profit.toFixed(2)}</div>
              <Wallet className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Sales vs Expenses</CardTitle>
            <CardDescription>Weekly comparison performance</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Sales" />
                <Bar dataKey="expenses" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} name="Expenses" strokeOpacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Coming Soon (AI Optimization)</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground italic">
            Visualizing top selling items...
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
