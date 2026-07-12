import { NextResponse } from "next/server";
import { getAdmissionSnapshot, syncAdmissionUnits } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getAdmissionSnapshot();
  return NextResponse.json({ source: snapshot.source, sourceUrl: snapshot.sourceUrl, count: snapshot.count, syncedAt: snapshot.syncedAt });
}

export async function POST() {
  try {
    const snapshot = await syncAdmissionUnits();
    return NextResponse.json({ success: true, source: snapshot.source, count: snapshot.count, syncedAt: snapshot.syncedAt });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "同步失败" }, { status: 502 });
  }
}
