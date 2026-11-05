import { NextResponse } from "next/server";
import { seedInitialData } from "@/db/seed";

export async function POST() {
  try {
    const result = await seedInitialData();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await seedInitialData();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
