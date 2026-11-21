import React, { useRef, useState } from 'react';
import { Check, Copy, FileJson, RefreshCw, Upload, X } from 'lucide-react';
import { StockRecord } from '../types/stock';

interface DataGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSourceLabel: string;
  recordCount: number;
  onLoadCustomData: (records: StockRecord[], filename: string) => void;
  onReloadDefaultJson: () => void;
}

const PYTHON_SNIPPET = `import json
import requests

# 1. 從臺灣證券交易所 OpenAPI 抓取最新每日收盤價與本益比／淨值比
day_all = requests.get("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL", timeout=15).json()
bwibbu = requests.get("https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL", timeout=15).json()

price_map = {r["Code"]: float(r["ClosingPrice"]) for r in day_all if r.get("ClosingPrice")}
val_map = {r["Code"]: r for r in bwibbu}

# 2. 結合 FinMind / MOPS 季報 EPS 與股利資料後，輸出為 23 欄位標準格式
stocks = [
    {
        "code": "2454",
        "name": "聯發科",
        "cashDividend": 53.5,
        "exDividendDate": "2026/07/07",
        "stockDividend": 0.0,
        "exRightsDate": "-",
        "price": price_map.get("2454", 3780.0),
        "cashYield": round(53.5 / price_map.get("2454", 3780.0) * 100, 2),
        "totalYield": round(53.5 / price_map.get("2454", 3780.0) * 100, 2),
        "payDate": "2026/07/31",
        "payoutRatio": 80.86,
        "insiderHolding": 5.72,
        "avgDiv3Y": 54.17,
        "avgDiv6Y": 53.08,
        "avgDiv10Y": 38.65,
        "divCount10Y": 10,
        "epsQ1": 15.17,
        "epsQ2": 15.28,
        "epsQ3": 17.50,
        "epsYTD": 47.95,
        "epsLastYear": 66.16,
        "peRatio": float(val_map.get("2454", {}).get("PEratio") or 60.63),
        "pbRatio": float(val_map.get("2454", {}).get("PBratio") or 13.45),
    }
]

with open("public/stocks.json", "w", encoding="utf-8") as f:
    json.dump(stocks, f, ensure_ascii=False, indent=2)
`;

export const DataGuideModal: React.FC<DataGuideModalProps> = ({
  isOpen,
  onClose,
  dataSourceLabel,
  recordCount,
  onLoadCustomData,
  onReloadDefaultJson,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setErrorMsg('JSON 內容必須為非空的陣列（Array）格式。');
        return;
      }
      const valid = parsed.every(
        (item) => item && typeof item.code === 'string' && typeof item.name === 'string'
      );
      if (!valid) {
        setErrorMsg('每筆資料至少需包含字串類型的 code（代號）與 name（公司）欄位。');
        return;
      }
      onLoadCustomData(parsed as StockRecord[], file.name);
      onClose();
    } catch {
      setErrorMsg('無法解析 JSON 檔案，請確認格式是否正確（UTF-8 編碼）。');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCopySnippet = async () => {
    try {
      await navigator.clipboard.writeText(PYTHON_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="data-guide-title"
    >
      <div className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <FileJson className="w-4 h-4 text-[#1B365D]" aria-hidden="true" />
            <h2 id="data-guide-title" className="text-sm font-bold text-slate-900">
              JSON 資料來源與 Python 每日自動更新說明
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉視窗"
            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Current Source & Local Preview Upload */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-slate-600">
                目前資料來源：<strong className="text-slate-900">{dataSourceLabel}</strong>
                <span className="mx-1.5" aria-hidden="true">·</span>
                共 <span className="font-mono tabular-nums font-semibold text-slate-900">{recordCount}</span> 檔標的
              </div>
              <button
                type="button"
                onClick={() => {
                  onReloadDefaultJson();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>重新載入預設 stocks.json</span>
              </button>
            </div>

            <div className="border border-dashed border-slate-300 bg-slate-50 rounded-md p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">即時匯入本機 JSON 測試</p>
                <p className="text-slate-500 mt-0.5">
                  可直接選取您由 Python 產出的 <code className="font-mono">stocks.json</code> 檔案，在瀏覽器中立即預覽篩選與排序。
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-semibold text-white bg-[#1B365D] hover:bg-[#132847] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                <span>選擇 JSON 檔案</span>
              </button>
            </div>

            {errorMsg && (
              <p className="text-red-700 font-medium" role="alert">
                {errorMsg}
              </p>
            )}
          </div>

          {/* Python Auto-Update Example */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">
                Python 每日覆寫範例（對應 23 個表格欄位）
              </p>
              <button
                type="button"
                onClick={handleCopySnippet}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                    <span>已複製</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>複製程式碼</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-slate-500 leading-relaxed">
              頁面載入時會自動向同目錄的 <code className="font-mono text-slate-800">/stocks.json</code> 讀取資料（同時亦在程式碼中保留獨立的 <code className="font-mono text-slate-800">stocksData</code> 陣列作為備援）。ETF 若無 EPS 或本益比，數值欄位填入 <code className="font-mono text-slate-800">null</code>、日期填入 <code className="font-mono text-slate-800">&quot;-&quot;</code> 即可。
            </p>
            <pre className="bg-slate-900 text-slate-100 font-mono text-[11px] leading-relaxed p-3.5 rounded-md overflow-x-auto">
              <code>{PYTHON_SNIPPET}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
