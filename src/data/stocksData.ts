import { ColumnDefinition, NumericFilterCriteria, StockRecord } from '../types/stock';

/**
 * 獨立台股資料陣列（stocksData）
 * 系統啟動時會優先讀取同目錄之 /stocks.json，若讀取失敗則自動使用此內建陣列。
 * 基準時間：2026 年 11 月公開財報（2026 Q1~Q3 季報與 2025 全年財報）及最新配息公告。
 * 每日排程可用 Python 腳本直接覆寫 public/stocks.json（或 dist/stocks.json）。
 */
export const stocksData: StockRecord[] = [
  {
    market: '上市',
    code: '2330',
    name: '台積電',
    category: '科技股',
    cashDividend: 26.0,
    exDividendDate: '2026/12/10',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 2000.0,
    cashYield: 1.3,
    totalYield: 1.3,
    payDate: '2027/01/07',
    payoutRatio: 39.25,
    insiderHolding: 6.45,
    avgDiv3Y: 20.0,
    avgDiv6Y: 15.67,
    avgDiv10Y: 12.6,
    divCount10Y: 10,
    epsQ1: 22.08,
    epsQ2: 27.25,
    epsQ3: 29.43,
    epsYTD: 78.76,
    epsLastYear: 66.25,
    peRatio: 21.37,
    pbRatio: 7.65,
  },
  {
    market: '上市',
    code: '2317',
    name: '鴻海',
    category: '科技股',
    cashDividend: 7.17,
    exDividendDate: '2026/07/02',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 218.0,
    cashYield: 3.29,
    totalYield: 3.29,
    payDate: '2026/07/31',
    payoutRatio: 52.68,
    insiderHolding: 12.39,
    avgDiv3Y: 6.12,
    avgDiv6Y: 5.48,
    avgDiv10Y: 4.92,
    divCount10Y: 10,
    epsQ1: 3.56,
    epsQ2: 4.27,
    epsQ3: 5.51,
    epsYTD: 13.35,
    epsLastYear: 13.61,
    peRatio: 13.1,
    pbRatio: 1.82,
  },
  {
    market: '上市',
    code: '2454',
    name: '聯發科',
    category: '科技股',
    cashDividend: 53.5,
    exDividendDate: '2026/07/07',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 3780.0,
    cashYield: 1.42,
    totalYield: 1.42,
    payDate: '2026/07/31',
    payoutRatio: 80.86,
    insiderHolding: 5.72,
    avgDiv3Y: 54.17,
    avgDiv6Y: 53.08,
    avgDiv10Y: 38.65,
    divCount10Y: 10,
    epsQ1: 15.17,
    epsQ2: 15.28,
    epsQ3: 17.5,
    epsYTD: 47.95,
    epsLastYear: 66.16,
    peRatio: 60.63,
    pbRatio: 13.45,
  },
  {
    market: '上市',
    code: '3034',
    name: '聯詠',
    category: '科技股',
    cashDividend: 23.0,
    exDividendDate: '2026/07/10',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 448.0,
    cashYield: 5.13,
    totalYield: 5.13,
    payDate: '2026/08/11',
    payoutRatio: 85.6,
    insiderHolding: 1.8,
    avgDiv3Y: 27.67,
    avgDiv6Y: 32.15,
    avgDiv10Y: 22.74,
    divCount10Y: 10,
    epsQ1: 6.19,
    epsQ2: 10.4,
    epsQ3: 9.99,
    epsYTD: 26.58,
    epsLastYear: 26.87,
    peRatio: 14.04,
    pbRatio: 3.85,
  },
  {
    market: '上市',
    code: '2886',
    name: '兆豐金',
    category: '金融股',
    cashDividend: 1.75,
    exDividendDate: '2026/08/13',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 52.5,
    cashYield: 3.33,
    totalYield: 3.33,
    payDate: '2026/09/04',
    payoutRatio: 74.15,
    insiderHolding: 14.82,
    avgDiv3Y: 1.68,
    avgDiv6Y: 1.63,
    avgDiv10Y: 1.61,
    divCount10Y: 10,
    epsQ1: 0.63,
    epsQ2: 0.8,
    epsQ3: 0.78,
    epsYTD: 2.21,
    epsLastYear: 2.36,
    peRatio: 20.15,
    pbRatio: 2.02,
  },
  {
    market: '上市',
    code: '2891',
    name: '中信金',
    category: '金融股',
    cashDividend: 2.5,
    exDividendDate: '2026/07/10',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 74.0,
    cashYield: 3.38,
    totalYield: 3.38,
    payDate: '2026/08/07',
    payoutRatio: 61.27,
    insiderHolding: 1.44,
    avgDiv3Y: 2.2,
    avgDiv6Y: 1.68,
    avgDiv10Y: 1.42,
    divCount10Y: 10,
    epsQ1: 1.18,
    epsQ2: 0.78,
    epsQ3: 1.22,
    epsYTD: 3.18,
    epsLastYear: 4.08,
    peRatio: 18.14,
    pbRatio: 2.15,
  },
  {
    market: '上市',
    code: '2884',
    name: '玉山金',
    category: '金融股',
    cashDividend: 1.4,
    exDividendDate: '2026/07/01',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 42.5,
    cashYield: 3.29,
    totalYield: 3.29,
    payDate: '2026/07/27',
    payoutRatio: 66.04,
    insiderHolding: 1.42,
    avgDiv3Y: 1.33,
    avgDiv6Y: 1.22,
    avgDiv10Y: 1.28,
    divCount10Y: 10,
    epsQ1: 0.62,
    epsQ2: 0.7,
    epsQ3: 0.67,
    epsYTD: 1.99,
    epsLastYear: 2.12,
    peRatio: 17.1,
    pbRatio: 2.74,
  },
  {
    market: '上市',
    code: '2412',
    name: '中華電',
    category: '傳產存股',
    cashDividend: 5.2,
    exDividendDate: '2026/07/09',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 164.5,
    cashYield: 3.16,
    totalYield: 3.16,
    payDate: '2026/08/07',
    payoutRatio: 104.21,
    insiderHolding: 35.29,
    avgDiv3Y: 4.99,
    avgDiv6Y: 4.76,
    avgDiv10Y: 4.72,
    divCount10Y: 10,
    epsQ1: 1.3,
    epsQ2: 1.37,
    epsQ3: 1.58,
    epsYTD: 4.25,
    epsLastYear: 4.99,
    peRatio: 30.46,
    pbRatio: 3.38,
  },
  {
    market: '上市',
    code: '1216',
    name: '統一',
    category: '傳產存股',
    cashDividend: 3.0,
    exDividendDate: '2026/07/30',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 78.5,
    cashYield: 3.82,
    totalYield: 3.82,
    payDate: '2026/09/04',
    payoutRatio: 86.96,
    insiderHolding: 9.85,
    avgDiv3Y: 3.0,
    avgDiv6Y: 2.88,
    avgDiv10Y: 2.95,
    divCount10Y: 10,
    epsQ1: 1.15,
    epsQ2: 1.41,
    epsQ3: 1.14,
    epsYTD: 3.7,
    epsLastYear: 3.45,
    peRatio: 18.65,
    pbRatio: 3.08,
  },
  {
    market: '上市',
    code: '2603',
    name: '長榮',
    category: '傳產存股',
    cashDividend: 16.0,
    exDividendDate: '2026/06/17',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 252.0,
    cashYield: 6.35,
    totalYield: 6.35,
    payDate: '2026/07/17',
    payoutRatio: 50.51,
    insiderHolding: 2.75,
    avgDiv3Y: 19.5,
    avgDiv6Y: 24.83,
    avgDiv10Y: 15.1,
    divCount10Y: 7,
    epsQ1: 3.84,
    epsQ2: 7.41,
    epsQ3: 21.53,
    epsYTD: 32.77,
    epsLastYear: 31.68,
    peRatio: 6.92,
    pbRatio: 0.9,
  },
  {
    market: '上市',
    code: '0056',
    name: '元大高股息',
    category: '高股息 ETF',
    cashDividend: 4.94,
    exDividendDate: '2026/10/22',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 56.5,
    cashYield: 8.74,
    totalYield: 8.74,
    payDate: '2026/11/11',
    payoutRatio: null,
    insiderHolding: null,
    avgDiv3Y: 4.15,
    avgDiv6Y: 2.95,
    avgDiv10Y: 2.22,
    divCount10Y: 10,
    epsQ1: null,
    epsQ2: null,
    epsQ3: null,
    epsYTD: null,
    epsLastYear: null,
    peRatio: null,
    pbRatio: null,
  },
  {
    market: '上市',
    code: '00878',
    name: '國泰永續高股息',
    category: '高股息 ETF',
    cashDividend: 3.34,
    exDividendDate: '2026/11/17',
    stockDividend: 0.0,
    exRightsDate: '-',
    price: 31.2,
    cashYield: 10.71,
    totalYield: 10.71,
    payDate: '2026/12/11',
    payoutRatio: null,
    insiderHolding: null,
    avgDiv3Y: 2.37,
    avgDiv6Y: 1.82,
    avgDiv10Y: null,
    divCount10Y: 7,
    epsQ1: null,
    epsQ2: null,
    epsQ3: null,
    epsYTD: null,
    epsLastYear: null,
    peRatio: null,
    pbRatio: null,
  },
];

/**
 * 嚴格依照規格順序排列之 29 個資料欄位定義（第 1 欄為「市場」）
 */
export const TABLE_COLUMNS: ColumnDefinition[] = [
  { key: 'market', label: '市場', type: 'market', align: 'center', minWidth: 'w-[58px] min-w-[58px]', stickyLeft: 0 },
  { key: 'code', label: '代號', type: 'code', align: 'left', minWidth: 'w-[74px] min-w-[74px]', stickyLeft: 58 },
  { key: 'name', label: '公司', type: 'text', align: 'left', minWidth: 'w-[126px] min-w-[126px]', stickyLeft: 132 },
  { key: 'cashDividend', label: '配息', type: 'number', align: 'right', minWidth: 'min-w-[74px]', decimals: 2 },
  { key: 'exDividendDate', label: '除息日', type: 'date', align: 'center', minWidth: 'min-w-[96px]' },
  { key: 'stockDividend', label: '配股', type: 'number', align: 'right', minWidth: 'min-w-[74px]', decimals: 2 },
  { key: 'capReserveStockDiv', label: '公積配股', type: 'number', align: 'right', minWidth: 'min-w-[84px]', decimals: 2 },
  { key: 'exRightsDate', label: '除權日', type: 'date', align: 'center', minWidth: 'min-w-[96px]' },
  { key: 'price', label: '股價', type: 'number', align: 'right', minWidth: 'min-w-[84px]', decimals: 2 },
  {
    key: 'cashYield',
    label: '現金殖利率',
    type: 'percent',
    align: 'right',
    minWidth: 'min-w-[104px]',
    decimals: 2,
    isCashYield: true,
    isHighYieldCol: true,
  },
  {
    key: 'realYield',
    label: '真實殖利率',
    type: 'percent',
    align: 'right',
    minWidth: 'min-w-[98px]',
    decimals: 2,
    isHighYieldCol: true,
  },
  { key: 'totalYield', label: '殖利率', type: 'percent', align: 'right', minWidth: 'min-w-[88px]', decimals: 2 },
  { key: 'payDate', label: '發息日', type: 'date', align: 'center', minWidth: 'min-w-[96px]' },
  { key: 'payoutRatio', label: '配息率', type: 'percent', align: 'right', minWidth: 'min-w-[88px]', decimals: 2 },
  { key: 'insiderHolding', label: '董監持股', type: 'percent', align: 'right', minWidth: 'min-w-[94px]', decimals: 2 },
  { key: 'avgDiv3Y', label: '3年平均股利', type: 'number', align: 'right', minWidth: 'min-w-[104px]', decimals: 2 },
  { key: 'avgDiv6Y', label: '6年平均股利', type: 'number', align: 'right', minWidth: 'min-w-[104px]', decimals: 2 },
  { key: 'avgDiv10Y', label: '10年平均股利', type: 'number', align: 'right', minWidth: 'min-w-[110px]', decimals: 2 },
  { key: 'divCount10Y', label: '10年股利次數', type: 'integer', align: 'right', minWidth: 'min-w-[110px]' },
  { key: 'epsQ1', label: '1QEPS', type: 'number', align: 'right', minWidth: 'min-w-[82px]', decimals: 2 },
  { key: 'epsQ2', label: '2QEPS', type: 'number', align: 'right', minWidth: 'min-w-[82px]', decimals: 2 },
  { key: 'epsQ3', label: '3QEPS', type: 'number', align: 'right', minWidth: 'min-w-[82px]', decimals: 2 },
  { key: 'epsYTD', label: '今年累積EPS', type: 'number', align: 'right', minWidth: 'min-w-[108px]', decimals: 2 },
  { key: 'epsLastYear', label: '去年EPS', type: 'number', align: 'right', minWidth: 'min-w-[88px]', decimals: 2 },
  { key: 'epsProgressRatio', label: '業績進度(X)', type: 'number', align: 'right', minWidth: 'min-w-[100px]', decimals: 2 },
  { key: 'expectedDividend', label: '明年預期配息(A)', type: 'number', align: 'right', minWidth: 'min-w-[116px]', decimals: 2 },
  {
    key: 'expectedYield',
    label: '明年預期殖利率(B)',
    type: 'percent',
    align: 'right',
    minWidth: 'min-w-[128px]',
    decimals: 2,
    isHighYieldCol: true,
  },
  { key: 'peRatio', label: '本益比', type: 'number', align: 'right', minWidth: 'min-w-[82px]', decimals: 2 },
  { key: 'pbRatio', label: '股價淨值比', type: 'number', align: 'right', minWidth: 'min-w-[102px]', decimals: 2 },
];

export const EMPTY_FILTERS: NumericFilterCriteria = {
  market: '',
  qualityDividendOnly: false,
  minCashYield: '',
  minTotalYield: '',
  minPayoutRatio: '',
  maxPayoutRatio: '',
  minDivCount10Y: '',
  minAvgDiv10Y: '',
  maxPeRatio: '',
  maxPbRatio: '',
  minInsiderHolding: '',
  minEpsProgress: '',
  minExpectedYield: '',
  exDividendMonth: '',
};

export interface FilterPreset {
  id: string;
  label: string;
  criteria: NumericFilterCriteria;
}

export const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'all',
    label: '全部標的',
    criteria: { ...EMPTY_FILTERS },
  },
  {
    id: 'quality-dividend',
    label: '配息優股',
    criteria: {
      ...EMPTY_FILTERS,
      qualityDividendOnly: true,
      maxPayoutRatio: '100',
      minEpsProgress: '0.75',
      minExpectedYield: '5',
    },
  },
  {
    id: 'high-yield-5',
    label: '現金殖利率 5% 以上',
    criteria: { ...EMPTY_FILTERS, minCashYield: '5' },
  },
  {
    id: 'growth-yield',
    label: '業績成長＋預期高息 (X≥0.75, B≥5%)',
    criteria: { ...EMPTY_FILTERS, minEpsProgress: '0.75', minExpectedYield: '5' },
  },
  {
    id: 'steady-10y',
    label: '10年連續配息＋合計殖利率 4%+',
    criteria: { ...EMPTY_FILTERS, minTotalYield: '4', minDivCount10Y: '10' },
  },
  {
    id: 'value-low-pe',
    label: '低本益比價值股 (PE ≤ 17)',
    criteria: { ...EMPTY_FILTERS, minTotalYield: '4', maxPeRatio: '17', maxPbRatio: '2' },
  },
  {
    id: 'july-ex',
    label: '7月除息股',
    criteria: { ...EMPTY_FILTERS, exDividendMonth: '7' },
  },
];

export function extractMonthFromDate(dateStr: string): number | null {
  if (!dateStr || dateStr === '-') return null;
  const match = dateStr.match(/^\d{4}[/-](\d{1,2})[/-]\d{1,2}$/);
  if (!match) return null;
  const month = Number.parseInt(match[1], 10);
  return Number.isNaN(month) ? null : month;
}

export function formatCellValue(record: StockRecord, col: ColumnDefinition): string {
  const value = record[col.key];
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (col.type === 'market' || col.type === 'code' || col.type === 'text' || col.type === 'date') {
    return String(value);
  }
  const num = Number(value);
  if (Number.isNaN(num)) return '-';
  if (col.type === 'integer') {
    return `${Math.round(num)}`;
  }
  if (col.type === 'percent') {
    return `${num.toFixed(col.decimals ?? 2)}%`;
  }
  return num.toFixed(col.decimals ?? 2);
}

export function exportStocksToCsv(rows: StockRecord[]): void {
  const escapeCsv = (val: string) => {
    if (/[",\n\r]/.test(val)) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const headerLine = TABLE_COLUMNS.map((c) => escapeCsv(c.label)).join(',');
  const dataLines = rows.map((row) =>
    TABLE_COLUMNS.map((col) => escapeCsv(formatCellValue(row, col))).join(',')
  );

  // Prefix UTF-8 BOM so Microsoft Excel renders Traditional Chinese cleanly
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');

  const link = document.createElement('a');
  link.href = url;
  link.download = `台股殖利率篩選_${y}${m}${d}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
