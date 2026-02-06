"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import pb from "@/lib/pocketbase";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Check if user is logged in
        const authCheck = () => {
            if (!pb.authStore.isValid && pathname !== "/login") {
                setAuthorized(false);
                router.push("/login");
            } else {
                setAuthorized(true);
            }
        };

        authCheck();

        // Optional: Listen for auth changes
        const unsubscribe = pb.authStore.onChange((token, model) => {
            authCheck();
        });

        return () => {
            unsubscribe();
        };
    }, [pathname, router]);

    if (!authorized && pathname !== "/login") {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-zinc-950">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-medium animate-pulse">
                    Verifying session...
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
