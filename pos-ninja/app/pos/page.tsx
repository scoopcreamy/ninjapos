"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
// Removed mock-data import
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ShoppingCart, Plus, Minus, Trash2, Loader2, MapPin, Users, Phone, ArrowRight, Save, UserPlus, Star, Gift, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    image: string; // collectionId/recordId/filename
    collectionId: string;
    collectionName: string;
}

interface Branch {
    id: string;
    name: string;
    address: string;
}

interface Category {
    id: string;
    name: string;
}

interface Customer {
    id: string;
    name: string;
    phone: string;
    loyalty_points: number;
    last_visit: string;
    total_visits: number;
    joined_date: string;
}

interface CartItem {
    product: Product;
    quantity: number;
}

interface Order {
    id: string;
    total_amount: number;
    status: string;
    table_number?: string;
}

interface LoyaltySettings {
    id: string;
    points_ratio: number;
    redemption_ratio: number;
    tax_percentage: number;
    punch_target: number;
    punch_min_purchase: number;
    punch_reward_name: string;
}

export default function POSPage() {
    const [activeCategory, setActiveCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([{ id: "all", name: "All Items" }]);
    const [branch, setBranch] = useState<Branch | null>(null);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    // Loyalty State
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);

    // Customer State
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [phoneInput, setPhoneInput] = useState("");
    const [nameInput, setNameInput] = useState("");
    const [checkingCustomer, setCheckingCustomer] = useState(false);
    const [customerNotFound, setCustomerNotFound] = useState(false);

    // Parking/Recall State
    const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
    const [tableNumber, setTableNumber] = useState("");
    const [isRecallOpen, setIsRecallOpen] = useState(false);
    const [pendingOrders, setPendingOrders] = useState<Order[]>([]);

    useEffect(() => {
        Promise.all([
            pb.collection("products").getFullList<Product>({
                sort: 'name',
                filter: 'deleted = false',
                requestKey: null
            }),
            pb.collection("categories").getFullList({
                sort: 'name',
                requestKey: null
            }),
            pb.collection("loyalty_settings").getFullList<LoyaltySettings>({ requestKey: null }),
            pb.collection("branches").getFullList<Branch>({ requestKey: null })
        ])
            .then(([prodRes, catRes, loyaltyRes, branchRes]) => {
                setProducts(prodRes);
                if (branchRes.length > 0) setBranch(branchRes[0]);

                const mappedCategories = catRes.map((cat: any) => ({
                    id: cat.name.toLowerCase(), // Use lowercase name as ID to match product.category
                    name: cat.name
                }));
                setCategories([{ id: "all", name: "All Items" }, ...mappedCategories]);

                if (loyaltyRes.length > 0) setLoyaltySettings(loyaltyRes[0]);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const filteredProducts = products.filter((product) => {
        const matchesCategory =
            activeCategory === "all" || product.category === activeCategory;
        const matchesSearch = product.name
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const addToCart = (product: Product) => {
        setCart((prev) => {
            const existing = prev.find((item) => item.product.id === product.id);
            if (existing) {
                return prev.map((item) =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prev, { product, quantity: 1 }];
        });
    };

    const removeFromCart = (productId: string) => {
        setCart((prev) => prev.filter((item) => item.product.id !== productId));
    };

    const updateQuantity = (productId: string, delta: number) => {
        setCart((prev) => {
            return prev.map((item) => {
                if (item.product.id === productId) {
                    const newQuantity = Math.max(1, item.quantity + delta);
                    return { ...item, quantity: newQuantity };
                }
                return item;
            });
        });
    };

    const fetchPendingOrders = async () => {
        try {
            const res = await pb.collection("orders").getFullList<Order>({
                filter: 'status="pending"',
                // sort: '-created', // REMOVED: Caused 400 error due to missing created field
            });

            console.log("Fetched pending orders:", res);
            // alert(`Debug: Fetched ${res.length} orders`); // Temporary debug
            setPendingOrders(res);
        } catch (e: any) {
            if (e.isAbort) return;
            console.error("Error fetching pending orders:", e);
            console.error("Error data:", e.data);
        }
    };

    const deleteOrder = async (orderId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent triggering recall
        if (!confirm("Padam order ni?")) return;

        try {
            await pb.collection("orders").delete(orderId);
            // Also delete order items
            const items = await pb.collection("order_items").getFullList({ filter: `order_id="${orderId}"` });
            await Promise.all(items.map(item => pb.collection("order_items").delete(item.id)));

            // Refresh list
            fetchPendingOrders();
            alert("Order dipadam.");
        } catch (e: any) {
            console.error("Delete error:", e);
            alert("Gagal padam: " + e.message);
        }
    };

    useEffect(() => {
        fetchPendingOrders();
    }, [isRecallOpen]);

    const getImageUrl = (product: Product) => {
        if (product.image) {
            return pb.files.getUrl(product, product.image);
        }
        // simple placeholder
        return `https://placehold.co/400?text=${encodeURIComponent(product.name)}`;
    };

    const subtotal = cart.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );
    const taxRate = (loyaltySettings?.tax_percentage || 0) / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const initiateCheckout = () => {
        if (cart.length === 0) return;
        setIsCustomerDialogOpen(true);
        setPhoneInput("");
        setNameInput("");
        setCustomer(null);
        setCustomerNotFound(false);
        setPointsToRedeem(0);
        setPointsDiscount(0);
    };

    const checkCustomer = async () => {
        if (!phoneInput) return;
        setCheckingCustomer(true);
        try {
            const res = await pb.collection("customers").getFirstListItem<Customer>(`phone="${phoneInput}"`, { requestKey: null });
            setCustomer(res);
            setCustomerNotFound(false);
        } catch (e) {
            setCustomer(null);
            setCustomerNotFound(true);
            // Auto focus name input effectively handled by UI state
        } finally {
            setCheckingCustomer(false);
        }
    }

    const [checkoutStep, setCheckoutStep] = useState<'customer' | 'payment' | 'cash_tender' | 'success'>('customer');
    const [amountTendered, setAmountTendered] = useState<string>("");
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
    const [lastOrder, setLastOrder] = useState<any>(null); // For success screen

    // Redemption State
    const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
    const [pointsDiscount, setPointsDiscount] = useState<number>(0);

    const handleRedeemChange = (points: number) => {
        if (!customer || !loyaltySettings) return;
        const maxRedeem = Math.min(points, customer.loyalty_points);
        setPointsToRedeem(maxRedeem);
        setPointsDiscount(maxRedeem / (loyaltySettings.redemption_ratio || 100));
    };

    const finalTotal = Math.max(0, total - pointsDiscount);

    // Proceed from Customer -> Payment Step
    const proceedToPayment = async () => {
        // If there's a new customer form filled, create them now OR verify existing
        if (customerNotFound && nameInput && phoneInput) {
            setCheckingCustomer(true);
            try {
                const newCustomer = await pb.collection("customers").create({
                    phone: phoneInput,
                    name: nameInput,
                    joined_date: new Date().toISOString()
                }, { requestKey: null });
                setCustomer(newCustomer as unknown as Customer);
                setCustomerNotFound(false);
            } catch (e) {
                console.error(e);
                alert("Failed to register customer. Check console.");
                return;
            } finally {
                setCheckingCustomer(false);
            }
        }

        setCheckoutStep('payment');
    };

    const handlePaymentSelect = (method: string) => {
        setSelectedPaymentMethod(method);
        if (method === 'cash') {
            setAmountTendered("");
            setCheckoutStep('cash_tender');
        } else {
            // For now, assume other methods are instant/manual approval
            finalizeOrder(method);
        }
    };

    const finalizeOrder = async (method: string, tendered: number = 0) => {
        if (cart.length === 0) return;
        setProcessing(true);

        try {
            const customerId = customer?.id;

            // Create or Update Order
            const orderData = {
                total_amount: finalTotal,
                status: "completed",
                payment_method: method,
                order_type: "dine_in",
                customer_id: customerId || null,
                tendered_amount: tendered,
                change_amount: tendered > 0 ? tendered - finalTotal : 0,
                tax_amount: tax,
                tax_rate: (loyaltySettings?.tax_percentage || 0),
                points_redeemed: pointsToRedeem,
                discount_amount: pointsDiscount,
                table_number: tableNumber,
                order_date: new Date().toISOString() // Explicitly save date to fix missing 'created' issue
            };

            let order;
            if (currentOrderId) {
                order = await pb.collection("orders").update(currentOrderId, orderData, { requestKey: null });
                // Clear old items
                const oldItems = await pb.collection("order_items").getFullList({ filter: `order_id="${currentOrderId}"`, requestKey: null });
                await Promise.all(oldItems.map(item => pb.collection("order_items").delete(item.id, { requestKey: null })));
            } else {
                order = await pb.collection("orders").create(orderData, { requestKey: null });
            }

            // Create Order Items
            const promises = cart.map((item) => {
                return pb.collection("order_items").create({
                    order_id: order.id,
                    product_id: item.product.id,
                    quantity: item.quantity,
                    price_at_time: item.product.price,
                }, { requestKey: null });
            });

            await Promise.all(promises);

            // Update Loyalty Points & Punch Card AFTER successful order
            let earnedPoints = 0;
            if (customerId && loyaltySettings) {
                earnedPoints = Math.floor(total * loyaltySettings.points_ratio);
                try {
                    // Re-fetch customer to get latest points to be safe, or use local state
                    const freshCustomer = await pb.collection("customers").getOne(customerId, { requestKey: null });
                    await pb.collection("customers").update(customerId, {
                        loyalty_points: (freshCustomer.loyalty_points || 0) + earnedPoints - pointsToRedeem,
                        last_visit: new Date().toISOString(),
                        total_visits: (freshCustomer.total_visits || 0) + 1
                    }, { requestKey: null });

                    // Punch card logic
                    let punchCard;
                    try {
                        punchCard = await pb.collection("customer_punch_cards").getFirstListItem(`customer_id="${customerId}"`, { requestKey: null });
                    } catch (e) {
                        // Create if not exists
                        punchCard = await pb.collection("customer_punch_cards").create({
                            customer_id: customerId,
                            current_punches: 0,
                            total_completed: 0
                        }, { requestKey: null });
                    }

                    if (punchCard) {
                        const meetsMinSpend = total >= (loyaltySettings.punch_min_purchase || 0);
                        let newPunches = punchCard.current_punches + (meetsMinSpend ? 1 : 0);
                        let newCompleted = punchCard.total_completed;

                        if (newPunches >= loyaltySettings.punch_target) {
                            newPunches = 0;
                            newCompleted += 1;
                        }

                        await pb.collection("customer_punch_cards").update(punchCard.id, {
                            current_punches: newPunches,
                            total_completed: newCompleted
                        }, { requestKey: null });
                    }
                } catch (loyaltyErr) {
                    console.error("Loyalty update failed but order created:", loyaltyErr);
                    // Non-critical error, don't halt success screen
                }
            }

            setLastOrder({
                ...order,
                earnedPoints,
                items: [...cart], // Snapshot for receipt
                subtotal,
                tax,
                taxRate: (loyaltySettings?.tax_percentage || 0),
                customerName: customer?.name || "Guest",
                branchName: branch?.name || "POS Ninja",
                branchAddress: branch?.address || ""
            });
            setCart([]);
            setCheckoutStep('success'); // Show success screen

        } catch (err) {
            console.error(err);
            alert("Failed to checkout. See console.");
        } finally {
            setProcessing(false);
        }
    };

    // Calculate change for display
    const tenderedVal = parseFloat(amountTendered) || 0;
    const changeVal = tenderedVal - finalTotal;

    const parkOrder = async () => {
        if (cart.length === 0 || !tableNumber) {
            alert("Sila masukkan nombor meja!");
            return;
        }
        setProcessing(true);
        try {
            const orderData = {
                total_amount: finalTotal,
                status: "pending",
                payment_method: "pending",
                order_type: "dine_in",
                customer_id: customer?.id || null,
                tendered_amount: 0,
                change_amount: 0,
                tax_amount: tax,
                tax_rate: (loyaltySettings?.tax_percentage || 0),
                points_redeemed: pointsToRedeem || 0,
                discount_amount: pointsDiscount || 0,
                table_number: tableNumber
            };

            let order;
            if (currentOrderId) {
                order = await pb.collection("orders").update(currentOrderId, orderData, { requestKey: null });
                const oldItems = await pb.collection("order_items").getFullList({ filter: `order_id="${currentOrderId}"`, requestKey: null });
                await Promise.all(oldItems.map(item => pb.collection("order_items").delete(item.id, { requestKey: null })));
            } else {
                order = await pb.collection("orders").create(orderData, { requestKey: null });
            }

            const promises = cart.map((item) => {
                return pb.collection("order_items").create({
                    order_id: order.id,
                    product_id: item.product.id,
                    quantity: item.quantity,
                    price_at_time: item.product.price,
                }, { requestKey: null });
            });
            await Promise.all(promises);

            // Refresh pending orders list with slight delay to ensure DB indexing
            setTimeout(async () => {
                await fetchPendingOrders();
            }, 500);

            setCart([]);
            setCurrentOrderId(null);
            setTableNumber("");
            setIsCustomerDialogOpen(false);
            alert("Order telah disimpan (Meja: " + tableNumber + ")");
        } catch (e: any) {
            console.error("parkOrder error:", e);
            console.error("Error details:", e.response || e.message);
            alert("Gagal simpan order: " + (e.message || "Unknown error"));
        } finally {
            setProcessing(false);
        }
    };

    const recallOrder = async (order: Order) => {
        try {
            const items = await pb.collection("order_items").getFullList({
                filter: `order_id="${order.id}"`,
                expand: "product_id",
                requestKey: null
            });

            const cartItems: CartItem[] = items.map((item: any) => ({
                product: {
                    id: item.expand.product_id.id,
                    name: item.expand.product_id.name,
                    price: item.price_at_time,
                    category: item.expand.product_id.category,
                    image: item.expand.product_id.image,
                    collectionId: item.expand.product_id.collectionId,
                    collectionName: item.expand.product_id.collectionName,
                },
                quantity: item.quantity
            }));

            setCart(cartItems);
            setCurrentOrderId(order.id);
            setTableNumber(order.table_number || "");
            setIsRecallOpen(false);
        } catch (e) {
            console.error(e);
            alert("Gagal amik balik order.");
        }
    };

    const handlePrint = () => {
        if (!lastOrder) return;
        window.print();
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-zinc-900 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header */}
                <header className="h-16 border-b bg-white dark:bg-zinc-800 flex items-center px-4 md:px-6 justify-between shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-full max-w-xs md:max-w-md lg:max-w-lg ml-2 lg:ml-0">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search products..."
                                className="pl-9 bg-gray-100 dark:bg-zinc-700 border-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setIsRecallOpen(true)}
                            className="relative scale-100 active:scale-95 transition-all text-zinc-600 dark:text-zinc-400"
                            title="Recall Pending Orders"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            {pendingOrders.length > 0 && (
                                <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white border-white text-[10px]">
                                    {pendingOrders.length}
                                </Badge>
                            )}
                        </Button>
                        <Badge variant="outline" className="px-3 py-1">Branch A</Badge>
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            A
                        </div>
                    </div>
                </header>

                {/* Categories */}
                <div className="h-14 border-b bg-white/50 backdrop-blur dark:bg-zinc-800/50 flex items-center px-4 md:px-6 gap-2 shrink-0 overflow-x-auto">
                    {categories.map((cat) => (
                        <Button
                            key={cat.id}
                            variant={activeCategory === cat.id ? "default" : "ghost"}
                            onClick={() => setActiveCategory(cat.id)}
                            className="rounded-full h-8"
                        >
                            {cat.name}
                        </Button>
                    ))}
                </div>

                {/* Product Grid - Fixed Height with Scroll */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                            <Loader2 className="animate-spin h-8 w-8 mb-2" />
                            <p>Loading products...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-6">
                            {filteredProducts.map((product) => (
                                <Card
                                    key={product.id}
                                    className="cursor-pointer hover:border-primary transition-all active:scale-95 overflow-hidden group border-0 shadow-sm"
                                    onClick={() => addToCart(product)}
                                >
                                    <div className="aspect-[4/3] relative bg-gray-200 overflow-hidden">
                                        <img
                                            src={getImageUrl(product)}
                                            alt={product.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    </div>
                                    <CardContent className="p-4">
                                        <h3 className="font-semibold truncate">{product.name}</h3>
                                        <p className="text-primary font-bold">
                                            RM {product.price.toFixed(2)}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>


                {/* Mobile Floating Cart Button (Shows when cart has items) */}
                <div className="lg:hidden fixed bottom-6 right-6 z-50">
                    {cart.length > 0 && (
                        <Button
                            size="lg"
                            className="h-14 w-14 rounded-full shadow-2xl shadow-primary/30 relative"
                            onClick={initiateCheckout}
                        >
                            <ShoppingCart className="h-6 w-6" />
                            <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 bg-red-500 text-white border-2 border-white">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </Badge>
                        </Button>
                    )}
                </div>
            </div>

            {/* Right Sidebar - Cart (Hidden on mobile, visible lg+) */}
            <div className="hidden lg:flex w-96 bg-white dark:bg-zinc-800 border-l flex-col h-full shadow-xl z-20 shrink-0">
                <div className="h-16 flex items-center px-6 border-b shrink-0 bg-white dark:bg-zinc-800">
                    <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
                    <h2 className="font-semibold text-lg">Current Order</h2>
                    <Badge className="ml-auto bg-primary text-white">
                        {cart.reduce((s, i) => s + i.quantity, 0)}
                    </Badge>
                </div>

                <ScrollArea className="flex-1 p-4">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-4 pt-20">
                            <ShoppingCart className="h-16 w-16 mb-4" />
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {cart.map((item) => (
                                <div
                                    key={item.product.id}
                                    className="flex items-center gap-3 bg-gray-50 dark:bg-zinc-700/50 p-3 rounded-lg"
                                >
                                    <img
                                        src={getImageUrl(item.product)}
                                        alt=""
                                        className="w-12 h-12 rounded-md object-cover bg-gray-200"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium text-sm truncate">
                                            {item.product.name}
                                        </h4>
                                        <p className="text-primary text-sm font-bold">
                                            RM {(item.product.price * item.quantity).toFixed(2)}
                                        </p>
                                    </div>

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 rounded-full hover:bg-gray-200"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateQuantity(item.product.id, -1);
                                                }}
                                            >
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 rounded-full hover:bg-gray-200"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    updateQuantity(item.product.id, 1);
                                                }}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeFromCart(item.product.id);
                                        }}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>

                <div className="p-6 bg-gray-50 dark:bg-zinc-900 border-t space-y-4 shrink-0">
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>RM {subtotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Tax ({loyaltySettings?.tax_percentage || 0}%)</span>
                            <span>RM {tax.toFixed(2)}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>RM {total.toFixed(2)}</span>
                        </div>
                    </div>
                    <Button
                        className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/20"
                        disabled={cart.length === 0 || processing}
                        onClick={initiateCheckout}
                    >
                        {processing ? <Loader2 className="animate-spin mr-2" /> : null}
                        Charge RM {total.toFixed(2)}
                    </Button>
                </div>
            </div>

            {/* Customer & Payment Logic Dialog */}
            <Dialog open={isCustomerDialogOpen} onOpenChange={(open) => {
                // Prevent closing if processing or in success state (force user to click 'New Order')
                if (!open && (processing || checkoutStep === 'success')) return;
                setIsCustomerDialogOpen(open);
                if (!open) setCheckoutStep('customer');
            }}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden flex flex-col gap-0 max-h-[95vh]">
                    <DialogHeader className="px-6 py-4 border-b dark:border-zinc-800">
                        <DialogTitle className="text-2xl font-black flex items-center gap-2">
                            {checkoutStep === 'customer' && <><Users className="h-6 w-6 text-primary" /> Customer Details</>}
                            {checkoutStep === 'payment' && <><ArrowRight className="h-6 w-6 text-primary" /> Select Payment</>}
                            {checkoutStep === 'cash_tender' && <><ShoppingCart className="h-6 w-6 text-primary" /> Cash Payment</>}
                            {checkoutStep === 'success' && <><CheckCircle2 className="h-6 w-6 text-green-500" /> Order Completed!</>}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto px-6 py-4">

                        {/* STEP 1: CUSTOMER */}
                        {checkoutStep === 'customer' && (
                            <div className="space-y-6 py-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* Table Reference Section */}
                                <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 border-zinc-100 dark:border-zinc-800 space-y-3 shadow-sm">
                                    <Label className="flex items-center gap-2 text-xs font-black text-zinc-500 uppercase tracking-widest">
                                        <MapPin className="h-4 w-4 text-primary/60" /> Table / Reference
                                    </Label>
                                    <Input
                                        placeholder="e.g. Meja 5, Takeaway Abang"
                                        className="h-12 text-lg font-bold border-2 focus-visible:ring-primary transition-all bg-white dark:bg-zinc-800"
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                    />
                                </div>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t-2 border-zinc-100 dark:border-zinc-800" />
                                    </div>
                                    <div className="relative flex justify-center text-[10px] uppercase tracking-tighter">
                                        <span className="bg-white dark:bg-zinc-950 px-3 text-zinc-400 font-black italic">Loyalty Program</span>
                                    </div>
                                </div>

                                {/* Loyalty Section */}
                                <div className="p-5 rounded-2xl bg-primary/5 border-2 border-primary/20 space-y-4 shadow-sm">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
                                            <Phone className="h-4 w-4" /> Phone Number
                                        </Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="e.g. 0123456789"
                                                className="h-12 pl-4 border-2 focus-visible:ring-primary bg-white dark:bg-zinc-800 font-bold"
                                                value={phoneInput}
                                                onChange={(e) => setPhoneInput(e.target.value)}
                                                autoFocus
                                            />
                                            <Button
                                                onClick={checkCustomer}
                                                disabled={!phoneInput || checkingCustomer}
                                                className="h-12 px-6 shadow-md active:scale-95 transition-all font-black text-xs uppercase"
                                            >
                                                {checkingCustomer ? <Loader2 className="animate-spin h-4 w-4" /> : "Verify"}
                                            </Button>
                                        </div>
                                    </div>

                                    {customer && (
                                        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border-2 border-green-500/30 shadow-md animate-in zoom-in-95 duration-200">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 border-2 border-green-200 dark:border-green-800">
                                                        <Star className="h-6 w-6 fill-current" />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-xl text-zinc-900 dark:text-white leading-tight">{customer.name}</p>
                                                        <p className="text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-1">
                                                            <CheckCircle2 className="h-3 w-3" /> Premium Member
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant="secondary" className="h-8 px-3 bg-green-50 text-green-700 border-2 border-green-100 font-black text-sm rounded-lg">
                                                        {customer.loyalty_points || 0} PTS
                                                    </Badge>
                                                </div>
                                            </div>

                                            {loyaltySettings && (customer.loyalty_points || 0) > 0 && (
                                                <div className="pt-4 border-t-2 border-zinc-50 dark:border-zinc-800 space-y-3">
                                                    <Label className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                                                        <Gift className="h-3 w-3 text-primary/60" /> Rewards Redemption
                                                    </Label>
                                                    <div className="flex items-center gap-3">
                                                        <div className="relative flex-1">
                                                            <Input
                                                                type="number"
                                                                placeholder="Amount of points"
                                                                className="h-10 text-sm font-black border-2 focus-visible:ring-primary pr-12"
                                                                value={pointsToRedeem || ""}
                                                                onChange={(e) => handleRedeemChange(parseInt(e.target.value) || 0)}
                                                                max={customer.loyalty_points}
                                                            />
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-zinc-400">PTS</div>
                                                        </div>
                                                        <div className="h-10 px-4 flex items-center justify-center bg-green-600 text-white rounded-lg font-black text-sm shadow-lg shadow-green-600/20">
                                                            - RM {pointsDiscount.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {customerNotFound && (
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-5 rounded-xl border-2 border-amber-200 dark:border-amber-800/50 space-y-3 animate-in slide-in-from-top-2 duration-200">
                                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-black text-xs uppercase tracking-widest">
                                                <UserPlus className="h-4 w-4" /> Guest Enrollment
                                            </div>
                                            <Input
                                                placeholder="Customer Full Name"
                                                className="h-12 border-2 border-amber-200 dark:border-amber-800 focus-visible:ring-amber-500 bg-white dark:bg-zinc-800 font-bold"
                                                value={nameInput}
                                                onChange={(e) => setNameInput(e.target.value)}
                                            />
                                            <p className="text-[10px] text-amber-700 dark:text-amber-500 font-bold leading-tight flex items-center gap-2 px-1">
                                                <Star className="h-3 w-3 animate-pulse text-amber-500" />
                                                Register now to start earning points today!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PAYMENT METHOD */}
                        {checkoutStep === 'payment' && (
                            <div className="py-6 grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <Button
                                    variant="outline"
                                    className="h-32 flex flex-col items-center justify-center gap-4 border-2 border-zinc-100 dark:border-zinc-800 hover:bg-green-50 hover:border-green-500 hover:text-green-700 active:scale-95 transition-all shadow-sm rounded-2xl group"
                                    onClick={() => handlePaymentSelect('cash')}
                                >
                                    <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full text-3xl group-hover:scale-110 transition-transform">💵</div>
                                    <span className="font-black uppercase tracking-widest text-xs">Cash Payment</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-32 flex flex-col items-center justify-center gap-4 border-2 border-zinc-100 dark:border-zinc-800 hover:bg-pink-50 hover:border-pink-500 hover:text-pink-700 active:scale-95 transition-all shadow-sm rounded-2xl group"
                                    onClick={() => handlePaymentSelect('duitnow_qr')}
                                >
                                    <div className="p-4 bg-pink-100 dark:bg-pink-900/30 rounded-full text-3xl group-hover:scale-110 transition-transform">📷</div>
                                    <span className="font-black uppercase tracking-widest text-xs">DuitNow QR</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-32 flex flex-col items-center justify-center gap-4 border-2 border-zinc-100 dark:border-zinc-800 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700 active:scale-95 transition-all shadow-sm rounded-2xl group"
                                    onClick={() => handlePaymentSelect('card')}
                                >
                                    <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full text-3xl group-hover:scale-110 transition-transform">💳</div>
                                    <span className="font-black uppercase tracking-widest text-xs">Credit/Debit</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-32 flex flex-col items-center justify-center gap-4 border-2 border-zinc-100 dark:border-zinc-800 hover:bg-purple-50 hover:border-purple-500 hover:text-purple-700 active:scale-95 transition-all shadow-sm rounded-2xl group"
                                    onClick={() => handlePaymentSelect('ewallet')}
                                >
                                    <div className="p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full text-3xl group-hover:scale-110 transition-transform">📱</div>
                                    <span className="font-black uppercase tracking-widest text-xs">E-Wallet</span>
                                </Button>
                            </div>
                        )}

                        {/* STEP 3: CASH TENDER */}
                        {checkoutStep === 'cash_tender' && (
                            <div className="py-6 space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="text-center p-8 bg-zinc-900 dark:bg-black rounded-3xl border-2 border-zinc-800 shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Total Payable</p>
                                    <p className="text-5xl font-black text-white tracking-tighter">RM {finalTotal.toFixed(2)}</p>
                                    {pointsDiscount > 0 && (
                                        <div className="mt-4 inline-flex items-center gap-2 bg-green-500/10 text-green-400 px-4 py-1.5 rounded-full border border-green-500/20 text-xs font-bold">
                                            <Gift className="h-3 w-3" /> Discount RM {pointsDiscount.toFixed(2)}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <Label className="font-black text-[10px] uppercase tracking-widest text-zinc-400">
                                            Cash Received
                                        </Label>
                                        <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded uppercase">Enter Amount</span>
                                    </div>
                                    <Input
                                        type="number"
                                        className="h-16 text-3xl text-center font-black border-2 focus-visible:ring-primary shadow-sm rounded-2xl"
                                        placeholder="0.00"
                                        value={amountTendered}
                                        onChange={(e) => setAmountTendered(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {[finalTotal, 50, 100].map((amt) => (
                                        <Button
                                            key={amt}
                                            variant="outline"
                                            className="h-14 font-black border-2 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all rounded-xl shadow-sm"
                                            onClick={() => setAmountTendered(amt.toFixed(2))}
                                        >
                                            {typeof amt === 'number' && amt === finalTotal ? "Exact" : `RM ${amt}`}
                                        </Button>
                                    ))}
                                </div>

                                <div className={`p-8 rounded-3xl text-center border-2 shadow-xl transition-all duration-500 ${changeVal >= 0 ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400" : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400"} shadow-lg`}>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 opacity-60">Balance Change</p>
                                    <p className="text-4xl font-black tracking-tighter">RM {changeVal >= 0 ? changeVal.toFixed(2) : "0.00"}</p>
                                    {changeVal < 0 && (
                                        <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider animate-pulse">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                            Credit Required
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* STEP 4: SUCCESS */}
                        {checkoutStep === 'success' && (
                            <div className="py-16 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse" />
                                    <div className="relative w-28 h-28 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center text-green-500 border-4 border-green-100 dark:border-green-900 shadow-2xl">
                                        <CheckCircle2 className="h-14 w-14" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tighter">Payment Confirmed</h3>
                                    <p className="text-zinc-500 font-bold uppercase text-xs tracking-widest opacity-60">ID: #{lastOrder?.id}</p>
                                </div>

                                {lastOrder?.earnedPoints > 0 && (
                                    <div className="h-10 px-6 bg-yellow-400 text-yellow-950 font-black text-xs rounded-full flex items-center gap-2 shadow-lg shadow-yellow-400/20 uppercase tracking-widest border-2 border-yellow-300">
                                        <Star className="h-4 w-4 fill-current" /> +{lastOrder.earnedPoints} Points Rewarded
                                    </div>
                                )}

                                <Button
                                    variant="outline"
                                    className="w-full max-w-sm h-16 font-black text-lg gap-3 border-2 border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 active:scale-95 transition-all shadow-md rounded-2xl group"
                                    onClick={handlePrint}
                                >
                                    <Clock className="h-6 w-6 text-zinc-400 group-hover:text-primary transition-colors" /> 🖨️ Print Receipt
                                </Button>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-6 py-5 bg-zinc-50/50 dark:bg-zinc-900/50 border-t dark:border-zinc-800 flex-col sm:flex-row gap-4">
                        {checkoutStep === 'customer' && (
                            <>
                                <div className="flex-1 flex gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={parkOrder}
                                        disabled={processing}
                                        className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest gap-2 bg-white dark:bg-zinc-800 border-2 active:scale-95 transition-all text-zinc-600 dark:text-zinc-400 rounded-xl"
                                    >
                                        {processing ? <Loader2 className="animate-spin h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        Park Order
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        onClick={() => proceedToPayment()}
                                        className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all text-zinc-400 rounded-xl"
                                    >
                                        Skip / Guest
                                    </Button>
                                </div>
                                <Button
                                    onClick={() => proceedToPayment()}
                                    disabled={customerNotFound && !nameInput}
                                    className="w-full sm:w-auto px-10 h-14 font-black text-lg gap-3 shadow-xl shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all rounded-xl"
                                >
                                    {customerNotFound ? "Enroll & Pay" : "Proceed"}
                                    <ArrowRight className="h-6 w-6" />
                                </Button>
                            </>
                        )}

                        {checkoutStep === 'payment' && (
                            <Button
                                variant="outline"
                                onClick={() => setCheckoutStep('customer')}
                                className="w-full h-14 font-black uppercase text-[10px] tracking-widest border-2 rounded-xl"
                            >
                                <ArrowRight className="h-4 w-4 rotate-180" /> Back to Details
                            </Button>
                        )}

                        {checkoutStep === 'cash_tender' && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setCheckoutStep('payment')}
                                    className="flex-1 h-14 font-black uppercase text-[10px] tracking-widest border-2 rounded-xl"
                                >
                                    <ArrowRight className="h-4 w-4 rotate-180" /> Change Method
                                </Button>
                                <Button
                                    onClick={() => finalizeOrder('cash', Number(amountTendered) || 0)}
                                    disabled={processing || changeVal < 0}
                                    className="flex-1 h-14 font-black text-lg gap-3 shadow-xl active:scale-[0.98] transition-all rounded-xl"
                                >
                                    {processing ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save className="h-5 w-5" /> Confirm & Charge</>}
                                </Button>
                            </>
                        )}

                        {checkoutStep === 'success' && (
                            <Button
                                className="w-full h-14 font-black text-xl uppercase tracking-widest shadow-2xl shadow-primary/30 active:scale-95 transition-all rounded-xl"
                                onClick={() => {
                                    setCart([]);
                                    setCustomer(null);
                                    setPhoneInput("");
                                    setNameInput("");
                                    setPointsToRedeem(0);
                                    setPointsDiscount(0);
                                    setLastOrder(null);
                                    setCheckoutStep('customer');
                                    setIsCustomerDialogOpen(false);
                                }}
                            >
                                <Plus className="h-6 w-6" /> New Transaction
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Recall Pending Orders Dialog */}
            <Dialog open={isRecallOpen} onOpenChange={setIsRecallOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader className="flex flex-row items-center justify-between">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            Pending Orders (Dine-in)
                        </DialogTitle>
                        <Button variant="ghost" size="sm" onClick={fetchPendingOrders} title="Refresh List">
                            <Clock className="h-4 w-4 mr-1" /> Refresh
                        </Button>
                    </DialogHeader>
                    <div className="py-4">
                        {pendingOrders.length === 0 ? (
                            <div className="text-center py-12 flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400">
                                    <ShoppingCart className="h-8 w-8" />
                                </div>
                                <p className="text-muted-foreground italic">Tiada order pending boss.</p>
                            </div>
                        ) : (
                            <div className="space-y-3 max-h-[500px] overflow-auto pr-2 custom-scrollbar">
                                {pendingOrders.map((order) => (
                                    <Button
                                        key={order.id}
                                        variant="outline"
                                        className="w-full justify-between h-auto py-5 px-5 hover:border-primary hover:bg-primary/5 active:scale-[0.98] transition-all border-2 group"
                                        onClick={() => recallOrder(order)}
                                    >
                                        <div className="flex flex-col items-start gap-1">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">MEJA</Badge>
                                                <span className="font-black text-xl text-zinc-800 dark:text-zinc-200">{order.table_number || "N/A"}</span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest">{order.id}</span>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <div className="font-black text-xl text-primary">RM {order.total_amount.toFixed(2)}</div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="icon"
                                                    variant="destructive"
                                                    className="h-6 w-6 rounded-full"
                                                    onClick={(e) => deleteOrder(order.id, e)}
                                                    title="Padam Order"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                                <div className="text-[10px] font-bold uppercase tracking-tighter text-zinc-400 group-hover:text-primary transition-colors">Recall 🚀</div>
                                            </div>
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Hidden Receipt Component for Printing */}
            <div id="receipt-print" className="hidden print:block fixed inset-0 bg-white z-[9999] p-4 font-mono text-sm">
                {lastOrder && (
                    <div className="max-w-[80mm] mx-auto">
                        <div className="text-center mb-4">
                            <h2 className="text-lg font-bold uppercase">{lastOrder.branchName}</h2>
                            <p className="text-xs">{lastOrder.branchAddress}</p>
                            <div className="border-b border-dashed my-2"></div>
                            <p>RECEIPT</p>
                            <p>#{lastOrder.id}</p>
                            <p className="text-[10px]">{new Date(lastOrder.created).toLocaleString()}</p>
                        </div>

                        <div className="space-y-1">
                            {lastOrder.items.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between">
                                    <span>{item.quantity}x {item.product.name}</span>
                                    <span>{(item.quantity * item.product.price).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="border-b border-dashed my-2"></div>

                        <div className="space-y-1">
                            <div className="flex justify-between">
                                <span>Subtotal</span>
                                <span>{lastOrder.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Tax ({lastOrder.taxRate}%)</span>
                                <span>{lastOrder.tax.toFixed(2)}</span>
                            </div>
                            {lastOrder.discount_amount > 0 && (
                                <div className="flex justify-between text-xs">
                                    <span>Discount (Redeemed)</span>
                                    <span>-{lastOrder.discount_amount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold text-base pt-1">
                                <span>TOTAL</span>
                                <span>RM {lastOrder.total_amount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="border-b border-dashed my-2"></div>

                        <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                                <span>Payment: {lastOrder.payment_method.toUpperCase()}</span>
                                <span>{lastOrder.tendered_amount > 0 ? lastOrder.tendered_amount.toFixed(2) : lastOrder.total_amount.toFixed(2)}</span>
                            </div>
                            {lastOrder.change_amount > 0 && (
                                <div className="flex justify-between">
                                    <span>Change</span>
                                    <span>{lastOrder.change_amount.toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="text-center mt-6 pt-4 border-t border-dashed">
                            <p>Thank You!</p>
                            <p className="text-[10px]">Customer: {lastOrder.customerName}</p>
                            <p className="mt-2 text-[8px] opacity-50">Powered by POS Ninja AI</p>
                        </div>
                    </div>
                )}
            </div>

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
