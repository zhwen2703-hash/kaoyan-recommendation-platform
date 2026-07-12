export type BackgroundReputation = {
  schoolName: string;
  status: "friendly" | "controversial";
  label: string;
  confidence: "中" | "低";
  sourceName: string;
  sourceUrl: string;
  checkedAt: string;
};

const iqihang = "https://m-jixun.iqihang.com/info/zykzd/jsj/2026705687.html";
const youlu = "https://www.youlu.com/kaoyan/article/CA20240320000000000050";
const shangyan = "https://www.shangyanjiaoyu.com/1154.html";

export const backgroundReputations: BackgroundReputation[] = [
  {
    schoolName: "哈尔滨工业大学",
    status: "friendly",
    label: "网络口碑：双非相对友好",
    confidence: "中",
    sourceName: "启航考研",
    sourceUrl: iqihang,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "北京师范大学",
    status: "friendly",
    label: "网络口碑：复试相对公平",
    confidence: "低",
    sourceName: "启航考研",
    sourceUrl: iqihang,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "中国农业大学",
    status: "friendly",
    label: "网络口碑：保护一志愿",
    confidence: "低",
    sourceName: "启航考研",
    sourceUrl: iqihang,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "北京邮电大学",
    status: "friendly",
    label: "网络口碑：双非相对友好",
    confidence: "中",
    sourceName: "尚研考研",
    sourceUrl: "https://www.shangyanjiaoyu.com/1157.html",
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "吉林大学",
    status: "friendly",
    label: "网络口碑：不看重本科出身",
    confidence: "中",
    sourceName: "优路教育",
    sourceUrl: youlu,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "南京大学",
    status: "friendly",
    label: "网络口碑：保护一志愿、双非友好",
    confidence: "中",
    sourceName: "优路教育",
    sourceUrl: youlu,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "厦门大学",
    status: "friendly",
    label: "网络口碑：复试较公平",
    confidence: "低",
    sourceName: "尚研考研",
    sourceUrl: shangyan,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "中南大学",
    status: "friendly",
    label: "网络口碑：复试较公平",
    confidence: "低",
    sourceName: "尚研考研",
    sourceUrl: shangyan,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "华东师范大学",
    status: "controversial",
    label: "网络口碑：本科背景存在争议",
    confidence: "低",
    sourceName: "启航考研",
    sourceUrl: iqihang,
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "郑州大学",
    status: "controversial",
    label: "网络口碑：本科背景存在争议",
    confidence: "低",
    sourceName: "启航考研",
    sourceUrl: iqihang,
    checkedAt: "2026-07-12",
  },
];

export function findBackgroundReputation(schoolName: string) {
  return (
    backgroundReputations.find((item) => item.schoolName === schoolName) ?? null
  );
}
