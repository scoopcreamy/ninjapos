"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Receipt, Upload, Trash2, CalendarIcon, Sparkles, Loader2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

interface Expense {
    id: string;
    amount: number;
    description: string;
    category: string;
    receipt_image: string;
    date: string;
    created: string;
}

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        amount: "",
        description: "",
        category: "",
        receipt_image: null as File | null,
        date: new Date().toISOString().split("T")[0],
    });

    const fetchExpenses = async () => {
        try {
            const res = await pb.collection("expenses").getList<Expense>(1, 50, {
                requestKey: null
            });
            setExpenses(res.items);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.category) return;

        setLoading(true);
        try {
            const data = new FormData();
            data.append("amount", formData.amount);
            data.append("description", formData.description);
            data.append("category", formData.category);
            data.append("date", new Date(formData.date).toISOString());
            if (formData.receipt_image) {
                data.append("receipt_image", formData.receipt_image);
            }

            await pb.collection("expenses").create(data);
            setFormData({
                amount: "",
                description: "",
                category: "",
                receipt_image: null,
                date: new Date().toISOString().split("T")[0],
            });
            fetchExpenses(); // Refresh list
        } catch (e) {
            console.error(e);
            alert("Failed to save expense.");
        } finally {
            setLoading(false);
        }
    };

    const deleteExpense = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await pb.collection("expenses").delete(id);
        fetchExpenses();
    }

    const getReceiptUrl = (expense: Expense) => {
        if (expense.receipt_image) return pb.files.getUrl(expense, expense.receipt_image);
        return null;
    }

    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null); // For review modal
    const [isReviewOpen, setIsReviewOpen] = useState(false);

    // View Details Modal State
    const [viewExpense, setViewExpense] = useState<Expense | null>(null);
    const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);

    const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/analyze-receipt", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) throw new Error("Failed to analyze receipt");

            const data = await res.json();

            // Fallback logic
            let finalAmount = data.amount;
            if (!finalAmount || parseFloat(finalAmount) === 0) {
                if (data.items && Array.isArray(data.items)) {
                    finalAmount = data.items.reduce((sum: number, item: any) => sum + (item.price || 0), 0);
                }
            }

            let finalDate = data.date;
            if (!finalDate || finalDate === "null") {
                finalDate = new Date().toISOString().split("T")[0];
            }

            let finalCategory = data.category || "General";

            // Open review modal with extracted data
            setScanResult({
                ...data,
                amount: typeof finalAmount === 'number' ? finalAmount.toFixed(2) : finalAmount,
                date: finalDate,
                category: finalCategory,
                file: file
            });
            setIsReviewOpen(true);

        } catch (e) {
            console.error(e);
            alert("Failed to scan receipt. Please try again.");
        } finally {
            setIsScanning(false);
            // Reset input
            e.target.value = "";
        }
    };

    const confirmScan = async () => {
        if (!scanResult) return;

        setLoading(true);
        try {
            // Format items into description if available
            let finalDescription = scanResult.description;
            if (scanResult.items && scanResult.items.length > 0) {
                const itemDetails = scanResult.items.map((item: any) =>
                    `- ${item.name} (x${item.qty}) - RM${item.price.toFixed(2)} [${item.category}]`
                ).join("\n");
                finalDescription = `${scanResult.description}\n\nItems:\n${itemDetails}`;
            }

            const data = new FormData();
            data.append("amount", scanResult.amount);
            data.append("description", finalDescription);
            data.append("category", scanResult.category);
            data.append("date", new Date(scanResult.date).toISOString());
            if (scanResult.file) {
                data.append("receipt_image", scanResult.file);
            }

            await pb.collection("expenses").create(data);

            setIsReviewOpen(false);
            setScanResult(null);
            fetchExpenses();
            alert("Expense saved successfully!");
        } catch (e: any) {
            console.error(e);
            alert("Failed to save expense: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 space-y-8 h-full overflow-auto">
            <header className="flex justify-between items-center">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <Receipt className="h-8 w-8 text-primary" />
                    Expenses & Claims
                </h1>
                <div className="flex gap-2">
                    <input
                        type="file"
                        id="scan-upload"
                        className="hidden"
                        accept="image/*"
                        onChange={handleScan}
                        disabled={isScanning}
                    />
                    <Button
                        onClick={() => document.getElementById("scan-upload")?.click()}
                        disabled={isScanning}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2"
                    >
                        {isScanning ? (
                            <>Analyzing... <span className="animate-spin">⏳</span></>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" /> Smart Scan Receipt
                            </>
                        )}
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Entry Form */}
                <Card className="lg:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Add New Expense</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Amount (RM)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Category</label>
                                <Input
                                    placeholder="e.g. Ingredients, Utilities"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Description</label>
                                <Input
                                    placeholder="Supplier name, details..."
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Date</label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium flex gap-2 items-center">
                                    <Upload className="w-4 h-4" /> Receipt Image
                                </label>
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="cursor-pointer"
                                    onChange={(e) => setFormData({ ...formData, receipt_image: e.target.files?.[0] || null })}
                                />
                            </div>
                            <Button type="submit" className="w-full font-bold" disabled={loading}>
                                {loading ? "Saving..." : "Save Expense"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Expense List */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Category</TableHead>

                                    <TableHead>Receipt</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No expenses recorded yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    expenses.map((expense) => (
                                        <TableRow key={expense.id}>
                                            <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{expense.category}</Badge>
                                            </TableCell>

                                            <TableCell>
                                                {expense.receipt_image ? (
                                                    <a href={getReceiptUrl(expense)!} target="_blank" className="text-primary hover:underline flex items-center gap-1 text-xs">
                                                        <Receipt className="w-3 h-3" /> View
                                                    </a>
                                                ) : <span className="text-muted-foreground text-xs">No img</span>}
                                            </TableCell>
                                            <TableCell className="text-right font-bold">
                                                RM {expense.amount.toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1 justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => {
                                                            setViewExpense(expense);
                                                            setIsViewDetailsOpen(true);
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4 text-blue-500" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteExpense(expense.id)} className="text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Review Dialog */}
            <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Review Scanned Receipt</DialogTitle>
                        <CardDescription>Please verify the extracted information.</CardDescription>
                    </DialogHeader>

                    {scanResult && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 flex-1 overflow-auto">
                            {/* Image Preview */}
                            <div className="border rounded-lg overflow-hidden bg-black/5 relative h-full min-h-[400px]">
                                <img
                                    src={URL.createObjectURL(scanResult.file)}
                                    alt="Receipt"
                                    className="w-full h-full object-contain absolute inset-0"
                                />
                            </div>

                            {/* Form & Items */}
                            <div className="space-y-6 overflow-auto pr-2">
                                {/* Global Info */}
                                <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Receipt Summary</h3>
                                    <div>
                                        <label className="text-xs font-medium uppercase text-muted-foreground">Total Amount (RM)</label>
                                        <Input
                                            value={scanResult.amount}
                                            onChange={(e) => setScanResult({ ...scanResult, amount: e.target.value })}
                                            className="font-bold text-2xl text-primary"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Date</label>
                                            <Input
                                                type="date"
                                                value={scanResult.date}
                                                onChange={(e) => setScanResult({ ...scanResult, date: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Main Category</label>
                                            <Input
                                                value={scanResult.category}
                                                onChange={(e) => setScanResult({ ...scanResult, category: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium uppercase text-muted-foreground">Store</label>
                                        <Input
                                            value={scanResult.description}
                                            onChange={(e) => setScanResult({ ...scanResult, description: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Line Items */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Detected Items</h3>
                                        <Badge variant="secondary">{scanResult.items?.length || 0} items</Badge>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-muted/50">
                                                    <TableHead className="w-[50%]">Item</TableHead>
                                                    <TableHead className="text-center">Qty</TableHead>
                                                    <TableHead className="text-right">Price</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {scanResult.items && scanResult.items.length > 0 ? (
                                                    scanResult.items.map((item: any, idx: number) => (
                                                        <TableRow key={idx} className="text-xs">
                                                            <TableCell>
                                                                <div className="font-medium">{item.name}</div>
                                                                <div className="text-muted-foreground opacity-70 flex gap-2">
                                                                    <span>{item.details}</span>
                                                                    <Badge variant="outline" className="text-[10px] h-4 px-1">{item.category}</Badge>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-center">{item.qty}</TableCell>
                                                            <TableCell className="text-right font-bold">RM {item.price?.toFixed(2)}</TableCell>
                                                        </TableRow>
                                                    ))
                                                ) : (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                                            No individual items detected.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
                        <Button onClick={confirmScan} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white scan-save-btn">
                            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Approve & Save"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Expense Details</DialogTitle>
                    </DialogHeader>

                    {viewExpense && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 flex-1 overflow-auto">
                            {/* Receipt Image */}
                            <div className="border rounded-lg overflow-hidden bg-black/5 relative h-full min-h-[400px] flex items-center justify-center">
                                {viewExpense.receipt_image ? (
                                    <img
                                        src={getReceiptUrl(viewExpense)!}
                                        alt="Receipt"
                                        className="w-full h-full object-contain absolute inset-0"
                                    />
                                ) : (
                                    <div className="text-muted-foreground flex flex-col items-center gap-2">
                                        <Receipt className="w-12 h-12 opacity-20" />
                                        <span>No Receipt Image</span>
                                    </div>
                                )}
                            </div>

                            {/* Details */}
                            <div className="space-y-6 overflow-auto pr-2">
                                <div className="space-y-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
                                    <div>
                                        <label className="text-xs font-medium uppercase text-muted-foreground">Amount</label>
                                        <div className="text-3xl font-bold text-primary">RM {viewExpense.amount.toFixed(2)}</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Date</label>
                                            <div className="font-medium">{new Date(viewExpense.date).toLocaleDateString()}</div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium uppercase text-muted-foreground">Category</label>
                                            <div><Badge variant="outline">{viewExpense.category}</Badge></div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium uppercase text-muted-foreground mb-2 block">Store / Description</label>

                                    {(() => {
                                        const desc = viewExpense.description || "";

                                        // Robust splitting looking for "Items:" (case insensitive)
                                        // Splitting by regex to catch "Items:" even if newlines are missing or messed up
                                        const parts = desc.split(/Items:\s*/i);

                                        const storeName = parts[0].trim();
                                        const itemsStr = parts.length > 1 ? parts.slice(1).join("Items: ") : "";

                                        // Parse items if available
                                        // Parse items using matchAll (handles both multiline and flattened text)
                                        const items: any[] = [];
                                        if (itemsStr) {
                                            const itemsRegex = /- (.*?) \(x(\d+)\) - RM([\d\.]+) \[(.*?)\]/g;
                                            const matches = itemsStr.matchAll(itemsRegex);
                                            for (const match of matches) {
                                                items.push({
                                                    name: match[1].trim(),
                                                    qty: match[2],
                                                    price: match[3],
                                                    category: match[4]
                                                });
                                            }
                                        }

                                        return (
                                            <div className="space-y-4">
                                                <div className="p-3 border rounded-lg bg-card text-sm font-medium">
                                                    {storeName || "No description provided."}
                                                </div>

                                                {items.length > 0 && (
                                                    <div>
                                                        <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Items List</h4>
                                                        <div className="border rounded-lg overflow-hidden">
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="bg-muted/50">
                                                                        <TableHead className="w-[50%]">Item</TableHead>
                                                                        <TableHead className="text-center">Qty</TableHead>
                                                                        <TableHead className="text-right">Price</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {items.map((item: any, idx: number) => (
                                                                        <TableRow key={idx} className="text-xs">
                                                                            <TableCell>
                                                                                <div className="font-medium">{item.name}</div>
                                                                                <Badge variant="outline" className="text-[10px] h-4 px-1 mt-1">{item.category}</Badge>
                                                                            </TableCell>
                                                                            <TableCell className="text-center">{item.qty}</TableCell>
                                                                            <TableCell className="text-right font-bold">RM {item.price}</TableCell>
                                                                        </TableRow>
                                                                    ))}
                                                                </TableBody>
                                                            </Table>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Fallback: If we have items text but failed to parse into table, show text */}
                                                {items.length === 0 && itemsStr && (
                                                    <div className="p-4 border rounded-lg bg-card whitespace-pre-wrap text-sm font-mono mt-2">
                                                        {itemsStr}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}


                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button onClick={() => setIsViewDetailsOpen(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
