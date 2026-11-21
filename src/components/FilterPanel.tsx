import React from 'react';
import { Download, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { FILTER_PRESETS } from '../data/stocksData';
import { NumericFilterCriteria } from '../types/stock';

interface FilterPanelProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  draftFilters: NumericFilterCriteria;
  onDraftChange: (field: keyof NumericFilterCriteria, value: string) => void;
  hasUnappliedChanges: boolean;
  activeFilterCount: number;
  activePresetId: string | null;
  onApplyPreset: (presetId: string) => void;
  onApplyFilters: () => void;
  onResetFilters: () => void;
  onExportCsv: () => void;
  resultCount: number;
}

interface NumericFieldSpec {
  key: keyof Omit<NumericFilterCriteria, 'exDividendMonth' | 'market' | 'qualityDividendOnly'>;
  label: string;
  operator: '>=' | '<=';
  unit: string;
  placeholder: string;
  step: string;
}

const NUMERIC_FIELDS: NumericFieldSpec[] = [
  {
    key: 'minCashYield',
    label: '現金殖利率',
    operator: '>=',
    unit: '%',
    placeholder: '例 5',
    step: '0.1',
  },
  {
    key: 'minTotalYield',
    label: '合計殖利率',
    operator: '>=',
    unit: '%',
    placeholder: '例 5',
    step: '0.1',
  },
  {
    key: 'minPayoutRatio',
    label: '配息率下限',
    operator: '>=',
    unit: '%',
    placeholder: '例 50',
    step: '0.1',
  },
  {
    key: 'maxPayoutRatio',
    label: '配息率上限',
    operator: '<=',
    unit: '%',
    placeholder: '例 100',
    step: '0.1',
  },
  {
    key: 'minDivCount10Y',
    label: '10年股利次數',
    operator: '>=',
    unit: '次',
    placeholder: '例 10',
    step: '1',
  },
  {
    key: 'minAvgDiv10Y',
    label: '10年平均股利',
    operator: '>=',
    unit: '元',
    placeholder: '例 1.5',
    step: '0.1',
  },
  {
    key: 'maxPeRatio',
    label: '本益比',
    operator: '<=',
    unit: '倍',
    placeholder: '例 18',
    step: '0.5',
  },
  {
    key: 'maxPbRatio',
    label: '股價淨值比',
    operator: '<=',
    unit: '倍',
    placeholder: '例 2',
    step: '0.1',
  },
  {
    key: 'minInsiderHolding',
    label: '董監持股',
    operator: '>=',
    unit: '%',
    placeholder: '例 10',
    step: '0.5',
  },
  {
    key: 'minEpsProgress',
    label: '業績進度(X)',
    operator: '>=',
    unit: '倍',
    placeholder: '例 0.75',
    step: '0.05',
  },
  {
    key: 'minExpectedYield',
    label: '預期殖利率(B)',
    operator: '>=',
    unit: '%',
    placeholder: '例 5',
    step: '0.1',
  },
];

const MONTHS = Array.from({ length: 12 }, (_, idx) => idx + 1);

export const FilterPanel: React.FC<FilterPanelProps> = ({
  keyword,
  onKeywordChange,
  draftFilters,
  onDraftChange,
  hasUnappliedChanges,
  activeFilterCount,
  activePresetId,
  onApplyPreset,
  onApplyFilters,
  onResetFilters,
  onExportCsv,
  resultCount,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilters();
  };

  return (
    <section
      aria-label="多條件複合篩選面板"
      className="bg-white border border-slate-200 rounded-lg px-4 py-3.5"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Top Row: Instant Keyword Search + Market Select + Quick Presets */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 flex-1">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => onKeywordChange(e.target.value)}
                placeholder="輸入代號或公司名稱即時過濾（例：2330、金、高股息）"
                aria-label="關鍵字搜尋代號或公司名稱"
                className="w-full h-9 pl-9 pr-8 text-sm bg-slate-50 border border-slate-300 rounded-md text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1B365D]/20 focus:border-[#1B365D] transition-colors"
              />
              {keyword && (
                <button
                  type="button"
                  onClick={() => onKeywordChange('')}
                  aria-label="清除搜尋關鍵字"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 text-xs font-semibold rounded"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md shrink-0" role="group" aria-label="市場篩選">
              {(['', '上市', '上櫃'] as const).map((mVal) => {
                const isActive = draftFilters.market === mVal;
                return (
                  <button
                    key={mVal || 'all'}
                    type="button"
                    onClick={() => onDraftChange('market', mVal)}
                    className={`px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                      isActive ? 'bg-white text-[#1B365D] shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mVal || '全部市場'}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 overflow-x-auto bg-slate-100 p-1 rounded-md"
            role="group"
            aria-label="常用篩選策略"
          >
            {FILTER_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              const isQuality = preset.id === 'quality-dividend';
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onApplyPreset(preset.id)}
                  title={
                    isQuality
                      ? '條件：去年與今年Q1~Q3 EPS皆>0、業績進度(X)>0.75、今年配息率<=100%、明年預期殖利率(B)>=5%'
                      : undefined
                  }
                  className={
                    isQuality
                      ? `px-3 py-1 text-xs font-bold border-2 rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isActive
                            ? 'text-blue-900 bg-blue-200/90 border-blue-700 shadow-xs'
                            : 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-500'
                        }`
                      : `px-2.5 py-1 text-xs font-medium rounded whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-white text-[#1B365D] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`
                  }
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle Row: 12 Composite Filter Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-12 gap-2.5 pt-2.5 border-t border-slate-100">
          {NUMERIC_FIELDS.map((field) => (
            <label key={field.key} className="block">
              <span className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1 whitespace-nowrap">
                <span>{field.label}</span>
                <span className="font-mono text-[11px] text-slate-400">{field.operator}</span>
              </span>
              <div className="relative flex items-center">
                <input
                  type="number"
                  step={field.step}
                  min="0"
                  value={draftFilters[field.key]}
                  onChange={(e) => onDraftChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full h-8 pl-2.5 pr-7 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1B365D]/20 focus:border-[#1B365D] transition-colors"
                />
                <span className="absolute right-2 text-[11px] text-slate-400 pointer-events-none select-none">
                  {field.unit}
                </span>
              </div>
            </label>
          ))}

          {/* Ex-Dividend Month Dropdown */}
          <label className="block">
            <span className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1 whitespace-nowrap">
              <span>除息月份</span>
              <span className="text-[11px] text-slate-400">月</span>
            </span>
            <select
              value={draftFilters.exDividendMonth}
              onChange={(e) => onDraftChange('exDividendMonth', e.target.value)}
              aria-label="除息月份"
              className="w-full h-8 px-2 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B365D]/20 focus:border-[#1B365D] transition-colors cursor-pointer"
            >
              <option value="">全部月份</option>
              {MONTHS.map((m) => (
                <option key={m} value={String(m)}>
                  {m}月
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Bottom Action Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              {activeFilterCount > 0
                ? `目前已啟用 ${activeFilterCount} 項篩選條件`
                : '尚未設定數值或月份篩選條件'}
            </span>
            {hasUnappliedChanges && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-medium">
                  條件已修改，請按「套用篩選」或 Enter 更新表格
                </span>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1B365D] hover:bg-[#132847] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B365D]"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>套用篩選</span>
            </button>

            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>清除條件</span>
            </button>

            <button
              type="button"
              onClick={onExportCsv}
              disabled={resultCount === 0}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium text-slate-800 bg-slate-100 border border-slate-300 hover:bg-slate-200/80 disabled:opacity-45 disabled:cursor-not-allowed rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>匯出目前結果為 CSV</span>
            </button>
          </div>
        </div>
      </form>
    </section>
  );
};
