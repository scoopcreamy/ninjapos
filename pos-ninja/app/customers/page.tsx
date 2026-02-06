"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Users,
    Search,
    Plus,
    Trash2,
    UserPlus,
    Loader2
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Customer {
    id: string;
    name: string;
    phone: string;
    loyalty_points: number;
    created: string;
    last_visit: string;
    total_visits: number;
    joined_date: string;
}

interface PunchCard {
    customer_id: string;
    current_punches: number;
    total_completed: number;
}

interface LoyaltySettings {
    punch_target: number;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [punchCards, setPunchCards] = useState<Record<string, PunchCard>>({});
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form
    const [form, setForm] = useState({ name: "", phone: "", loyalty_points: 0 });

    const fetchCustomers = async () => {
        try {
            const [custRes, punchRes, loyaltyRes] = await Promise.all([
                pb.collection("customers").getFullList<Customer>({ requestKey: null }),
                pb.collection("customer_punch_cards").getFullList<PunchCard>({ requestKey: null }),
                pb.collection("loyalty_settings").getFullList<LoyaltySettings>({ requestKey: null })
            ]);

            setCustomers(custRes);

            const punchMap: Record<string, PunchCard> = {};
            punchRes.forEach(pc => {
                punchMap[pc.customer_id] = pc;
            });
            setPunchCards(punchMap);
            if (loyaltyRes.length > 0) setLoyaltySettings(loyaltyRes[0]);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery)
    );

    const handleCreate = async () => {
        if (!form.name || !form.phone) return;
        setSaving(true);
        try {
            await pb.collection("customers").create({
                ...form,
                joined_date: new Date().toISOString()
            });
            setForm({ name: "", phone: "", loyalty_points: 0 });
            setIsOpen(false);
            fetchCustomers();
        } catch (e) {
            console.error(e);
            alert("Failed to create customer. Phone might be duplicate.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) return;
        try {
            // 1. Delete related punch cards
            try {
                const punchCards = await pb.collection("customer_punch_cards").getFullList({
                    filter: `customer_id="${id}"`,
                    requestKey: null
                });
                for (const pc of punchCards) {
                    await pb.collection("customer_punch_cards").delete(pc.id);
                }
            } catch (err) {
                console.warn("Error deleting punch cards (might be empty/ignored):", err);
            }

            // 2. Unlink related orders (Set customer_id to null to preserve sales history)
            try {
                const orders = await pb.collection("orders").getFullList({
                    filter: `customer_id="${id}"`,
                    requestKey: null
                });
                for (const order of orders) {
                    await pb.collection("orders").update(order.id, { customer_id: null });
                }
            } catch (err) {
                console.warn("Error unlinking orders:", err);
            }

            // 3. Delete the customer
            await pb.collection("customers").delete(id);
            fetchCustomers();
            alert("Customer deleted successfully.");
        } catch (e: any) {
            console.error(e);
            alert("Failed to delete customer. " + (e.message || "Unknown error."));
        }
    };

    return (
        <div className="p-8 space-y-8 h-full overflow-auto bg-gray-50/50 dark:bg-zinc-950/50">
            <header className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Users className="h-8 w-8 text-primary" />
                        Customer Management
                    </h1>
                    <p className="text-muted-foreground">View and manage customer loyalty and profiles.</p>
                </div>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-bold">
                            <UserPlus className="mr-2 h-4 w-4" /> Add Customer
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Register New Customer</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Full Name</Label>
                                <Input
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    placeholder="e.g. Ali Bin Abu"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone Number</Label>
                                <Input
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    placeholder="e.g. 012345678"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Initial Loyalty Points</Label>
                                <Input
                                    type="number"
                                    value={form.loyalty_points}
                                    onChange={e => setForm({ ...form, loyalty_points: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={saving}>
                                {saving ? "Saving..." : "Create Customer"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Customer Database</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search name or phone..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Loyalty Points</TableHead>
                                <TableHead>Punch Card</TableHead>
                                <TableHead>Join Date</TableHead>
                                <TableHead>Last Visit</TableHead>
                                <TableHead>Total Visits</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <Loader2 className="animate-spin h-6 w-6 mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground italic">
                                        No customers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-bold">{customer.name}</TableCell>
                                        <TableCell>{customer.phone}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                {customer.loyalty_points} pts
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5 ">
                                                    {Array.from({ length: loyaltySettings?.punch_target || 10 }).map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className={`w-2.5 h-2.5 rounded-full border ${i < (punchCards[customer.id]?.current_punches || 0)
                                                                ? "bg-primary border-primary shadow-[0_0_5px_rgba(var(--primary),0.5)]"
                                                                : "bg-gray-200 border-gray-300"
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                    Status: {punchCards[customer.id]?.current_punches || 0}/{loyaltySettings?.punch_target || 10}
                                                    {punchCards[customer.id]?.total_completed > 0 && ` (${punchCards[customer.id].total_completed} Rewards Claimed)`}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {customer.joined_date ? new Date(customer.joined_date).toLocaleDateString() : (customer.created ? new Date(customer.created).toLocaleDateString() : "N/A")}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {customer.last_visit ? new Date(customer.last_visit).toLocaleDateString() : "Never"}
                                        </TableCell>
                                        <TableCell className="font-medium text-center">
                                            {customer.total_visits || 0}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive"
                                                onClick={() => handleDelete(customer.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
