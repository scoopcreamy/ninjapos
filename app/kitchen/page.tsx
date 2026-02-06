"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, CheckCircle2, ChefHat, Bell } from "lucide-react";

interface OrderItem {
  id: string;
  quantity: number;
  modifiers: any;
  expand: {
    product_id: {
      name: string;
      image: string;
    };
  };
}

interface Order {
  id: string;
  created: string;
  status: "new" | "cooking" | "ready" | "completed";
  order_type: string;
  total_amount: number;
  // We need to fetch related items. PocketBase supports reverse relations expand.
  // Syntax: collection(field)
  expand?: {
    "order_items(order_id)": OrderItem[];
  };
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = async () => {
    try {
      const res = await pb.collection("orders").getFullList<Order>({
        expand: 'order_items(order_id).product_id',
        requestKey: null,
      });
      setOrders(res);
    } catch (e: any) {
      console.error("Fetch Orders Error:", e);
      if (e.data) console.error("Error Data:", e.data);
      if (e.originalError) console.error("Original Error:", e.originalError);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime changes
    pb.collection("orders").subscribe("*", (e) => {
      console.log("Realtime event:", e);
      // Optimize: just refetch specific order or all. Refetch all is safest for KDS state.
      fetchOrders();
    });

    return () => {
      pb.collection("orders").unsubscribe("*");
    };
  }, []);

  const updateStatus = async (orderId: string, status: string) => {
    await pb.collection("orders").update(orderId, { status });
    // Optimistic update or wait for realtime? Realtime will trigger refetch.
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new": return "bg-red-100 text-red-800 border-red-200";
      case "cooking": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ready": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-zinc-900 p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          Kitchen Display System
        </h1>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium">Live Connection</span>
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-1">
            {orders.length} Active Orders
          </Badge>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
          {orders.map((order) => (
            <Card key={order.id} className={`border-2 shadow-lg overflow-hidden flex flex-col ${order.status === 'new' ? 'animate-in fade-in zoom-in border-primary/50' : 'border-transparent'}`}>
              <CardHeader className={`${order.status === 'new' ? 'bg-primary/10' : 'bg-gray-50 dark:bg-zinc-800'} pb-3`}>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">#{order.id.slice(-4)}</CardTitle>
                    <span className="text-sm text-muted-foreground capitalize">{order.order_type.replace('_', ' ')}</span>
                  </div>
                  <Badge variant="outline" className={`capitalize ${getStatusColor(order.status)}`}>
                    {order.status}
                  </Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-2">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(order.created).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-4">
                <ul className="space-y-3">
                  {order.expand?.["order_items(order_id)"]?.map((item) => (
                    <li key={item.id} className="flex justify-between items-start font-medium text-lg border-b pb-2 last:border-0 border-dashed">
                      <span>{item.expand?.product_id?.name || "Unknown Item"}</span>
                      <Badge variant="secondary" className="ml-2 text-md h-7 w-7 flex items-center justify-center shrink-0">
                        {item.quantity}
                      </Badge>
                    </li>
                  ))}
                  {!order.expand?.["order_items(order_id)"] && (
                    <li className="text-muted-foreground text-sm italic">Loading items...</li>
                  )}
                </ul>
              </CardContent>

              <div className="p-4 bg-gray-50 dark:bg-zinc-800 border-t mt-auto gap-2 grid grid-cols-2">
                {order.status === 'new' && (
                  <Button className="col-span-2 w-full h-12 text-lg" onClick={() => updateStatus(order.id, 'cooking')}>
                    Start Cooking
                  </Button>
                )}
                {order.status === 'cooking' && (
                  <Button className="col-span-2 w-full h-12 text-lg bg-green-600 hover:bg-green-700 text-white" onClick={() => updateStatus(order.id, 'ready')}>
                    Mark Ready
                  </Button>
                )}
                {order.status === 'ready' && (
                  <Button variant="outline" className="col-span-2 w-full h-12 text-lg" onClick={() => updateStatus(order.id, 'completed')}>
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    Complete
                  </Button>
                )}
              </div>
            </Card>
          ))}
          {orders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center h-96 text-muted-foreground opacity-50">
              <ChefHat className="h-24 w-24 mb-4" />
              <p className="text-2xl font-light">All clear, Chef!</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
