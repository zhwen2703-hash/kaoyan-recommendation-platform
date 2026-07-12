import { NextResponse } from "next/server";
import { getAdmissionSnapshot, syncAdmissionUnits } from "@/lib/sync";

export const dynamic = "force-dynamic";

export async function GET() {
  const snapshot = await getAdmissionSnapshot();
  return NextResponse.json({
    source: snapshot.source,
    sourceUrl: snapshot.sourceUrl,
    count: snapshot.count,
    syncedAt: snapshot.syncedAt,
  });
}

export async function POST() {
  try {
    if (process.env.VERCEL) {
      const snapshot = await getAdmissionSnapshot();
      return NextResponse.json(
        {
          success: true,
          cloud: true,
          source: snapshot.source,
          count: snapshot.count,
          syncedAt: snapshot.syncedAt,
          message:
            "云端数据由 GitHub Actions 每日自动同步；当前已检查线上最新快照。",
        },
        { status: 202 },
      );
    }
    const snapshot = await syncAdmissionUnits();
    return NextResponse.json({
      success: true,
      source: snapshot.source,
      count: snapshot.count,
      syncedAt: snapshot.syncedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "同步失败",
      },
      { status: 502 },
    );
  }
}
