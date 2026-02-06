"use client";

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    Store,
    ChefHat,
    Package,
    LayoutDashboard,
    Settings,
    LogOut,
    Receipt,
    Users,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import pb from "@/lib/pocketbase";

export function MainSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Hide sidebar on login page
    if (pathname === "/login") return null;

    const toggleSidebar = () => {
        setIsCollapsed(!isCollapsed);
    };

    const toggleMobileSidebar = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    const handleLogout = () => {
        pb.authStore.clear();
        router.push("/login");
        // refresh to clear any cached states
        window.location.reload();
    };

    const handleNavigation = (path: string) => {
        router.push(path);
        setIsMobileOpen(false); // Close mobile menu after navigation
    };

    const menuItems = [
        { name: "POS Terminal", icon: Store, path: "/pos" },
        { name: "Kitchen", icon: ChefHat, path: "/kitchen" },
        { name: "Expenses", icon: Receipt, path: "/expenses" },
        { name: "Reports", icon: LayoutDashboard, path: "/reports" },
        { name: "Orders", icon: ClipboardList, path: "/orders" },
        { name: "Products", icon: Package, path: "/products" },
        { name: "Customers", icon: Users, path: "/customers" },
        { name: "Settings", icon: Settings, path: "/settings" },
    ];

    return (
        <>
            {/* Mobile Hamburger Button */}
            <button
                onClick={toggleMobileSidebar}
                className="lg:hidden fixed top-4 left-4 z-50 bg-primary text-white p-2 rounded-md shadow-lg"
                aria-label="Toggle menu"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* Mobile Overlay */}
            {isMobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={toggleMobileSidebar}
                />
            )}

            {/* Sidebar */}
            <div
                className={cn(
                    "bg-zinc-900 text-white flex flex-col h-screen shrink-0 border-r border-zinc-800 transition-all duration-300 ease-in-out",
                    // Desktop behavior
                    "hidden lg:flex",
                    isCollapsed ? "lg:w-20" : "lg:w-64",
                    // Mobile behavior
                    "lg:relative",
                    isMobileOpen ? "fixed inset-y-0 left-0 z-40 flex w-64" : ""
                )}
            >
                <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-800">
                    <div className={cn("flex items-center transition-all duration-300", isCollapsed ? "justify-center w-full" : "justify-center w-full px-1")}>
                        <div className={cn("relative shrink-0 transition-all duration-300", isCollapsed ? "w-10 h-10" : "w-full h-14")}>
                            <img
                                src={isCollapsed ? "/logo-icon.png" : "/logo.png"}
                                alt="NinjaPOS AI"
                                className="object-contain w-full h-full"
                            />
                        </div>
                    </div>
                    {!isCollapsed && (
                        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-zinc-400 hover:text-white hidden lg:flex">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                {isCollapsed && (
                    <div className="flex justify-center py-2 border-b border-zinc-800">
                        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                )}

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {menuItems.map((item) => {
                        let isActive = false;
                        if (item.path.includes("?")) {
                            const [path, query] = item.path.split("?");
                            const queryKey = query.split("=")[0];
                            const queryVal = query.split("=")[1];
                            isActive = pathname === path && searchParams.get(queryKey) === queryVal;
                        } else {
                            isActive = pathname === item.path || (pathname.startsWith(item.path) && item.path !== "/");
                        }

                        return (
                            <Button
                                key={item.path}
                                variant="ghost"
                                className={cn(
                                    "w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all",
                                    isActive && "bg-primary text-white hover:bg-primary/90 hover:text-white",
                                    isCollapsed ? "justify-center px-0" : "justify-start"
                                )}
                                onClick={() => handleNavigation(item.path)}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className={cn("h-5 w-5", isActive && "text-white")} />
                                {!isCollapsed && <span className="ml-3 truncate">{item.name}</span>}
                            </Button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    <Button
                        variant="ghost"
                        onClick={handleLogout}
                        className={cn(
                            "w-full text-red-400 hover:text-red-300 hover:bg-red-950/30",
                            isCollapsed ? "justify-center px-0" : "justify-start"
                        )}
                    >
                        <LogOut className="h-5 w-5" />
                        {!isCollapsed && <span className="ml-3">Logout</span>}
                    </Button>
                </div>
            </div>
        </>
    );
}
