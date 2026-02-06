import pb from "./pocketbase";

interface OrderItem {
    product_id: string;
    order_id: string;
}

export async function getSmartSuggestions(currentCartIds: string[]): Promise<string[]> {
    try {
        // 1. Fetch recent order items (e.g., last 200)
        // Note: In a real app, this would be a server-side analytics job or a cached map.
        const recentItems = await pb.collection("order_items").getList<OrderItem>(1, 500, {
            sort: "-created",
            fields: "product_id,order_id",
        });

        if (recentItems.items.length === 0) return [];

        // 2. Group items by order
        const ordersMap = new Map<string, string[]>();
        recentItems.items.forEach(item => {
            if (!ordersMap.has(item.order_id)) {
                ordersMap.set(item.order_id, []);
            }
            ordersMap.get(item.order_id)!.push(item.product_id);
        });

        // 3. Count co-occurrences
        const pairingCounts = new Map<string, Map<string, number>>();

        ordersMap.forEach(productIds => {
            productIds.forEach(idA => {
                if (!pairingCounts.has(idA)) {
                    pairingCounts.set(idA, new Map<string, number>());
                }
                const countsForA = pairingCounts.get(idA)!;
                productIds.forEach(idB => {
                    if (idA === idB) return;
                    countsForA.set(idB, (countsForA.get(idB) || 0) + 1);
                });
            });
        });

        // 4. Find best suggestions for current cart
        const globalCounts = new Map<string, number>();
        currentCartIds.forEach(cartId => {
            const suggestionsForId = pairingCounts.get(cartId);
            if (suggestionsForId) {
                suggestionsForId.forEach((count, suggestedId) => {
                    // Don't suggest items already in cart
                    if (currentCartIds.includes(suggestedId)) return;
                    globalCounts.set(suggestedId, (globalCounts.get(suggestedId) || 0) + count);
                });
            }
        });

        // 5. Sort by frequency and return top 5 IDs
        return Array.from(globalCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([id]) => id);

    } catch (e) {
        console.error("Suggestion error:", e);
        return [];
    }
}
