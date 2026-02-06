"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { User, Lock, Loader2, ChefHat } from "lucide-react";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            await pb.collection("users").authWithPassword(email, password);
            router.push("/pos");
        } catch (e) {
            console.error(e);
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex items-center justify-center bg-gray-100 dark:bg-zinc-950 p-4">
            <Card className="w-full max-w-md shadow-2xl border-0">
                <CardHeader className="space-y-1 text-center pb-8 border-b">
                    <div className="flex justify-center mb-6">
                        <img
                            src="/logo.png"
                            alt="POS Ninja"
                            className="h-20 w-auto object-contain"
                        />
                    </div>
                    <CardTitle className="text-3xl font-bold tracking-tight">Welcome Back</CardTitle>
                    <CardDescription>
                        Sign in to your POS Ninja dashboard
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-8 space-y-4">
                    {error && (
                        <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md text-center font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="admin@ninjapos.com"
                                    className="pl-9"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    className="pl-9"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full h-11 font-bold shadow-lg shadow-primary/20" disabled={loading}>
                            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
                            Sign In
                        </Button>
                    </form>

                    <div className="pt-4 text-center text-xs text-muted-foreground">
                        <p>POS Ninja v1.0 • Built with ❤️ by AI</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
