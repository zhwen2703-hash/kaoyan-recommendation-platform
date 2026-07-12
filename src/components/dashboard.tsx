"use client";

import { BarChart3, CheckCircle2, Database, ExternalLink, GraduationCap, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { AdmissionUnit } from "@/lib/types";
import { SubjectExplorer } from "./subject-explorer";

type CatalogResponse = {
  items: AdmissionUnit[]; total: number; page: number; pageSize: number; totalPages: number;
  syncedAt: string; source: string; sourceUrl: string; catalogCount: number; regions: string[];
  regionDistribution: Array<{ region: string; count: number }>;
  stats: { graduateSchool: number; selfMarking: number; doubleFirstClass: number; publishedMetrics: number };
};

export function Dashboard() {
  const [keyword, setKeyword] = useState("");
  const [region, setRegion] = useState("全部");
  const [attribute, setAttribute] = useState("全部");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<AdmissionUnit | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      const params = new URLSearchParams({ keyword, region, attribute, page: String(page), pageSize: "20" });
      try {
        const response = await fetch(`/api/schools?${params}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("院校数据加载失败");
        setData((await response.json()) as CatalogResponse);
      } catch (requestError) {
        if ((requestError as Error).name !== "AbortError") setError((requestError as Error).message);
      } finally { setLoading(false); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [attribute, keyword, page, region]);

  async function syncNow() {
    setSyncing(true); setError("");
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "同步失败");
      setPage(1);
      const refreshed = await fetch("/api/schools?page=1&pageSize=20", { cache: "no-store" });
      setData(await refreshed.json());
    } catch (syncError) { setError((syncError as Error).message); }
    finally { setSyncing(false); }
  }

  return (
    <main className="min-h-screen bg-[#f5f9ff] text-slate-950">
      <header className="border-b border-blue-100 bg-white">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white"><GraduationCap /></div><div><h1 className="text-2xl font-black">全国考研招生单位实时数据平台</h1><p className="text-sm text-slate-500">只展示可核验官方数据，未公开字段不会估算</p></div></div>
          <button onClick={syncNow} disabled={syncing} className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"><RefreshCw className={syncing ? "animate-spin" : ""} />{syncing ? "正在同步研招网..." : "立即同步最新数据"}</button>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1500px] flex-col gap-5 px-5 py-6">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Stat label="招生单位总数" value={String(data?.catalogCount ?? "-")} icon={Database} />
          <Stat label="研究生院" value={String(data?.stats.graduateSchool ?? "-")} icon={GraduationCap} />
          <Stat label="自划线单位" value={String(data?.stats.selfMarking ?? "-")} icon={ShieldCheck} />
          <Stat label="双一流标记" value={String(data?.stats.doubleFirstClass ?? "-")} icon={CheckCircle2} />
          <Stat label="已解析详细指标" value={String(data?.stats.publishedMetrics ?? 0)} icon={BarChart3} />
        </section>

        <SubjectExplorer regions={data?.regions ?? []} />

        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div><h2 className="text-xl font-black">全国招生单位目录</h2><p className="mt-1 text-sm text-slate-500">数据源：{data?.source ?? "研招网"} · 最后同步：{data ? new Date(data.syncedAt).toLocaleString("zh-CN") : "-"}</p></div>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="flex items-center gap-2 rounded-xl border border-blue-100 px-3"><Search className="text-blue-600" /><input value={keyword} onChange={(event) => { setKeyword(event.target.value); setPage(1); }} placeholder="搜索招生单位" className="min-w-0 flex-1 py-3 text-sm outline-none" /></label>
              <select value={region} onChange={(event) => { setRegion(event.target.value); setPage(1); }} className="rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-bold"><option>全部</option>{data?.regions.map((item) => <option key={item}>{item}</option>)}</select>
              <select value={attribute} onChange={(event) => { setAttribute(event.target.value); setPage(1); }} className="rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-bold">{["全部", "研究生院", "自划线", "双一流"].map((item) => <option key={item}>{item}</option>)}</select>
            </div>
          </div>
          <p className="mt-4 text-sm font-bold text-blue-700">当前筛选共 {data?.total ?? 0} 个招生单位</p>
          <div className="mt-4 overflow-x-auto rounded-xl border border-blue-100">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-blue-50 text-xs font-black text-blue-900"><tr>{["招生单位", "地区", "主管部门", "属性", "2026 招生人数", "2026 复试线", "2026 复录比", "近年数据", "官方来源"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead>
              <tbody>{data?.items.map((unit) => {
                const current = unit.history.find((item) => item.year === 2026);
                return <tr key={unit.id} className="border-t border-blue-50"><td className="px-4 py-3 font-black">{unit.name}</td><td className="px-4 py-3">{unit.region}</td><td className="px-4 py-3 text-slate-600">{unit.department}</td><td className="px-4 py-3"><div className="flex gap-1">{unit.graduateSchool && <Tag>研究生院</Tag>}{unit.selfMarking && <Tag>自划线</Tag>}{unit.doubleFirstClass && <Tag>双一流</Tag>}</div></td><MissingCell value={current?.enrollment ?? null} label={current?.note} /><MissingCell value={current?.retestLine ?? null} label={current?.note} /><RatioCell value={current?.retestAdmissionRatio ?? null} label={current?.note} /><td className="px-4 py-3"><button onClick={() => setSelectedUnit(unit)} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-black text-white">查看 2023-2026</button></td><td className="px-4 py-3"><a href={unit.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-bold text-blue-700">研招网 <ExternalLink size={14} /></a></td></tr>;
              })}</tbody>
            </table>
          </div>
          {selectedUnit && <HistoryPanel unit={selectedUnit} onClose={() => setSelectedUnit(null)} />}
          <div className="mt-4 flex items-center justify-between"><button disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-bold disabled:opacity-40">上一页</button><span className="text-sm font-bold text-slate-500">第 {data?.page ?? 1} / {data?.totalPages ?? 1} 页 {loading && "· 加载中"}</span><button disabled={page >= (data?.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)} className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-bold disabled:opacity-40">下一页</button></div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-2xl border border-blue-100 bg-white p-5"><h2 className="text-xl font-black">招生单位地区分布</h2><div className="mt-4 h-[360px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.regionDistribution.slice(0, 15)}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="region" /><YAxis /><Tooltip /><Bar dataKey="count" fill="#2563eb" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div></div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="text-xl font-black text-amber-900">数据真实性说明</h2><div className="mt-4 flex flex-col gap-3 text-sm leading-6 text-amber-950"><p>招生单位名称、地区、主管部门和属性来自研招网院校库快照，并可通过来源链接核验。</p><p>招生人数、报考人数、复试线等字段需要逐校解析招生简章或复试公告。没有可靠来源时统一显示“未公开”，不会用估算值伪装真实数据。</p><p>系统每 6 小时检查本地快照，也可以点击“立即同步最新数据”强制刷新。</p><a href={data?.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 font-black text-blue-700">打开研招网院校库 <ExternalLink size={16} /></a></div></div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Database }) { return <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-500">{label}</p><Icon className="text-blue-600" /></div><p className="mt-3 text-3xl font-black">{value}</p></div>; }
function Tag({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">{children}</span>; }
function MissingCell({ value, label = "未公开" }: { value: number | null; label?: string }) { return <td className="px-4 py-3">{value ?? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{label}</span>}</td>; }
function RatioCell({ value, label = "未公开" }: { value: number | null; label?: string }) { return <td className="px-4 py-3">{value === null ? <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">{label}</span> : `${value}:1`}</td>; }

function HistoryPanel({ unit, onClose }: { unit: AdmissionUnit; onClose: () => void }) {
  return <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/50 p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-xl font-black">{unit.name} · 近年招生数据</h3><p className="mt-1 text-sm text-slate-500">“尚未采集”表示网站还没有解析该校公告；“未公开”表示已核查但学校未公布。</p></div><button onClick={onClose} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm font-bold">关闭</button></div><div className="mt-4 overflow-x-auto rounded-xl border border-blue-100 bg-white"><table className="w-full min-w-[760px] text-sm"><thead className="bg-blue-50 text-left text-xs font-black text-blue-900"><tr>{["年份", "复试线", "招生人数", "复录比", "发布日期", "数据来源"].map((head) => <th key={head} className="px-4 py-3">{head}</th>)}</tr></thead><tbody>{unit.history.map((item) => <tr key={item.year} className="border-t border-blue-50"><td className="px-4 py-3 font-black">{item.year}{item.year === 2026 && <span className="ml-2 rounded-full bg-blue-600 px-2 py-1 text-xs text-white">今年</span>}</td><HistoryValue value={item.retestLine} label={item.note} /><HistoryValue value={item.enrollment} label={item.note} /><td className="px-4 py-3">{item.retestAdmissionRatio === null ? item.note : `${item.retestAdmissionRatio}:1`}</td><td className="px-4 py-3">{item.publishedAt ?? item.note}</td><td className="px-4 py-3">{item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-blue-700">查看官方公告</a> : item.note}</td></tr>)}</tbody></table></div></div>;
}

function HistoryValue({ value, label }: { value: number | null; label: string }) { return <td className="px-4 py-3">{value ?? label}</td>; }
