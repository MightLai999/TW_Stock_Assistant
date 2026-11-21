export interface StockRecord {
  /** 1. 市場（上市 / 上櫃） */
  market: '上市' | '上櫃';
  /** 2. 代號 */
  code: string;
  /** 3. 公司 */
  name: string;
  /** 產業/類型（選填，僅供輔助閱讀或更新資料使用） */
  category?: string;
  /** 是否為 ETF */
  isEtf?: boolean;
  /** 3. 配息（現金股利，元） */
  cashDividend: number | null;
  /** 4. 除息日（YYYY/MM/DD 或 '-'） */
  exDividendDate: string;
  /** 配股（股票股利，元） */
  stockDividend: number | null;
  /** 公積配股（元） */
  capReserveStockDiv?: number | null;
  /** 除權日（YYYY/MM/DD 或 '-'） */
  exRightsDate: string;
  /** 股價（元） */
  price: number | null;
  /** 現金殖利率（%） */
  cashYield: number | null;
  /** 真實殖利率（除息前一日股價計算，%） */
  realYield?: number | null;
  /** 除息前一日收盤價（元） */
  preExPrice?: number | null;
  /** 殖利率（合計殖利率，%） */
  totalYield: number | null;
  /** 10. 發息日（YYYY/MM/DD 或 '-'） */
  payDate: string;
  /** 11. 配息率（%） */
  payoutRatio: number | null;
  /** 12. 董監持股（%） */
  insiderHolding: number | null;
  /** 13. 3年平均股利（元） */
  avgDiv3Y: number | null;
  /** 14. 6年平均股利（元） */
  avgDiv6Y: number | null;
  /** 15. 10年平均股利（元） */
  avgDiv10Y: number | null;
  /** 16. 10年股利次數（次） */
  divCount10Y: number | null;
  /** 17. 1QEPS（元） */
  epsQ1: number | null;
  /** 18. 2QEPS（元） */
  epsQ2: number | null;
  /** 19. 3QEPS（元） */
  epsQ3: number | null;
  /** 20. 今年累積EPS（元） */
  epsYTD: number | null;
  /** 去年EPS（元） */
  epsLastYear: number | null;
  /** 今年已公布財報季數（1~4） */
  epsQuarters?: number | null;
  /** 業績進度 X（今年累積EPS / 去年EPS） */
  epsProgressRatio?: number | null;
  /** 明年預期配息 A（元） */
  expectedDividend?: number | null;
  /** 明年預期殖利率 B（%） */
  expectedYield?: number | null;
  /** 本益比（倍） */
  peRatio: number | null;
  /** 股價淨值比（倍） */
  pbRatio: number | null;
  /** 產業大項（傳產 / 電子 / 金融 / 其他(ETF)） */
  sectorGroup?: '傳產' | '電子' | '金融' | '其他(ETF)' | string;
  /** 所屬產業（台股官方登記產業名稱） */
  industry?: string;
  /** 1Q 毛利率（%） */
  grossMarginQ1?: number | null;
  /** 2Q 毛利率（%） */
  grossMarginQ2?: number | null;
  /** 3Q 毛利率（%） */
  grossMarginQ3?: number | null;
  /** 1Q 淨利率（%） */
  netMarginQ1?: number | null;
  /** 2Q 淨利率（%） */
  netMarginQ2?: number | null;
  /** 3Q 淨利率（%） */
  netMarginQ3?: number | null;
  /** 去年毛利率（%） */
  grossMarginLastYear?: number | null;
  /** 去年淨利率（%） */
  netMarginLastYear?: number | null;
  /** 淨利業外比重（方案 A: (稅前純益率 - 營業利益率) / 稅前純益率 * 100%） */
  nonOpRatio?: number | null;
}

export type StockColumnKey =
  | 'market'
  | 'code'
  | 'name'
  | 'cashDividend'
  | 'exDividendDate'
  | 'stockDividend'
  | 'capReserveStockDiv'
  | 'exRightsDate'
  | 'price'
  | 'cashYield'
  | 'realYield'
  | 'totalYield'
  | 'payDate'
  | 'payoutRatio'
  | 'insiderHolding'
  | 'avgDiv3Y'
  | 'avgDiv6Y'
  | 'avgDiv10Y'
  | 'divCount10Y'
  | 'epsQ1'
  | 'epsQ2'
  | 'epsQ3'
  | 'epsYTD'
  | 'epsLastYear'
  | 'epsProgressRatio'
  | 'expectedDividend'
  | 'expectedYield'
  | 'peRatio'
  | 'pbRatio'
  | 'sectorGroup'
  | 'industry'
  | 'nonOpRatio'
  | 'grossMarginQ1'
  | 'grossMarginQ2'
  | 'grossMarginQ3'
  | 'netMarginQ1'
  | 'netMarginQ2'
  | 'netMarginQ3'
  | 'grossMarginLastYear'
  | 'netMarginLastYear';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  key: StockColumnKey;
  direction: SortDirection;
}

export interface NumericFilterCriteria {
  market: '' | '上市' | '上櫃';
  qualityDividendOnly?: boolean;
  minCashYield: string;
  minTotalYield: string;
  minPayoutRatio: string;
  maxPayoutRatio: string;
  minDivCount10Y: string;
  minAvgDiv10Y: string;
  maxPeRatio: string;
  maxPbRatio: string;
  minInsiderHolding: string;
  minEpsProgress: string;
  minExpectedYield: string;
  exDividendMonth: string; // '' for all, '1'..'12'
}

export interface ColumnDefinition {
  key: StockColumnKey;
  label: string;
  type: 'market' | 'code' | 'text' | 'number' | 'percent' | 'integer' | 'date';
  align: 'left' | 'right' | 'center';
  minWidth: string;
  decimals?: number;
  stickyLeft?: number;
  isCashYield?: boolean;
  isHighYieldCol?: boolean;
}
