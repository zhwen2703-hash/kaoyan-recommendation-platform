export type NetworkRatio = {
  schoolName: string;
  majorCode: string;
  collegeName?: string;
  year: number;
  ratio: number;
  retestCount?: number;
  admittedCount?: number;
  confidence: "高" | "中" | "低";
  basis: "官方名单核算" | "权威机构整理" | "多来源交叉验证";
  sourceUrl: string;
  sourceName: string;
  checkedAt: string;
};

// Network references are reviewed records, not official fields from CHSI.
export const networkRatios: NetworkRatio[] = [
  {
    schoolName: "南京大学",
    majorCode: "085405",
    collegeName: "软件学院",
    year: 2026,
    ratio: 106 / 87,
    retestCount: 106,
    admittedCount: 87,
    confidence: "中",
    basis: "权威机构整理",
    sourceUrl: "https://kaoyan.xdf.cn/202606/15255169.html",
    sourceName: "新东方考研",
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "华南理工大学",
    majorCode: "085404",
    collegeName: "计算机科学与工程学院",
    year: 2026,
    ratio: 1.12,
    retestCount: 87,
    admittedCount: 77,
    confidence: "中",
    basis: "权威机构整理",
    sourceUrl: "https://m-jixun.iqihang.com/info/zykzd/jsj/2026705687.html",
    sourceName: "启航考研",
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "华中师范大学",
    majorCode: "081200",
    collegeName: "计算机学院",
    year: 2026,
    ratio: 1.07,
    confidence: "低",
    basis: "权威机构整理",
    sourceUrl: "https://m-jixun.iqihang.com/info/zykzd/jsj/2026705687.html",
    sourceName: "启航考研",
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "天津理工大学",
    majorCode: "081200",
    collegeName: "计算机科学与工程学院",
    year: 2026,
    ratio: 1,
    confidence: "低",
    basis: "权威机构整理",
    sourceUrl: "https://m-jixun.iqihang.com/info/zykzd/jsj/2026705687.html",
    sourceName: "启航考研",
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "哈尔滨理工大学",
    majorCode: "081200",
    collegeName: "计算机科学与技术学院",
    year: 2026,
    ratio: 1,
    confidence: "低",
    basis: "权威机构整理",
    sourceUrl: "https://m-jixun.iqihang.com/info/zykzd/jsj/2026705687.html",
    sourceName: "启航考研",
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "南昌大学",
    majorCode: "081200",
    collegeName: "数学与计算机学院",
    year: 2026,
    ratio: 12,
    confidence: "低",
    basis: "权威机构整理",
    sourceUrl: "https://m-jixun.iqihang.com/info/zykzd/jsj/2026705687.html",
    sourceName: "启航考研",
    checkedAt: "2026-07-12",
  },
  {
    schoolName: "中国农业大学",
    majorCode: "085404",
    collegeName: "信息与电气工程学院",
    year: 2026,
    ratio: 1,
    confidence: "低",
    basis: "权威机构整理",
    sourceUrl: "https://m-jixun.iqihang.com/info/zykzd/jsj/2026705687.html",
    sourceName: "启航考研",
    checkedAt: "2026-07-12",
  },
];

export function findNetworkRatio(
  schoolName: string,
  majorCode: string,
  collegeName: string,
) {
  return networkRatios.find(
    (item) =>
      item.schoolName === schoolName &&
      item.majorCode === majorCode &&
      (!item.collegeName || item.collegeName === collegeName),
  );
}
