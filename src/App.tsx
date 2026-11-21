import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Moon, Sun, Upload } from 'lucide-react';
import { DataGuideModal } from './components/DataGuideModal';
import { FilterPanel } from './components/FilterPanel';
import { StockTable } from './components/StockTable';
import {
  EMPTY_FILTERS,
  exportStocksToCsv,
  extractMonthFromDate,
  FILTER_PRESETS,
  stocksData,
  TABLE_COLUMNS,
} from './data/stocksData';
import {
  NumericFilterCriteria,
  SortConfig,
  StockColumnKey,
  StockRecord,
} from './types/stock';

function parseOptionalNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareDateString(a: string, b: string): number {
  const normA = a && a !== '-' ? a.replace(/-/g, '/') : '';
  const normB = b && b !== '-' ? b.replace(/-/g, '/') : '';
  if (!normA && !normB) return 0;
  if (!normA) return 1;
  if (!normB) return -1;
  return normA.localeCompare(normB);
}

interface StocksMeta {
  updatedAt?: string;
  updatedDate?: string;
  priceDate?: string;
  twsePriceDate?: string;
  tpexPriceDate?: string;
  total?: number;
  listedCount?: number;
  otcCount?: number;
  epsPeriod?: string;
}

function formatDateWithWeekday(dateStr?: string): string {
  if (!dateStr) return '-';
  const s = dateStr.trim();
  if (!s || s === '-') return '-';
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(.*))?$/);
  if (!m) return s;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo - 1, d);
  if (Number.isNaN(dt.getTime())) return s;
  const wd = ['日', '一', '二', '三', '四', '五', '六'][dt.getDay()];
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const datePart = `${y}/${pad2(mo)}/${pad2(d)} (${wd})`;
  return m[4] ? `${datePart} ${m[4]}` : datePart;
}

export default function App() {
  const [allStocks, setAllStocks] = useState<StockRecord[]>(stocksData);
  const [stocksMeta, setStocksMeta] = useState<StocksMeta | null>(null);
  const [dataSourceLabel, setDataSourceLabel] = useState<string>('stocks.json');
  const [loading, setLoading] = useState<boolean>(true);

  // Instant keyword filter
  const [keyword, setKeyword] = useState<string>('');

  // Composite numeric & ex-dividend month filters (draft vs applied)
  const [draftFilters, setDraftFilters] = useState<NumericFilterCriteria>({ ...EMPTY_FILTERS });
  const [appliedFilters, setAppliedFilters] = useState<NumericFilterCriteria>({ ...EMPTY_FILTERS });

  // Sorting state (default: cashYield descending like classic dividend screeners)
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: 'cashYield',
    direction: 'desc',
  });

  // Data guide / JSON import modal
  const [isDataModalOpen, setIsDataModalOpen] = useState<boolean>(false);

  // Theme state: dark vs light
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // ignore localStorage errors
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const loadDefaultJson = useCallback(async () => {
    setLoading(true);
    try {
      const [res, metaRes] = await Promise.all([
        fetch('/stocks.json', { cache: 'no-store' }),
        fetch('/stocks_meta.json', { cache: 'no-store' }).catch(() => null),
      ]);
      if (!res.ok) {
        throw new Error('HTTP error');
      }
      const json = await res.json();
      if (metaRes && metaRes.ok) {
        try {
          const metaJson = await metaRes.json();
          if (metaJson && typeof metaJson === 'object') {
            setStocksMeta(metaJson as StocksMeta);
          }
        } catch {
          // ignore malformed meta
        }
      }
      if (Array.isArray(json) && json.length > 0) {
        setAllStocks(json as StockRecord[]);
        setDataSourceLabel('/stocks.json');
      } else {
        setAllStocks(stocksData);
        setDataSourceLabel('內建 stocksData');
      }
    } catch {
      setAllStocks(stocksData);
      setDataSourceLabel('內建 stocksData');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDefaultJson();
  }, [loadDefaultJson]);

  const handleDraftChange = useCallback(
    (field: keyof NumericFilterCriteria, value: string) => {
      setDraftFilters((prev) => ({ ...prev, [field]: value }));
      if (field === 'market') {
        setAppliedFilters((prev) => ({ ...prev, market: value as '' | '上市' | '上櫃' }));
      }
    },
    []
  );

  const handleApplyFilters = useCallback(() => {
    setAppliedFilters({ ...draftFilters });
  }, [draftFilters]);

  const handleResetFilters = useCallback(() => {
    setKeyword('');
    setDraftFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
  }, []);

  const handleApplyPreset = useCallback((presetId: string) => {
    const preset = FILTER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDraftFilters({ ...preset.criteria });
    setAppliedFilters({ ...preset.criteria });
    if (presetId === 'quality-dividend') {
      setSortConfig({ key: 'expectedYield', direction: 'desc' });
    }
  }, []);

  const handleSort = useCallback((key: StockColumnKey) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'desc' ? 'asc' : 'desc' };
      }
      // Text & code & date default ascending; numeric ratios/yields default descending
      const col = TABLE_COLUMNS.find((c) => c.key === key);
      const defaultDir =
        col && (col.type === 'market' || col.type === 'code' || col.type === 'text' || col.type === 'date')
          ? 'asc'
          : 'desc';
      return { key, direction: defaultDir };
    });
  }, []);

  const hasUnappliedChanges = useMemo(() => {
    return (Object.keys(EMPTY_FILTERS) as (keyof NumericFilterCriteria)[]).some(
      (k) => draftFilters[k] !== appliedFilters[k]
    );
  }, [draftFilters, appliedFilters]);

  const activeFilterCount = useMemo(() => {
    let count = keyword.trim() ? 1 : 0;
    for (const key of Object.keys(EMPTY_FILTERS) as (keyof NumericFilterCriteria)[]) {
      const val = appliedFilters[key];
      if (typeof val === 'boolean') {
        if (val) count += 1;
      } else if (typeof val === 'string' && val.trim() !== '') {
        count += 1;
      }
    }
    return count;
  }, [keyword, appliedFilters]);

  const activePresetId = useMemo(() => {
    for (const preset of FILTER_PRESETS) {
      const matches = (Object.keys(EMPTY_FILTERS) as (keyof NumericFilterCriteria)[]).every(
        (k) => appliedFilters[k] === preset.criteria[k]
      );
      if (matches) return preset.id;
    }
    return null;
  }, [appliedFilters]);

  const filteredAndSortedStocks = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const minCashYield = parseOptionalNumber(appliedFilters.minCashYield);
    const minTotalYield = parseOptionalNumber(appliedFilters.minTotalYield);
    const minPayoutRatio = parseOptionalNumber(appliedFilters.minPayoutRatio);
    const maxPayoutRatio = parseOptionalNumber(appliedFilters.maxPayoutRatio);
    const minDivCount10Y = parseOptionalNumber(appliedFilters.minDivCount10Y);
    const minAvgDiv10Y = parseOptionalNumber(appliedFilters.minAvgDiv10Y);
    const maxPeRatio = parseOptionalNumber(appliedFilters.maxPeRatio);
    const maxPbRatio = parseOptionalNumber(appliedFilters.maxPbRatio);
    const minInsiderHolding = parseOptionalNumber(appliedFilters.minInsiderHolding);
    const minEpsProgress = parseOptionalNumber(appliedFilters.minEpsProgress);
    const minExpectedYield = parseOptionalNumber(appliedFilters.minExpectedYield);
    const exMonth = appliedFilters.exDividendMonth
      ? Number.parseInt(appliedFilters.exDividendMonth, 10)
      : null;

    const filtered = allStocks.filter((s) => {
      if (appliedFilters.market && (s.market || '上市') !== appliedFilters.market) {
        return false;
      }
      if (appliedFilters.qualityDividendOnly) {
        const positiveEps =
          typeof s.epsLastYear === 'number' &&
          s.epsLastYear > 0 &&
          typeof s.epsQ1 === 'number' &&
          s.epsQ1 > 0 &&
          typeof s.epsQ2 === 'number' &&
          s.epsQ2 > 0 &&
          typeof s.epsQ3 === 'number' &&
          s.epsQ3 > 0;
        if (!positiveEps) return false;
        if (typeof s.epsProgressRatio !== 'number' || s.epsProgressRatio <= 0.75) return false;
        if (typeof s.payoutRatio !== 'number' || s.payoutRatio <= 0 || s.payoutRatio > 100) {
          return false;
        }
        if (typeof s.expectedYield !== 'number' || s.expectedYield < 5) return false;
      }

      if (kw) {
        const matchesKeyword =
          s.code.toLowerCase().includes(kw) ||
          s.name.toLowerCase().includes(kw) ||
          (s.market ? s.market.toLowerCase().includes(kw) : false) ||
          (s.category ? s.category.toLowerCase().includes(kw) : false) ||
          (s.industry ? s.industry.toLowerCase().includes(kw) : false) ||
          (s.sectorGroup ? s.sectorGroup.toLowerCase().includes(kw) : false);
        if (!matchesKeyword) return false;
      }

      if (minCashYield !== null && (s.cashYield === null || s.cashYield < minCashYield)) {
        return false;
      }
      if (minTotalYield !== null && (s.totalYield === null || s.totalYield < minTotalYield)) {
        return false;
      }
      if (minPayoutRatio !== null && (s.payoutRatio === null || s.payoutRatio < minPayoutRatio)) {
        return false;
      }
      if (maxPayoutRatio !== null && (s.payoutRatio === null || s.payoutRatio > maxPayoutRatio)) {
        return false;
      }
      if (minDivCount10Y !== null && (s.divCount10Y === null || s.divCount10Y < minDivCount10Y)) {
        return false;
      }
      if (minAvgDiv10Y !== null && (s.avgDiv10Y === null || s.avgDiv10Y < minAvgDiv10Y)) {
        return false;
      }
      if (maxPeRatio !== null && (s.peRatio === null || s.peRatio > maxPeRatio)) {
        return false;
      }
      if (maxPbRatio !== null && (s.pbRatio === null || s.pbRatio > maxPbRatio)) {
        return false;
      }
      if (
        minInsiderHolding !== null &&
        (s.insiderHolding === null || s.insiderHolding < minInsiderHolding)
      ) {
        return false;
      }
      if (
        minEpsProgress !== null &&
        (s.epsProgressRatio === null || s.epsProgressRatio === undefined || s.epsProgressRatio < minEpsProgress)
      ) {
        return false;
      }
      if (
        minExpectedYield !== null &&
        (s.expectedYield === null || s.expectedYield === undefined || s.expectedYield < minExpectedYield)
      ) {
        return false;
      }
      if (exMonth !== null) {
        const stockMonth = extractMonthFromDate(s.exDividendDate);
        if (stockMonth !== exMonth) return false;
      }

      return true;
    });

    const sortCol = TABLE_COLUMNS.find((c) => c.key === sortConfig.key);
    const dirMultiplier = sortConfig.direction === 'asc' ? 1 : -1;

    return [...filtered].sort((a, b) => {
      const valA = a[sortConfig.key];
      const valB = b[sortConfig.key];

      if (sortCol?.type === 'date') {
        const emptyA = !valA || valA === '-';
        const emptyB = !valB || valB === '-';
        if (emptyA && emptyB) return 0;
        if (emptyA) return 1;
        if (emptyB) return -1;
        return compareDateString(String(valA), String(valB)) * dirMultiplier;
      }

      if (sortCol?.type === 'code') {
        return String(valA).localeCompare(String(valB), 'en', { numeric: true }) * dirMultiplier;
      }

      if (sortCol?.type === 'text' || sortCol?.type === 'market') {
        return String(valA || '').localeCompare(String(valB || ''), 'zh-Hant-TW') * dirMultiplier;
      }

      // Numeric columns: push null / missing values to the bottom in both asc & desc
      const nullA = valA === null || valA === undefined;
      const nullB = valB === null || valB === undefined;
      if (nullA && nullB) return 0;
      if (nullA) return 1;
      if (nullB) return -1;

      return (Number(valA) - Number(valB)) * dirMultiplier;
    });
  }, [allStocks, keyword, appliedFilters, sortConfig]);

  const summaryStats = useMemo(() => {
    const validCashYields = filteredAndSortedStocks
      .map((s) => s.cashYield)
      .filter((v): v is number => typeof v === 'number');

    const avgCashYield =
      validCashYields.length > 0
        ? validCashYields.reduce((sum, v) => sum + v, 0) / validCashYields.length
        : 0;

    const overFiveCount = validCashYields.filter((v) => v > 5).length;
    const activeColLabel =
      TABLE_COLUMNS.find((c) => c.key === sortConfig.key)?.label ?? sortConfig.key;

    return {
      avgCashYield,
      overFiveCount,
      activeColLabel,
    };
  }, [filteredAndSortedStocks, sortConfig]);

  const handleLoadCustomData = useCallback((records: StockRecord[], filename: string) => {
    setAllStocks(records);
    setDataSourceLabel(filename);
    setKeyword('');
    setDraftFilters({ ...EMPTY_FILTERS });
    setAppliedFilters({ ...EMPTY_FILTERS });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-slate-900">
      {/* Top Bar: Clean 3-Zone Contract */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-[1720px] mx-auto px-4 lg:px-6 min-h-14 py-1.5 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Wordmark + Author Credit */}
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleResetFilters();
              }}
              className="text-[17px] font-bold tracking-tight text-[#1B365D] whitespace-nowrap shrink-0"
            >
              台股殖利率小幫手2026
            </a>
            <span className="text-[11px] font-normal text-slate-400 tracking-normal whitespace-pre">
              {'Author: Might.LAI  Development Tools: Google Antigravity'}
            </span>
          </div>

          {/* Zone 2: Concise Single-Line Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-slate-600">
            <button
              type="button"
              onClick={() => handleApplyPreset('all')}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              殖利率總表
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('high-yield-5')}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              高息 5%+
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset('steady-10y')}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              10年存股
            </button>
            <button
              type="button"
              onClick={() => setIsDataModalOpen(true)}
              className="hover:text-[#1B365D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              資料格式與更新
            </button>
          </nav>

          {/* Zone 3: Actions (Theme Toggle & Load JSON) */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
              title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsDataModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#1B365D] hover:bg-[#132847] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>載入 JSON</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main High-Density Widescreen Workspace */}
      <main id="top" className="flex-1 max-w-[1720px] w-full mx-auto px-4 lg:px-6 py-4 flex flex-col gap-3">
        {/* Data Freshness & Price Date Bar */}
        <div
          id="data-freshness-bar"
          className="bg-slate-50/90 border border-slate-200 border-l-4 border-l-[#1B365D] rounded-lg px-4 py-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <Calendar className="w-3.5 h-3.5 text-[#1B365D] shrink-0" aria-hidden="true" />
              <span className="font-semibold text-[#1B365D]">資料更新日期：</span>
              <strong id="meta-updated-date" className="font-mono tabular-nums font-bold text-slate-900">
                {stocksMeta ? formatDateWithWeekday(stocksMeta.updatedAt || stocksMeta.updatedDate) : '內建備援資料'}
              </strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-700">
              <span className="font-semibold text-[#1B365D]">收盤股價日期：</span>
              <strong id="meta-price-date" className="font-mono tabular-nums font-bold text-slate-900">
                {stocksMeta ? formatDateWithWeekday(stocksMeta.priceDate) : '-'}
              </strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-slate-500">
            <span>
              財報基準：
              <span className="font-mono tabular-nums text-slate-700 font-medium">
                {stocksMeta?.epsPeriod || '-'}
              </span>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              {stocksMeta?.listedCount != null && stocksMeta?.otcCount != null && stocksMeta?.total != null
                ? `上市 ${stocksMeta.listedCount} · 上櫃 ${stocksMeta.otcCount}（合計 ${stocksMeta.total} 檔）`
                : `共 ${allStocks.length} 檔`}
            </span>
          </div>
        </div>

        {/* Top Multi-Condition Filter Panel */}
        <FilterPanel
          keyword={keyword}
          onKeywordChange={setKeyword}
          draftFilters={draftFilters}
          onDraftChange={handleDraftChange}
          hasUnappliedChanges={hasUnappliedChanges}
          activeFilterCount={activeFilterCount}
          activePresetId={activePresetId}
          onApplyPreset={handleApplyPreset}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          onExportCsv={() => exportStocksToCsv(filteredAndSortedStocks)}
          resultCount={filteredAndSortedStocks.length}
        />

        {/* Quiet Inline Summary Metadata Strip (Zero-Pill Typography) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              篩選結果：
              <strong className="font-mono tabular-nums text-slate-900">
                {filteredAndSortedStocks.length}
              </strong>{' '}
              / <span className="font-mono tabular-nums">{allStocks.length}</span> 檔
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              平均現金殖利率{' '}
              <strong className="font-mono tabular-nums text-slate-900">
                {summaryStats.avgCashYield.toFixed(2)}%
              </strong>
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              現金殖利率 &gt; 5% 共{' '}
              <strong className="font-mono tabular-nums text-[#991B1B]">
                {summaryStats.overFiveCount}
              </strong>{' '}
              檔（深紅字體標示）
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>
              排序：{summaryStats.activeColLabel}（{sortConfig.direction === 'desc' ? '降冪 ▼' : '升冪 ▲'}）
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>資料來源：{dataSourceLabel}</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>共 40 欄（可橫向捲動，左側市場、代號與公司固定）</span>
          </div>
        </div>

        {/* Main 23-Column Sortable Data Table */}
        <StockTable
          rows={filteredAndSortedStocks}
          loading={loading}
          sortConfig={sortConfig}
          onSort={handleSort}
          onResetFilters={handleResetFilters}
        />
      </main>

      {/* Quiet Minimal Footer */}
      <footer className="max-w-[1720px] w-full mx-auto px-4 lg:px-6 py-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <span>資料基準：2026 年 11 月公開財報與市場資訊（可每日覆寫 stocks.json 自動更新），實際交易請以證交所及公開資訊觀測站為準。</span>
        <span>點擊任一欄位標題皆可切換升冪 / 降冪排序</span>
      </footer>

      {/* JSON Schema & Local File Loader Modal */}
      <DataGuideModal
        isOpen={isDataModalOpen}
        onClose={() => setIsDataModalOpen(false)}
        dataSourceLabel={dataSourceLabel}
        recordCount={allStocks.length}
        onLoadCustomData={handleLoadCustomData}
        onReloadDefaultJson={loadDefaultJson}
      />
    </div>
  );
}
