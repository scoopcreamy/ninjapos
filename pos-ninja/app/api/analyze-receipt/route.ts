export const runtime = 'edge'; // Optional: Use edge runtime if deployed to Vercel, but for standard node features we might want default. 
// Actually, 'nodejs' is better for file handling unless using specific edge compatible FormData handling.
// Let's stick to standard nodejs runtime for now to avoid complexity with specific edge limits.

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GOOGLE_API_KEY is not configured" },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString("base64");

        const prompt = `
            Analyze this receipt image and extract the following information in JSON format:
            
            1. Global Fields:
            - amount: The GRAND TOTAL paid. Look for "Total", "Grand Total", "Total Amount", "Amount Due". If unclear, sum up the line items.
            - date: The date of the receipt (YYYY-MM-DD format). If the year is 2-digits (e.g. 24), assume 20xx.
            - description: The store/merchant name. Usually at the top.
            - category: The overall expense category (e.g. "Groceries", "Dining", "Supplies", "Utilities"). Infer from items found.

            2. Line Items (Extract as "items" array):
            - name: Product name/Description from the line item.
            - qty: Quantity (number). Default to 1 if not specified.
            - price: Total price for this line item (number).
            - details: Any extra info like weight (kg/g) or unit price if available (string).
            - category: Specific category for this item (e.g. "Cleaning", "Food", "Baby").

            IMPORTANT: 
            - Return ONLY raw JSON. No markdown formatting.
            - Ensure "amount" is a number.
            - If date is completely missing, return null.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Image,
                    mimeType: file.type || "image/jpeg",
                },
            },
        ]);

        const responseText = result.response.text();

        // Clean up markdown code blocks if present
        const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();

        const data = JSON.parse(jsonStr);

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("Analysis error:", error);
        return NextResponse.json(
            { error: "Failed to analyze receipt", details: error.message },
            { status: 500 }
        );
    }
}
