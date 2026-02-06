"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Building2,
    Users,
    Plus,
    Trash2,
    Edit2,
    ShieldCheck,
    MapPin,
    Save,
    Loader2,
    Gift
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Branch {
    id: string;
    name: string;
    address: string;
}

interface User {
    id: string;
    username: string;
    email: string;
    role: string;
    branch_id: string;
    expand?: {
        branch_id?: Branch;
    }
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

interface Product {
    id: string;
    name: string;
}

export default function SettingsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get("tab") || "branches";

    const [branches, setBranches] = useState<Branch[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form states
    const [branchForm, setBranchForm] = useState({ name: "", address: "" });
    const [userForm, setUserForm] = useState({ username: "", role: "cashier", branch_id: "" });
    const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);

    const fetchData = async () => {
        setLoading(true);
        // Safe fetch wrapper
        const safeFetch = async <T,>(collection: string, options: any) => {
            try {
                return await pb.collection(collection).getFullList<T>(options);
            } catch (e) {
                console.warn(`Failed to fetch ${collection}`, e);
                return [];
            }
        };

        try {
            // Fetch individually to prevent one failure breaking all
            const branchRes = await safeFetch<Branch>("branches", { requestKey: null });
            const userRes = await safeFetch<User>("users", { expand: 'branch_id', requestKey: null });
            const loyaltyRes = await safeFetch<LoyaltySettings>("loyalty_settings", { requestKey: null });
            const productRes = await safeFetch<Product>("products", {
                sort: "name",
                filter: "deleted = false",
                requestKey: null
            });

            setBranches(branchRes);
            setUsers(userRes);
            setProducts(productRes);

            if (branchRes.length > 0) {
                setUserForm(prev => ({ ...prev, branch_id: branchRes[0].id }));
            }
            if (loyaltyRes.length > 0) {
                setLoyaltySettings(loyaltyRes[0]);
            }
        } catch (e) {
            console.error("Critical error in fetchData", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onTabChange = (val: string) => {
        router.push(`/settings?tab=${val}`);
    };

    const handleAddBranch = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await pb.collection("branches").create(branchForm);
            setBranchForm({ name: "", address: "" });
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Failed to create branch.");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateUser = async (userId: string, data: any) => {
        try {
            await pb.collection("users").update(userId, data);
            fetchData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateLoyalty = async () => {
        if (!loyaltySettings) return;
        setSaving(true);
        try {
            await pb.collection("loyalty_settings").update(loyaltySettings.id, {
                points_ratio: loyaltySettings.points_ratio,
                redemption_ratio: loyaltySettings.redemption_ratio,
                tax_percentage: loyaltySettings.tax_percentage,
                punch_target: loyaltySettings.punch_target,
                punch_min_purchase: loyaltySettings.punch_min_purchase,
                punch_reward_name: loyaltySettings.punch_reward_name
            });
            alert("Loyalty settings saved!");
        } catch (e) {
            console.error(e);
            alert("Failed to save loyalty settings.");
        } finally {
            setSaving(false);
        }
    };

    const deleteBranch = async (id: string) => {
        if (!confirm("Delete this branch? This might affect linked users.")) return;
        await pb.collection("branches").delete(id);
        fetchData();
    };

    if (loading) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="animate-spin h-8 w-8 mb-4 text-primary" />
                <p>Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 h-full overflow-auto bg-gray-50/50 dark:bg-zinc-950/50">
            <header>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                    Settings & Management
                </h1>
                <p className="text-muted-foreground">Configure your branches, staff roles, and system preferences.</p>
            </header>

            <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                <TabsList className="grid w-full max-w-lg grid-cols-4 mb-8">
                    <TabsTrigger value="branches" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Branches
                    </TabsTrigger>
                    <TabsTrigger value="staff" className="flex items-center gap-2">
                        <Users className="w-4 h-4" /> Staff
                    </TabsTrigger>
                    <TabsTrigger value="store" className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" /> Store
                    </TabsTrigger>
                    <TabsTrigger value="loyalty" className="flex items-center gap-2">
                        <Gift className="w-4 h-4" /> Loyalty
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="branches" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Add Branch Form */}
                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle>Add New Branch</CardTitle>
                                <CardDescription>Register a new outlet or location.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleAddBranch} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="branchName">Branch Name</Label>
                                        <Input
                                            id="branchName"
                                            placeholder="e.g. Bangsar Outlet"
                                            value={branchForm.name}
                                            onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="branchAddress">Address</Label>
                                        <Input
                                            id="branchAddress"
                                            placeholder="Full address..."
                                            value={branchForm.address}
                                            onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                                        />
                                    </div>
                                    <Button type="submit" className="w-full font-bold" disabled={saving}>
                                        {saving ? "Creating..." : "Add Branch"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Branch List */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Registered Branches</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Branch Name</TableHead>
                                            <TableHead>Address</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {branches.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">
                                                    No branches found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            branches.map((branch) => (
                                                <TableRow key={branch.id}>
                                                    <TableCell className="font-bold">{branch.name}</TableCell>
                                                    <TableCell className="text-sm">
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <MapPin className="w-3 h-3" />
                                                            {branch.address || "No address set"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => deleteBranch(branch.id)} className="text-destructive">
                                                            <Trash2 className="w-4 h-4" />
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
                </TabsContent>

                <TabsContent value="staff" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Staff & Permissions</CardTitle>
                            <CardDescription>Manage user roles and their assigned branches.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>User</TableHead>
                                        <TableHead>Email/ID</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Assigned Branch</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-bold font-mono text-xs">{user.username}</TableCell>
                                            <TableCell className="text-sm">{user.email || "N/A"}</TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={user.role || "cashier"}
                                                    onValueChange={(val) => handleUpdateUser(user.id, { role: val })}
                                                >
                                                    <SelectTrigger className="w-[140px] h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="owner">Owner</SelectItem>
                                                        <SelectItem value="manager">Manager</SelectItem>
                                                        <SelectItem value="cashier">Cashier</SelectItem>
                                                        <SelectItem value="rider">Rider</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    defaultValue={user.branch_id || ""}
                                                    onValueChange={(val) => handleUpdateUser(user.id, { branch_id: val })}
                                                >
                                                    <SelectTrigger className="w-[180px] h-8 text-xs">
                                                        <SelectValue placeholder="Unassigned" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {branches.map(b => (
                                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="store" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Global Store Settings</CardTitle>
                            <CardDescription>Configure taxes and general store behavior.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loyaltySettings ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Default Sales Tax (%)</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="w-24"
                                                    value={loyaltySettings.tax_percentage}
                                                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, tax_percentage: parseFloat(e.target.value) })}
                                                />
                                                <span className="text-sm font-medium">%</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">This tax will be applied to all orders at the POS.</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleUpdateLoyalty} disabled={saving} className="w-full md:w-auto">
                                        <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Store Settings"}
                                    </Button>
                                </>
                            ) : (
                                <p className="text-muted-foreground italic">No settings found.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="loyalty" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Loyalty Program Configuration</CardTitle>
                            <CardDescription>Setup points earning ratio and punch card rewards.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loyaltySettings ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Points Earning Ratio</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">RM 1.00 = </span>
                                                <Input
                                                    type="number"
                                                    className="w-24"
                                                    value={loyaltySettings.points_ratio}
                                                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, points_ratio: parseFloat(e.target.value) })}
                                                />
                                                <span className="text-sm font-medium">Points</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">How many points a customer earns for every Ringgit spent.</p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Points Redemption Ratio</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    className="w-24"
                                                    value={loyaltySettings.redemption_ratio}
                                                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, redemption_ratio: parseFloat(e.target.value) })}
                                                />
                                                <span className="text-sm font-medium">Points = RM 1.00</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">Example: 100 points = RM 1.00 discount.</p>
                                        </div>
                                    </div>

                                    <div className="border-t pt-6">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Gift className="h-4 w-4" />
                                            Digital Punch Card
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label>Target Punches</Label>
                                                <Input
                                                    type="number"
                                                    value={loyaltySettings.punch_target}
                                                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, punch_target: parseInt(e.target.value) })}
                                                />
                                                <p className="text-xs text-muted-foreground">Number of purchases/visits required to get a reward.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Minimum Purchase for Punch (RM)</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="e.g. 10.00"
                                                    value={loyaltySettings.punch_min_purchase}
                                                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, punch_min_purchase: parseFloat(e.target.value) })}
                                                />
                                                <p className="text-xs text-muted-foreground">Example: RM 10.00 spent = 1 punch.</p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Reward Name</Label>
                                                <Select
                                                    value={loyaltySettings.punch_reward_name}
                                                    onValueChange={(val) => setLoyaltySettings({ ...loyaltySettings, punch_reward_name: val })}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a product reward" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {products.map((product) => (
                                                            <SelectItem key={product.id} value={product.name}>
                                                                {product.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <p className="text-xs text-muted-foreground">Select a product to give as a reward.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Button onClick={handleUpdateLoyalty} disabled={saving} className="w-full md:w-auto">
                                        <Save className="mr-2 h-4 w-4" /> {saving ? "Saving..." : "Save Loyalty Configuration"}
                                    </Button>
                                </>
                            ) : (
                                <p className="text-muted-foreground italic">No configuration found.</p>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
