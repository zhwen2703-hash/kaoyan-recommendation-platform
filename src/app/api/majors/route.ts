import { NextResponse } from "next/server";
import { queryMajorOfferings } from "@/lib/majors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  try {
    const result = await queryMajorOfferings({
      majorCode: url.searchParams.get("majorCode") ?? undefined,
      majorName: url.searchParams.get("majorName") ?? "计算机科学与技术",
      page: Number(url.searchParams.get("page") ?? "1"),
      examType: url.searchParams.get("examType") ?? "全部",
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "专业目录查询失败" }, { status: 502 });
  }
}
