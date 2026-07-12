"use client";

import { Cpu, ExternalLink } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MajorOffering } from "@/lib/types";

type SubjectResponse = {
  subjectCode: string;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: MajorOffering[];
  schoolCount: number;
  majorCount: number;
  coveredMajors: Array<{ code: string; name: string }>;
  failedMajorQueries: number;
  sourceUrl: string;
  syncedAt: string;
  fullSnapshot?: boolean;
  refreshing?: boolean;
};

export function SubjectExplorer({ regions }: { regions: string[] }) {
  const [subjectCode, setSubjectCode] = useState("408");
  const [region, setRegion] = useState("全部");
  const [english, setEnglish] = useState("全部");
  const [math, setMath] = useState("全部");
  const [maxRetestRatio, setMaxRetestRatio] = useState("0");
  const [schoolTier, setSchoolTier] = useState("全部");
  const [background, setBackground] = useState("全部");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SubjectResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [autoRefreshUrl, setAutoRefreshUrl] = useState("");
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoRefreshUrl) return;
    const timer = window.setInterval(
      async () => {
        try {
          const response = await fetch(autoRefreshUrl, { cache: "no-store" });
          if (response.ok) setData(await response.json());
        } catch {
          /* Keep the last usable snapshot during transient network failures. */
        }
      },
      5 * 60 * 1000,
    );
    return () => window.clearInterval(timer);
  }, [autoRefreshUrl]);

  async function search(targetPage = 1) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        subjectCode,
        region,
        english,
        math,
        maxRetestRatio,
        schoolTier,
        background,
        page: String(targetPage),
      });
      const response = await fetch(`/api/exam-offerings?${params}`, {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "考试科目查询失败");
      setData(result);
      setPage(targetPage);
      setAutoRefreshUrl(`/api/exam-offerings?${params}`);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
          <Cpu />
        </div>
        <div>
          <h2 className="text-xl font-black">按考试科目选学校和专业</h2>
          <p className="text-sm text-slate-500">
            仅收录第四门初试科目代码严格等于 408
            的统考专业，不包含任何自命题科目
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <select
          value={subjectCode}
          onChange={(event) => setSubjectCode(event.target.value)}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold"
        >
          <option value="408">统考 408 计算机学科专业基础</option>
        </select>
        <select
          value={region}
          onChange={(event) => setRegion(event.target.value)}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold"
        >
          <option>全部</option>
          {regions.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <select
          value={english}
          onChange={(event) => setEnglish(event.target.value)}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold"
        >
          <option value="全部">英语不限</option>
          <option value="204">英语二（204）</option>
          <option value="201">英语一（201）</option>
        </select>
        <select
          value={math}
          onChange={(event) => setMath(event.target.value)}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold"
        >
          <option value="全部">数学不限</option>
          <option value="302">数学二（302）</option>
          <option value="301">数学一（301）</option>
        </select>
        <select
          value={maxRetestRatio}
          onChange={(event) => setMaxRetestRatio(event.target.value)}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold"
        >
          <option value="0">复录比不限</option>
          <option value="99">仅看已采集复录比</option>
          <option value="1.2">复录比 ≤ 1.2</option>
          <option value="1.5">复录比 ≤ 1.5</option>
          <option value="2">复录比 ≤ 2.0</option>
        </select>
        <select
          value={schoolTier}
          onChange={(event) => setSchoolTier(event.target.value)}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold"
        >
          <option value="全部">院校层级不限</option>
          <option value="985">985院校</option>
          <option value="211">211院校（含985）</option>
          <option value="双一流">双一流院校</option>
          <option value="普通">普通院校</option>
        </select>
        <select
          value={background}
          onChange={(event) => setBackground(event.target.value)}
          className="rounded-xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold"
        >
          <option value="全部">本科背景口碑不限</option>
          <option value="friendly">网络口碑相对友好</option>
          <option value="controversial">网络口碑存在争议</option>
          <option value="unknown">信息不足</option>
        </select>
        <button
          onClick={() => search(1)}
          disabled={loading}
          className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:opacity-60"
        >
          {loading ? "正在聚合研招网数据..." : "查询 408 院校专业"}
        </button>
      </div>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      )}
      {data && (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-emerald-700">
                共 {data.schoolCount} 个招生单位、{data.majorCount} 个专业代码、
                {data.total} 条学校专业记录
              </p>
              <p className="mt-1 text-xs text-slate-500">
                官方数据同步：{new Date(data.syncedAt).toLocaleString("zh-CN")}{" "}
                · 每5分钟自动刷新 ·{" "}
                {data.refreshing ? (
                  <span className="font-bold text-amber-600">
                    后台正在核验最新目录
                  </span>
                ) : (
                  <span className="text-emerald-600">当前快照可用</span>
                )}
              </p>
            </div>
            <p className="text-xs text-slate-500">
              专业范围：{data.coveredMajors.map((item) => item.name).join("、")}
            </p>
          </div>
          <div
            ref={topScrollRef}
            onScroll={(event) => {
              if (tableScrollRef.current)
                tableScrollRef.current.scrollLeft =
                  event.currentTarget.scrollLeft;
            }}
            className="mt-4 overflow-x-auto rounded-t-xl border border-b-0 border-emerald-100 bg-emerald-50/60"
            aria-label="表格顶部横向滚动条"
          >
            <div className="h-3 min-w-[1900px]" />
          </div>
          <div
            ref={tableScrollRef}
            onScroll={(event) => {
              if (topScrollRef.current)
                topScrollRef.current.scrollLeft =
                  event.currentTarget.scrollLeft;
            }}
            className="overflow-x-auto rounded-b-xl border border-emerald-100"
          >
            <table className="w-full min-w-[1900px] text-left text-sm">
              <thead className="bg-emerald-50 text-xs font-black text-emerald-900">
                <tr>
                  {[
                    "学校及层级",
                    "本科背景口碑",
                    "专业",
                    "类型",
                    "院系",
                    "研究方向",
                    "2026拟招生",
                    "2027拟招生",
                    "扩招变化",
                    "2026复录比",
                    "初试科目",
                    "来源",
                  ].map((head) => (
                    <th
                      key={head}
                      className={`px-4 py-3 ${head === "学校及层级" ? "sticky left-0 z-20 min-w-48 bg-emerald-50 shadow-[4px_0_8px_-6px_rgba(15,23,42,0.45)]" : ""}`}
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => {
                  const isProfessional =
                    item.degreeType?.includes("专业") ||
                    item.majorCode.startsWith("085");
                  return (
                    <tr key={item.id} className="border-t border-emerald-50">
                      <td className="sticky left-0 z-10 min-w-48 bg-white px-4 py-3 font-black shadow-[4px_0_8px_-6px_rgba(15,23,42,0.45)]">
                        {item.schoolName}
                        <p className="text-xs font-normal text-slate-500">
                          {item.region}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.project985 && <SchoolTag>985</SchoolTag>}
                          {item.project211 && <SchoolTag>211</SchoolTag>}
                          {item.doubleFirstClass && (
                            <SchoolTag>双一流</SchoolTag>
                          )}
                          {item.selfMarking && <SchoolTag>自划线</SchoolTag>}
                          {item.graduateSchool && (
                            <SchoolTag>研究生院</SchoolTag>
                          )}
                          {!item.project985 &&
                            !item.project211 &&
                            !item.doubleFirstClass &&
                            !item.selfMarking &&
                            !item.graduateSchool && (
                              <span className="text-xs font-normal text-slate-400">
                                普通招生单位
                              </span>
                            )}
                        </div>
                      </td>
                      <BackgroundCell item={item} />
                      <td className="px-4 py-3">
                        <b>({item.majorCode})</b> {item.majorName}
                        <p className="text-xs text-slate-500">
                          {item.studyMode}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-black ${isProfessional ? "bg-blue-100 text-blue-700" : "bg-violet-100 text-violet-700"}`}
                        >
                          {isProfessional ? "专硕" : "学硕"}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.collegeName}</td>
                      <td className="px-4 py-3">{item.directionName}</td>
                      <EnrollmentCell
                        value={item.enrollment2026}
                        detail={item.plannedEnrollment}
                      />
                      <EnrollmentCell value={item.enrollment2027} />
                      <ChangeCell
                        value={item.enrollmentChange}
                        comparable={
                          item.enrollment2026 != null &&
                          item.enrollment2027 != null
                        }
                      />
                      <RatioCell
                        value={item.retestAdmissionRatio2026}
                        sourceUrl={item.retestAdmissionRatioSourceUrl}
                      />
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {item.subjects.map((subject) => (
                            <span
                              key={`${item.id}-${subject.code}`}
                              className={
                                subject.code === "408"
                                  ? "font-black text-emerald-700"
                                  : ""
                              }
                            >
                              {subject.code} {subject.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-bold text-blue-700"
                        >
                          研招网 <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button
              disabled={page <= 1 || loading}
              onClick={() => search(page - 1)}
              className="rounded-xl border border-emerald-100 px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              上一页
            </button>
            <span className="text-sm font-bold text-slate-500">
              第 {page} / {data.totalPages} 页
            </span>
            <button
              disabled={loading || page >= data.totalPages}
              onClick={() => search(page + 1)}
              className="rounded-xl border border-emerald-100 px-4 py-2 text-sm font-bold disabled:opacity-40"
            >
              下一页
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function SchoolTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-black text-amber-700">
      {children}
    </span>
  );
}

function BackgroundCell({ item }: { item: MajorOffering }) {
  if (item.backgroundReputation === "friendly") {
    return (
      <td className="px-4 py-3">
        <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
          相对友好
        </span>
        <p className="mt-2 max-w-40 text-xs text-slate-500">
          {item.backgroundReputationLabel}
        </p>
        {item.backgroundReputationSourceUrl && (
          <a
            href={item.backgroundReputationSourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-xs font-bold text-blue-700"
          >
            {item.backgroundReputationSourceName} ·{" "}
            {item.backgroundReputationConfidence}置信度
          </a>
        )}
      </td>
    );
  }
  if (item.backgroundReputation === "controversial") {
    return (
      <td className="px-4 py-3">
        <span className="whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700">
          存在争议
        </span>
        <p className="mt-2 max-w-40 text-xs text-slate-500">
          非官方网络口碑，请自行核验
        </p>
        {item.backgroundReputationSourceUrl && (
          <a
            href={item.backgroundReputationSourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block text-xs font-bold text-blue-700"
          >
            查看来源 · {item.backgroundReputationConfidence}置信度
          </a>
        )}
      </td>
    );
  }
  return (
    <td className="px-4 py-3">
      <span className="whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
        信息不足
      </span>
      <p className="mt-2 max-w-40 text-xs text-slate-400">
        暂无可靠网络结论，不代表友好或歧视
      </p>
    </td>
  );
}

function EnrollmentCell({
  value,
  detail,
}: {
  value?: number | null;
  detail?: string;
}) {
  return (
    <td className="px-4 py-3">
      <b>{value ?? "未公布"}</b>
      {value !== null && value !== undefined && (
        <span className="ml-1 text-xs text-slate-500">人</span>
      )}
      {detail && (
        <p className="mt-1 max-w-40 text-xs text-slate-500">{detail}</p>
      )}
    </td>
  );
}

function ChangeCell({
  value,
  comparable,
}: {
  value?: number | null;
  comparable: boolean;
}) {
  if (!comparable || value === null || value === undefined)
    return <td className="px-4 py-3 text-slate-400">暂无法比较</td>;
  if (value > 0)
    return (
      <td className="px-4 py-3 font-black text-emerald-700">扩招 {value} 人</td>
    );
  if (value < 0)
    return (
      <td className="px-4 py-3 font-black text-red-600">
        缩招 {Math.abs(value)} 人
      </td>
    );
  return <td className="px-4 py-3 font-black text-slate-600">持平</td>;
}

function RatioCell({
  value,
  sourceUrl,
}: {
  value?: number | null;
  sourceUrl?: string | null;
}) {
  if (value === null || value === undefined)
    return (
      <td className="px-4 py-3 text-slate-400">
        <span className="whitespace-nowrap">未采集</span>
        <p className="mt-1 text-xs">不以报录比代替</p>
      </td>
    );
  const low = value <= 1.2;
  const networkReference = sourceUrl
    ? !new URL(sourceUrl).hostname.endsWith("edu.cn") &&
      !new URL(sourceUrl).hostname.endsWith("ac.cn")
    : false;
  return (
    <td
      className={`px-4 py-3 font-black ${low ? "text-emerald-700" : value <= 1.5 ? "text-amber-700" : "text-red-600"}`}
    >
      <span className="whitespace-nowrap">{value.toFixed(2)} : 1</span>
      <p className="mt-1 text-xs font-normal">
        {low ? "刷人较少" : value <= 1.5 ? "刷人适中" : "刷人较多"}
      </p>
      {networkReference && (
        <p className="mt-1 text-xs font-normal text-slate-500">
          网络参考 · 中置信度
        </p>
      )}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block text-xs text-blue-700"
        >
          查看{networkReference ? "参考来源" : "官方依据"}
        </a>
      )}
    </td>
  );
}
