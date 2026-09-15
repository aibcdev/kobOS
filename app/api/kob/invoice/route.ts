import { NextResponse } from "next/server";
import { InvoiceInput, parseInvoiceData } from "@/lib/kob/engines/server-logic";

export async function POST(request: Request) {
  try {
    const data = InvoiceInput.parse(await request.json());
    const result = await parseInvoiceData(data);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
}
