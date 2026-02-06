"use client";

import { useState, useEffect } from "react";
import pb from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Package, Trash2, Edit2, Search, Loader2, Image as ImageIcon, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Product {
    id: string;
    name: string;
    price: number;
    category: string;
    is_available: boolean;
    image: string;
    collectionId: string;
}

interface Category {
    id: string;
    name: string;
    slug: string;
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Category Management State
    const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
    const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
    const [editingCategoryName, setEditingCategoryName] = useState("");
    const [newCategoryName, setNewCategoryName] = useState("");
    const [creatingCategory, setCreatingCategory] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        price: "",
        category: "",
        is_available: true,
        image: null as File | null,
    });

    const fetchCategories = async () => {
        try {
            const res = await pb.collection("categories").getFullList<Category>({
                sort: 'name',
                requestKey: null
            });
            setCategories(res);
        } catch (e) {
            console.error("Error fetching categories:", e);
        }
    };

    const fetchProducts = async () => {
        try {
            const res = await pb.collection("products").getFullList<Product>({
                sort: 'name',
                filter: 'deleted = false',
                requestKey: null
            });
            setProducts(res);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const openAddDialog = () => {
        setEditingProduct(null);
        setFormData({
            name: "",
            price: "",
            category: "",
            is_available: true,
            image: null,
        });
        setIsDialogOpen(true);
    };

    const openEditDialog = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            name: product.name,
            price: product.price.toString(),
            category: product.category,
            is_available: product.is_available,
            image: null,
        });
        setIsDialogOpen(true);
    };

    // Category Management Functions
    const handleDeleteCategory = async (id: string) => {
        if (!confirm("Delete this category? Products in this category will not be deleted but will have no category.")) return;
        try {
            await pb.collection("categories").delete(id);
            fetchCategories();
        } catch (e) {
            console.error(e);
            alert("Failed to delete category");
        }
    };

    const startEditingCategory = (cat: Category) => {
        setEditingCategoryId(cat.id);
        setEditingCategoryName(cat.name);
    };

    const saveEditingCategory = async () => {
        if (!editingCategoryId) return;
        try {
            await pb.collection("categories").update(editingCategoryId, {
                name: editingCategoryName,
                slug: editingCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            });
            setEditingCategoryId(null);
            fetchCategories();
        } catch (e) {
            console.error(e);
            alert("Failed to update category");
        }
    };

    const handleCategorySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreatingCategory(true);
        try {
            await pb.collection("categories").create({
                name: newCategoryName,
                slug: newCategoryName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
            });
            setNewCategoryName(""); // Clear input
            alert("Category created!");
            fetchCategories();
        } catch (e) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            alert(`Failed to create category: ${msg}`);
        } finally {
            setCreatingCategory(false);
        }
    };

    // Product Management Functions
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("price", formData.price);
            data.append("category", formData.category.toLowerCase());
            data.append("is_available", String(formData.is_available));
            if (formData.image) {
                data.append("image", formData.image);
            }

            if (editingProduct) {
                await pb.collection("products").update(editingProduct.id, data);
            } else {
                await pb.collection("products").create(data);
            }

            setIsDialogOpen(false);
            fetchProducts();
        } catch (e: any) {
            console.error("Full error object:", e);
            console.error("Error data:", e.data);
            const msg = e.message || "Unknown error";
            alert(`Failed to save product: ${msg}`);
        } finally {
            setSaving(false);
        }
    };

    const toggleAvailability = async (product: Product) => {
        try {
            const updated = await pb.collection("products").update(product.id, {
                is_available: !product.is_available
            });
            setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_available: updated.is_available } : p));
        } catch (e) {
            console.error(e);
        }
    };

    const deleteProduct = async (id: string) => {
        if (!confirm("Are you sure you want to delete this product?")) return;
        try {
            await pb.collection("products").update(id, { deleted: true });
            fetchProducts();
        } catch (e) {
            console.error(e);
            alert("Failed to delete product.");
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getImageUrl = (product: Product) => {
        if (product.image) {
            return pb.files.getUrl(product, product.image);
        }
        return `https://placehold.co/100?text=${encodeURIComponent(product.name)}`;
    };

    return (
        <div className="p-8 space-y-8 h-full overflow-auto bg-gray-50/50 dark:bg-zinc-950/50">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <Package className="h-8 w-8 text-primary" />
                        Product Management
                    </h1>
                    <p className="text-muted-foreground">Manage your menu items, prices and availability.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => setIsManageCategoriesOpen(true)} variant="outline" className="font-bold flex gap-2">
                        <Package className="w-5 h-5" /> Manage Categories
                    </Button>
                    <Button onClick={openAddDialog} className="font-bold flex gap-2">
                        <Plus className="w-5 h-5" /> Add Product
                    </Button>
                </div>
            </header>

            <Card className="shadow-sm border-0">
                <CardHeader className="pb-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search products or categories..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Badge variant="secondary" className="h-10 px-4">
                            {products.length} Items Total
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="animate-spin h-8 w-8 mb-4 text-primary" />
                            <p>Loading catalog...</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[80px]">Image</TableHead>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Price</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-48 text-muted-foreground">
                                            No products found. Add your first item!
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <img
                                                    src={getImageUrl(product)}
                                                    alt=""
                                                    className="w-12 h-12 rounded-lg object-cover bg-gray-100 dark:bg-zinc-800"
                                                />
                                            </TableCell>
                                            <TableCell className="font-semibold">{product.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">{product.category}</Badge>
                                            </TableCell>
                                            <TableCell className="font-bold text-primary">RM {product.price.toFixed(2)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={product.is_available}
                                                        onCheckedChange={() => toggleAvailability(product)}
                                                    />
                                                    <span className="text-xs font-medium">
                                                        {product.is_available ? "Available" : "Hidden"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)}>
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => deleteProduct(product.id)} className="text-destructive">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Manage Categories Dialog */}
            <Dialog open={isManageCategoriesOpen} onOpenChange={setIsManageCategoriesOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Manage Categories</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        {/* Add New Category Section */}
                        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Add New Category</Label>
                            <form onSubmit={handleCategorySubmit} className="flex gap-2">
                                <Input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="e.g. Desserts"
                                    required
                                />
                                <Button type="submit" disabled={creatingCategory}>
                                    {creatingCategory ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />}
                                </Button>
                            </form>
                        </div>

                        {/* Existing Categories List */}
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold uppercase text-muted-foreground">Existing Categories ({categories.length})</Label>
                            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between p-3 border rounded-md bg-card hover:bg-accent/50 transition-colors">
                                        {editingCategoryId === cat.id ? (
                                            <div className="flex flex-1 items-center gap-2">
                                                <Input
                                                    value={editingCategoryName}
                                                    onChange={(e) => setEditingCategoryName(e.target.value)}
                                                    className="h-8"
                                                />
                                                <Button size="sm" onClick={saveEditingCategory} className="h-8 w-8 p-0">
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" variant="ghost" onClick={() => setEditingCategoryId(null)} className="h-8 w-8 p-0">
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium">{cat.name}</span>
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditingCategory(cat)}>
                                                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteCategory(cat.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                                {categories.length === 0 && (
                                    <p className="text-sm text-center text-muted-foreground py-8">No categories found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Product Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Product Name</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="price">Price (RM)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="category">Category</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.name.toLowerCase()}>
                                                {cat.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="image">Product Image</Label>
                            <div className="flex items-center gap-4">
                                <div className="shrink-0 w-20 h-20 rounded-md border bg-muted flex items-center justify-center overflow-hidden relative">
                                    {formData.image ? (
                                        <img
                                            src={URL.createObjectURL(formData.image)}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : editingProduct?.image ? (
                                        <img
                                            src={getImageUrl(editingProduct)}
                                            alt="Current"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Input
                                        id="image"
                                        type="file"
                                        accept="image/*"
                                        className="cursor-pointer"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            setFormData({ ...formData, image: file });
                                        }}
                                    />
                                    <p className="text-[0.8rem] text-muted-foreground mt-1">
                                        {formData.image ? `Selected: ${formData.image.name}` : "Leave empty to keep current image"}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                            <Switch
                                id="available"
                                checked={formData.is_available}
                                onCheckedChange={(val) => setFormData({ ...formData, is_available: val })}
                            />
                            <Label htmlFor="available">Active & Available for Sale</Label>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="submit" className="w-full font-bold" disabled={saving}>
                                {saving ? <Loader2 className="animate-spin mr-2" /> : null}
                                {editingProduct ? "Update Product" : "Create Product"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
