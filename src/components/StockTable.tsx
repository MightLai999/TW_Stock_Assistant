import React from 'react';
import { formatCellValue, TABLE_COLUMNS } from '../data/stocksData';
import { SortConfig, StockColumnKey, StockRecord } from '../types/stock';

interface StockTableProps {
  rows: StockRecord[];
  loading: boolean;
  sortConfig: SortConfig;
  onSort: (key: StockColumnKey) => void;
  onResetFilters: () => void;
}

export const StockTable: React.FC<StockTableProps> = ({
  rows,
  loading,
  sortConfig,
  onSort,
  onResetFilters,
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col">
      <div className="table-scroll overflow-auto max-h-[calc(100vh-305px)] min-h-[420px]">
        <table className="w-max min-w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              {TABLE_COLUMNS.map((col, idx) => {
                const isSorted = sortConfig.key === col.key;
                const isSticky = col.stickyLeft !== undefined;
                const isLastSticky = idx === 2;

                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={
                      isSorted
                        ? sortConfig.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                    }
                    style={isSticky ? { left: `${col.stickyLeft}px` } : undefined}
                    className={`sticky top-0 select-none border-b border-slate-300 p-0 whitespace-nowrap transition-colors ${
                      col.minWidth
                    } ${isSticky ? 'z-30' : 'z-20'} ${
                      isLastSticky
                        ? 'border-r border-slate-400/70 shadow-[3px_0_6px_-3px_rgba(15,23,42,0.18)]'
                        : 'border-r border-slate-200/20'
                    } ${
                      isSorted
                        ? 'bg-[#122642] text-white'
                        : 'bg-[#1E3A5F] text-slate-100 hover:bg-[#173050]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={`w-full h-10 px-2.5 flex items-center gap-1 font-semibold text-xs tracking-wide cursor-pointer focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-white ${
                        col.align === 'right'
                          ? 'justify-end'
                          : col.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                      }`}
                      title={`點擊以「${col.label}」切換升冪 / 降冪排序`}
                    >
                      <span>{col.label}</span>
                      <span
                        className="inline-flex flex-col leading-none text-[8px] ml-0.5"
                        aria-hidden="true"
                      >
                        <span
                          className={
                            isSorted && sortConfig.direction === 'asc'
                              ? 'text-amber-300 opacity-100'
                              : 'text-slate-300 opacity-35'
                          }
                        >
                          ▲
                        </span>
                        <span
                          className={
                            isSorted && sortConfig.direction === 'desc'
                              ? 'text-amber-300 opacity-100'
                              : 'text-slate-300 opacity-35'
                          }
                        >
                          ▼
                        </span>
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: 12 }).map((_, rowIdx) => (
                <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}>
                  {TABLE_COLUMNS.map((col, colIdx) => {
                    const isSticky = col.stickyLeft !== undefined;
                    const isLastSticky = colIdx === 2;
                    return (
                      <td
                        key={col.key}
                        style={isSticky ? { left: `${col.stickyLeft}px` } : undefined}
                        className={`h-[38px] px-2.5 border-b border-slate-200/80 ${
                          isSticky
                            ? `sticky z-10 ${rowIdx % 2 === 0 ? 'bg-white' : 'bg-[#F8FAFC]'}`
                            : ''
                        } ${isLastSticky ? 'border-r border-slate-300' : ''}`}
                      >
                        <div className="h-3.5 bg-slate-200/70 rounded animate-pulse w-4/5 ml-auto" />
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={TABLE_COLUMNS.length} className="py-16 px-6 text-center bg-white">
                  <div className="max-w-sm mx-auto space-y-3">
                    <p className="text-sm font-semibold text-slate-800">
                      沒有符合目前篩選條件的台股標的
                    </p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      請嘗試放寬殖利率、本益比、除息月份或關鍵字條件，即可重新檢視資料表。
                    </p>
                    <button
                      type="button"
                      onClick={onResetFilters}
                      className="inline-flex items-center justify-center h-9 px-4 text-xs font-semibold text-white bg-[#1B365D] hover:bg-[#132847] rounded-md transition-colors cursor-pointer"
                    >
                      清除所有篩選條件
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((stock, rowIdx) => {
                const isEven = rowIdx % 2 === 0;
                const rowBg = isEven ? 'bg-white' : 'bg-[#F8FAFC]';

                return (
                  <tr
                    key={stock.code}
                    className={`group ${rowBg} hover:bg-[#EDF4FF] transition-colors duration-100`}
                  >
                    {TABLE_COLUMNS.map((col, colIdx) => {
                      const isSticky = col.stickyLeft !== undefined;
                      const isLastSticky = colIdx === 2;
                      const isSortedCol = sortConfig.key === col.key;
                      const rawValue = stock[col.key];
                      const formatted = formatCellValue(stock, col);

                      const isHighCashYield =
                        col.isHighYieldCol &&
                        typeof rawValue === 'number' &&
                        rawValue > 5;

                      const isNegativeNum =
                        (col.type === 'number' || col.type === 'percent') &&
                        typeof rawValue === 'number' &&
                        rawValue < 0;

                      const isEmptyDash = formatted === '-';
                      const bench = (stock.epsQuarters || 3) / 4;

                      let textClass = 'text-slate-700';
                      if (col.key === 'market') {
                        textClass =
                          formatted === '上櫃'
                            ? 'text-[#0F766E] font-medium'
                            : 'text-[#1B365D] font-medium';
                      } else if (col.key === 'code') {
                        textClass = 'font-mono tabular-nums font-semibold text-[#1B365D]';
                      } else if (col.key === 'name') {
                        textClass = 'font-medium text-slate-900';
                      } else if (col.key === 'capReserveStockDiv') {
                        textClass =
                          typeof rawValue === 'number' && rawValue > 0
                            ? 'font-mono tabular-nums font-semibold text-amber-700'
                            : isEmptyDash
                            ? 'font-mono text-slate-300'
                            : 'font-mono tabular-nums text-slate-400';
                      } else if (col.key === 'epsProgressRatio' && typeof rawValue === 'number') {
                        textClass =
                          rawValue > bench
                            ? 'font-mono tabular-nums font-semibold text-[#991B1B]'
                            : rawValue < bench
                            ? 'font-mono tabular-nums text-emerald-700'
                            : 'font-mono tabular-nums text-slate-800';
                      } else if (isHighCashYield) {
                        // Explicitly highlight yield > 5% in deep crimson red
                        textClass = 'font-mono tabular-nums font-bold text-[#991B1B]';
                      } else if (isNegativeNum) {
                        textClass = 'font-mono tabular-nums text-emerald-700';
                      } else if (isEmptyDash) {
                        textClass = 'font-mono text-slate-300';
                      } else if (col.type !== 'text') {
                        textClass = 'font-mono tabular-nums text-slate-800';
                      }

                      const stickyBgClass = isSticky
                        ? `sticky z-10 ${rowBg} group-hover:bg-[#EDF4FF]`
                        : isSortedCol
                        ? 'bg-[#1B365D]/[0.03] group-hover:bg-[#EDF4FF]'
                        : '';

                      let titleText: string | undefined;
                      if (isHighCashYield) {
                        titleText = `${stock.name} ${col.label} ${formatted}（大於 5%）`;
                      } else if (col.key === 'name' && stock.category) {
                        titleText = `${stock.code} ${stock.name}（${stock.category}）`;
                      } else if (col.key === 'realYield' && stock.preExPrice) {
                        titleText = `依除息前一日收盤價 ${stock.preExPrice} 元計算`;
                      } else if (col.key === 'epsProgressRatio' && typeof rawValue === 'number') {
                        titleText = `今年累積EPS ${stock.epsYTD} ÷ 去年EPS ${stock.epsLastYear}（基準 ${bench.toFixed(2)}）`;
                      }

                      return (
                        <td
                          key={col.key}
                          style={isSticky ? { left: `${col.stickyLeft}px` } : undefined}
                          title={titleText}
                          className={`h-[38px] px-2.5 border-b border-slate-200/80 whitespace-nowrap transition-colors duration-100 ${
                            col.minWidth
                          } ${
                            col.align === 'right'
                              ? 'text-right'
                              : col.align === 'center'
                              ? 'text-center'
                              : 'text-left'
                          } ${stickyBgClass} ${
                            isLastSticky
                              ? 'border-r border-slate-300 shadow-[3px_0_6px_-3px_rgba(15,23,42,0.12)]'
                              : 'border-r border-slate-100'
                          } ${textClass}`}
                        >
                          {formatted}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
