import { NextResponse } from "next/server";
import { queryAdmissionUnits } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await queryAdmissionUnits({
    keyword: url.searchParams.get("keyword") ?? undefined,
    region: url.searchParams.get("region") ?? undefined,
    attribute: url.searchParams.get("attribute") ?? undefined,
    page: Number(url.searchParams.get("page") ?? "1"),
    pageSize: Number(url.searchParams.get("pageSize") ?? "20"),
  });
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
