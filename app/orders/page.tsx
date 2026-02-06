"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    ClipboardList,
    Search,
    Eye,
    Printer,
    Loader2,
    Calendar as CalendarIcon,
    Filter,
    X,
    RotateCcw,
    Edit,
    Trash2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Order {
    id: string;
    total_amount: number;
    status: string;
    payment_method: string;
    order_type: string;
    customer_id: string;
    tax_amount?: number;
    tax_rate?: number;
    expand?: {
        customer_id?: {
            name: string;
            phone: string;
        }
    };
    created: string;
    order_date?: string;
    tendered_amount?: number;
    change_amount?: number;
    points_redeemed?: number;
    discount_amount?: number;
}

interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    quantity: number;
    price_at_time: number;
    expand?: {
        product_id?: {
            name: string;
        }
    };
}

interface Branch {
    name: string;
    address: string;
}

interface LoyaltySettings {
    tax_percentage: number;
}

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    // Filtering State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Edit Dialog State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [editDate, setEditDate] = useState("");
    const [editOrderType, setEditOrderType] = useState("");

    // Receipt Printing Data Meta
    const [branch, setBranch] = useState<Branch | null>(null);
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [orderRes, branchRes, loyaltyRes] = await Promise.all([
                pb.collection("orders").getFullList<Order>({
                    expand: "customer_id",
                    requestKey: null
                }),
                pb.collection("branches").getFullList<Branch>({ requestKey: null }),
                pb.collection("loyalty_settings").getFullList<LoyaltySettings>({ requestKey: null })
            ]);

            setOrders(orderRes);
            if (branchRes.length > 0) setBranch(branchRes[0]);
            if (loyaltyRes.length > 0) setLoyaltySettings(loyaltyRes[0]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchOrderDetails = async (order: Order) => {
        setSelectedOrder(order);
        setLoadingItems(true);
        setIsDetailsOpen(true);
        try {
            const items = await pb.collection("order_items").getFullList<OrderItem>({
                filter: `order_id="${order.id}"`,
                expand: "product_id",
                requestKey: null
            });
            setOrderItems(items);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingItems(false);
        }
    };

    const handlePrint = async (order: Order) => {
        // To print, we need the items. If we don't have them, fetch them first.
        let itemsToPrint = orderItems;
        if (selectedOrder?.id !== order.id) {
            const items = await pb.collection("order_items").getFullList<OrderItem>({
                filter: `order_id="${order.id}"`,
                expand: "product_id",
                requestKey: null
            });
            itemsToPrint = items;
        }

        // Use a temporary div for printing if not using the hidden one (or just use the hidden one and trigger print)
        // For simplicity, we'll set the selected order and items, then window.print() after a tiny delay
        setSelectedOrder(order);
        setOrderItems(itemsToPrint);

        setTimeout(() => {
            window.print();
        }, 100);
    };

    const filteredOrders = orders.filter(o => {
        // Status Filter
        if (statusFilter !== "all" && o.status !== statusFilter) return false;

        // Date Filter
        if (dateFilter) {
            const dateStr = o.order_date || o.created;
            if (dateStr) {
                const orderDate = new Date(dateStr);
                const filterDateStr = format(dateFilter, "yyyy-MM-dd");
                const orderDateStr = format(orderDate, "yyyy-MM-dd");
                if (filterDateStr !== orderDateStr) return false;
            }
        }

        // Search Filter
        const query = searchQuery.toLowerCase();
        return (
            o.id.toLowerCase().includes(query) ||
            o.expand?.customer_id?.name.toLowerCase().includes(query) ||
            o.expand?.customer_id?.phone.includes(query)
        );
    });

    const resetFilters = () => {
        setSearchQuery("");
        setStatusFilter("all");
        setDateFilter(undefined);
    }

    const handleDelete = async (orderId: string) => {
        if (!confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
            return;
        }
        try {
            await pb.collection("orders").delete(orderId, { requestKey: null });
            await fetchData(); // Refresh the list
            alert("Order deleted successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to delete order. See console for details.");
        }
    };

    const handleEdit = (order: Order) => {
        setEditingOrder(order);
        // Extract date from order_date or created
        const dateStr = order.order_date || order.created || "";
        const datePart = dateStr.split(" ")[0] || dateStr.split("T")[0] || "";
        setEditDate(datePart);
        setEditOrderType(order.order_type || "dine_in");
        setIsEditOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;

        try {
            await pb.collection("orders").update(editingOrder.id, {
                order_date: editDate ? `${editDate} 00:00:00` : undefined,
                order_type: editOrderType,
            }, { requestKey: null });

            setIsEditOpen(false);
            await fetchData(); // Refresh the list
            alert("Order updated successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to update order. See console for details.");
        }
    };



    return (
        <div className="p-8 space-y-8 h-full overflow-auto bg-gray-50/50 dark:bg-zinc-950/50">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <ClipboardList className="h-8 w-8 text-primary" />
                        Order Management
                    </h1>
                    <p className="text-muted-foreground">View and manage all store transactions.</p>
                </div>
            </header>

            <Card>
                <CardHeader>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <CardTitle>Transaction History</CardTitle>

                            {/* Tabs for Status */}
                            <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-[400px]">
                                <TabsList className="grid w-full grid-cols-3">
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="completed">Completed</TabsTrigger>
                                    <TabsTrigger value="pending">Pending</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                            {/* Search */}
                            <div className="relative w-full lg:flex-1">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search Order ID, Customer Name or Phone..."
                                    className="pl-8"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>

                            {/* Date Filter */}
                            <div className="flex items-center gap-2 w-full lg:w-auto">
                                <div className="relative flex-1 lg:flex-none">
                                    <CalendarIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                                    <Input
                                        type="date"
                                        className="pl-8 w-full lg:w-[180px] dark:[color-scheme:dark]"
                                        value={dateFilter ? format(dateFilter, "yyyy-MM-dd") : ""}
                                        onChange={(e) => {
                                            const date = e.target.value ? new Date(e.target.value) : undefined;
                                            setDateFilter(date);
                                        }}
                                    />
                                </div>

                                {(searchQuery || statusFilter !== "all" || dateFilter) && (
                                    <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filters">
                                        <RotateCcw className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Mobile-friendly Scrollable Table */}
                    <div className="overflow-x-auto -mx-6">
                        <div className="inline-block min-w-full align-middle px-6">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Order ID</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Payment</TableHead>
                                        <TableHead>Total</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8">
                                                <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground italic">
                                                No orders found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <TableRow key={order.id}>
                                                <TableCell className="font-mono text-xs uppercase">{order.id}</TableCell>
                                                <TableCell className="text-xs">
                                                    {(() => {
                                                        const dateStr = order.order_date || order.created;
                                                        if (!dateStr) return "No Date";
                                                        try {
                                                            return new Date(dateStr).toLocaleString();
                                                        } catch {
                                                            return "Invalid Date";
                                                        }
                                                    })()}
                                                </TableCell>
                                                <TableCell>
                                                    {order.expand?.customer_id ? (
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{order.expand.customer_id.name}</span>
                                                            <span className="text-[10px] text-muted-foreground">{order.expand.customer_id.phone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted-foreground italic">Guest</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="capitalize">
                                                        {order.order_type.replace("_", " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {order.payment_method.replace("_", " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    RM {order.total_amount.toFixed(2)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button variant="ghost" size="icon" title="View Details" onClick={() => fetchOrderDetails(order)}>
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" title="Edit Order" onClick={() => handleEdit(order)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" title="Re-print Receipt" onClick={() => handlePrint(order)}>
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" title="Delete Order" className="text-destructive hover:text-destructive" onClick={() => handleDelete(order.id)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Order Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Order Details #{selectedOrder?.id.toUpperCase()}</DialogTitle>
                    </DialogHeader>
                    {loadingItems ? (
                        <div className="py-8 flex justify-center">
                            <Loader2 className="animate-spin h-8 w-8 text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 text-sm gap-y-2">
                                <span className="text-muted-foreground">Date:</span>
                                <span>{selectedOrder && new Date(selectedOrder.created).toLocaleString()}</span>
                                <span className="text-muted-foreground">Customer:</span>
                                <span>{selectedOrder?.expand?.customer_id?.name || "Guest"}</span>
                                <span className="text-muted-foreground">Payment:</span>
                                <span className="capitalize">{selectedOrder?.payment_method.replace("_", " ")}</span>
                            </div>

                            <Separator />

                            <div className="space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground">Items</p>
                                {orderItems.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span>{item.quantity}x {item.expand?.product_id?.name || "Product"}</span>
                                        <span>RM {(item.quantity * item.price_at_time).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>

                            <Separator />

                            <div className="space-y-1">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Subtotal</span>
                                    <span>RM {(selectedOrder?.total_amount || 0).toFixed(2)}</span>
                                </div>
                                {selectedOrder?.discount_amount && selectedOrder.discount_amount > 0 ? (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Discount</span>
                                        <span>-RM {selectedOrder.discount_amount.toFixed(2)}</span>
                                    </div>
                                ) : null}
                                <div className="flex justify-between font-bold text-lg pt-2">
                                    <span>Total</span>
                                    <span>RM {selectedOrder?.total_amount.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => selectedOrder && handlePrint(selectedOrder)}>
                            <Printer className="mr-2 h-4 w-4" /> Print Receipt
                        </Button>
                        <Button onClick={() => setIsDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Hidden Receipt Component for Printing */}
            <div id="receipt-print" className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 font-mono text-sm">
                {selectedOrder && (
                    <div className="max-w-[80mm] mx-auto">
                        <div className="text-center mb-4">
                            <h2 className="text-lg font-bold uppercase">{branch?.name || "POS Ninja"}</h2>
                            <p className="text-xs">{branch?.address || ""}</p>
                            <div className="border-b border-dashed my-2"></div>
                            <p>RECEIPT (REPRINT)</p>
                            <p className="uppercase">#{selectedOrder.id}</p>
                            <p className="text-[10px]">{new Date(selectedOrder.created).toLocaleString()}</p>
                        </div>

                        <div className="space-y-1">
                            {orderItems.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                    <span>{item.quantity}x {item.expand?.product_id?.name || "Product"}</span>
                                    <span>{(item.quantity * item.price_at_time).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-b border-dashed my-2"></div>

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{(selectedOrder.total_amount - (selectedOrder.tax_amount || 0) + (selectedOrder.discount_amount || 0)).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax ({selectedOrder.tax_rate || 0}%)</span>
                                <span>{(selectedOrder.tax_amount || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-base pt-1">
                                <span>TOTAL</span>
                                <span>RM {selectedOrder.total_amount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="border-b border-dashed my-2"></div>

                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between uppercase">
                                <span>Payment: {selectedOrder.payment_method.replace("_", " ")}</span>
                            </div>
                        </div>

                        <div className="text-center mt-6 pt-4 border-t border-dashed">
                            <p>Thank You!</p>
                            <p className="text-[10px]">Customer: {selectedOrder.expand?.customer_id?.name || "Guest"}</p>
                            <p className="mt-2 text-[8px] opacity-50">Powered by POS Ninja AI</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Order Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Order</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Order ID</label>
                            <Input value={editingOrder?.id || ""} disabled className="bg-muted" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Date</label>
                            <Input
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Order Type</label>
                            <select
                                value={editOrderType}
                                onChange={(e) => setEditOrderType(e.target.value)}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="dine_in">Dine In</option>
                                <option value="takeaway">Takeaway</option>
                                <option value="delivery">Delivery</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEdit}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    #receipt-print, #receipt-print * {
                        visibility: visible;
                    }
                    #receipt-print {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
