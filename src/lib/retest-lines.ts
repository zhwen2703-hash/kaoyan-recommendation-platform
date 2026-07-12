export type RetestLineReference = {
  schoolName: string;
  majorCode: string;
  collegeName: string;
  year: 2026 | 2025 | 2024;
  totalScore: number;
  confidence: "高" | "中" | "低";
  sourceName: string;
  sourceUrl: string;
  kind: "专业线" | "网络参考" | "国家线兜底";
};

export const retestLineReferences: RetestLineReference[] = [
  {
    schoolName: "南京大学",
    majorCode: "085410",
    collegeName: "智能科学与技术学院",
    year: 2026,
    totalScore: 380,
    confidence: "高",
    sourceName: "南京大学院系复试细则",
    sourceUrl:
      "https://is.nju.edu.cn/_upload/article/files/76/f4/7198658941fb949976ad54dbf1f2/0b78779b-9109-4ae9-8946-88e24b661768.pdf",
    kind: "专业线",
  },
  {
    schoolName: "南京大学",
    majorCode: "085405",
    collegeName: "软件学院",
    year: 2026,
    totalScore: 350,
    confidence: "中",
    sourceName: "新东方考研",
    sourceUrl: "https://kaoyan.xdf.cn/202606/15255169.html",
    kind: "网络参考",
  },
  {
    schoolName: "中国农业大学",
    majorCode: "081200",
    collegeName: "信息与电气工程学院",
    year: 2025,
    totalScore: 300,
    confidence: "高",
    sourceName: "中国农业大学信电学院复试细则",
    sourceUrl:
      "https://ciee.cau.edu.cn/module/download/downfile.jsp?classid=0&filename=09849b30f90d4fcda7fe4cc96cc07433.pdf",
    kind: "专业线",
  },
  {
    schoolName: "中国农业大学",
    majorCode: "085404",
    collegeName: "信息与电气工程学院",
    year: 2025,
    totalScore: 320,
    confidence: "高",
    sourceName: "中国农业大学信电学院复试细则",
    sourceUrl:
      "https://ciee.cau.edu.cn/module/download/downfile.jsp?classid=0&filename=09849b30f90d4fcda7fe4cc96cc07433.pdf",
    kind: "专业线",
  },
  {
    schoolName: "中国农业大学",
    majorCode: "140500",
    collegeName: "信息与电气工程学院",
    year: 2025,
    totalScore: 300,
    confidence: "高",
    sourceName: "中国农业大学信电学院复试细则",
    sourceUrl:
      "https://ciee.cau.edu.cn/module/download/downfile.jsp?classid=0&filename=09849b30f90d4fcda7fe4cc96cc07433.pdf",
    kind: "专业线",
  },
];

export function findRetestLine(
  schoolName: string,
  majorCode: string,
  collegeName: string,
) {
  return (
    retestLineReferences.find(
      (item) =>
        item.schoolName === schoolName &&
        item.majorCode === majorCode &&
        item.collegeName === collegeName,
    ) ?? null
  );
}

const regionB = new Set([
  "内蒙古",
  "广西",
  "海南",
  "贵州",
  "云南",
  "西藏",
  "甘肃",
  "青海",
  "宁夏",
  "新疆",
]);
const nationalLineSource =
  "https://www.moe.gov.cn/jyb_xwfb/gzdt_gzdt/s5987/202602/W020260228373276320816.pdf";

export function getNationalRetestLine(
  majorCode: string,
  region: string,
): RetestLineReference {
  const isB = regionB.has(region);
  const crossDiscipline = majorCode.startsWith("14");
  return {
    schoolName: "全国国家线",
    majorCode,
    collegeName: "教育部",
    year: 2026,
    totalScore: crossDiscipline ? (isB ? 256 : 266) : isB ? 254 : 264,
    confidence: "高",
    sourceName: `教育部2026国家线（${isB ? "B区" : "A区"}）`,
    sourceUrl: nationalLineSource,
    kind: "国家线兜底",
  };
}
