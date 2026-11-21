#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
TW_Stock_Assistant - 全台股（上市 + 上櫃 + ETF）真實資料抓取與計算腳本
資料來源（全部採用官方批量端點 + 十年歷史快取）：
1. 臺灣證券交易所 (TWSE OpenAPI / OpenData / RWD)
   - t187ap03_L: 全市場上市公司基本資料（代號、簡稱、產業別、發行股數）
   - STOCK_DAY_ALL: 上市全市場每日收盤價（含上市 ETF）
   - BWIBBU_ALL: 上市本益比、殖利率、股價淨值比
   - t187ap11_L: 上市公司董監事持股明細
   - t187ap14_L: 上市最新季別 EPS 與中文產業別
   - TWT48U_ALL: 上市除權除息預告表
   - TWT49U: 上市歷年除權除息計算結果表（用於補齊上市 ETF 10 年配息）
2. 證券櫃檯買賣中心 (TPEx OpenAPI / Web)
   - mopsfin_t187ap03_O: 全市場上櫃公司基本資料
   - tpex_mainboard_daily_close_quotes: 上櫃收盤行情（嚴格排除權證，保留公司與上櫃 ETF）
   - tpex_mainboard_peratio_analysis: 上櫃本益比、殖利率、股價淨值比
   - mopsfin_t187ap11_O: 上櫃公司董監事持股明細
   - mopsfin_t187ap14_O: 上櫃最新季別 EPS 與中文產業別
   - tpex_exright_prepost: 上櫃除權除息預告表
   - exDailyQ: 上櫃歷年除權除息計算結果表（用於補齊上櫃 ETF 10 年配息）
3. 公開資訊觀測站 (MOPS mopsov.twse.com.tw)
   - ajax_t163sb04: 上市 / 上櫃全體公司各季綜合損益表累積 EPS（計算單季 1Q/2Q/3Q/去年 EPS）
   - ajax_t108sb27: 上市 / 上櫃全體公司歷年除權息公告（配息、配股、除息日、除權日、發息日）
"""

import argparse
import json
import os
import re
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from html.parser import HTMLParser

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SSL_CTX = ssl._create_unverified_context()

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/html, text/plain, */*",
}

INDUSTRY_CODE_MAP = {
    "01": "水泥工業",
    "02": "食品工業",
    "03": "塑膠工業",
    "04": "紡織纖維",
    "05": "電機機械",
    "06": "電器電纜",
    "07": "化學生技醫療",
    "08": "玻璃陶瓷",
    "09": "造紙工業",
    "10": "鋼鐵工業",
    "11": "橡膠工業",
    "12": "汽車工業",
    "13": "電子工業",
    "14": "建材營造",
    "15": "航運業",
    "16": "觀光餐旅",
    "17": "金融保險業",
    "18": "貿易百貨",
    "19": "綜合",
    "20": "其他",
    "21": "化學工業",
    "22": "生技醫療業",
    "23": "油電燃氣業",
    "24": "半導體業",
    "25": "電腦及週邊設備業",
    "26": "光電業",
    "27": "通信網路業",
    "28": "電子零組件業",
    "29": "電子通路業",
    "30": "資訊服務業",
    "31": "其他電子業",
    "32": "文化創意業",
    "33": "農業科技業",
    "34": "電子商務",
    "35": "綠能環保",
    "36": "數位雲端",
    "37": "運動休閒",
    "38": "居家生活",
    "80": "管理股票",
}


class TableParser(HTMLParser):
    """Lightweight HTML table parser for MOPS bulk responses."""

    def __init__(self):
        super().__init__()
        self.tables = []
        self._table = None
        self._row = None
        self._cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self._table = []
        elif tag == "tr" and self._table is not None:
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None:
            self._row.append("".join(self._cell).strip())
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if any(self._row):
                self._table.append(self._row)
            self._row = None
        elif tag == "table" and self._table is not None:
            if len(self._table) > 1:
                self.tables.append(self._table)
            self._table = None


def fetch_text(url, post_data=None, timeout=25, retries=3):
    """Fetch URL with retry + exponential backoff (1s, 2s, 4s)."""
    data_bytes = urllib.parse.urlencode(post_data).encode("utf-8") if post_data else None
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, data=data_bytes, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as res:
                return res.read().decode("utf-8", errors="replace")
        except Exception as exc:
            last_err = exc
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    print(f"[-] 抓取失敗 ({url[:65]}): {last_err}")
    return None


def fetch_json(url, timeout=25, retries=3):
    raw = fetch_text(url, post_data=None, timeout=timeout, retries=retries)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception as exc:
        print(f"[-] JSON 解析失敗 ({url[:65]}): {exc}")
        return None


def parse_float(val, round_digits=None):
    if val is None:
        return None
    s = str(val).replace(",", "").replace("%", "").strip()
    if s in ("", "-", "--", "---", "N/A", "NaN", "null"):
        return None
    try:
        num = float(s)
        if round_digits is not None:
            return round(num, round_digits)
        return num
    except Exception:
        return None


def parse_roc_date(val):
    """Convert ROC dates like '115/07/07', '115年07月07日', '1150707' or ISO to 'YYYY/MM/DD'."""
    if not val:
        return "-"
    s = str(val).strip()
    if s in ("", "-", "--", "尚未公布"):
        return "-"

    # YYYY/MM/DD or YYYY-MM-DD
    m = re.match(r"^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$", s)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1990 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}/{mo:02d}/{d:02d}"

    # YYY/MM/DD or YYY年MM月DD日
    m = re.match(r"^(\d{2,3})[年/-](\d{1,2})[月/-](\d{1,2})日?$", s)
    if m:
        y = int(m.group(1)) + 1911
        mo, d = int(m.group(2)), int(m.group(3))
        if 1990 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}/{mo:02d}/{d:02d}"

    # Compact 7 digits (YYYMMDD) or 6 digits (YYMMDD)
    digits = re.sub(r"\D", "", s)
    if len(digits) == 7:
        y = int(digits[:3]) + 1911
        mo, d = int(digits[3:5]), int(digits[5:7])
        if 1990 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}/{mo:02d}/{d:02d}"
    elif len(digits) == 8:
        y, mo, d = int(digits[:4]), int(digits[4:6]), int(digits[6:8])
        if 1990 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}/{mo:02d}/{d:02d}"
    elif len(digits) == 6:
        y = int(digits[:2]) + 1911
        mo, d = int(digits[2:4]), int(digits[4:6])
        if 1990 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
            return f"{y:04d}/{mo:02d}/{d:02d}"

    return "-"


def extract_year_from_date(date_str):
    if not date_str or date_str == "-":
        return None
    m = re.match(r"^(\d{4})/", date_str)
    return int(m.group(1)) if m else None


def resolve_industry(raw_ind):
    if not raw_ind:
        return "其他"
    s = str(raw_ind).strip()
    if s in INDUSTRY_CODE_MAP:
        return INDUSTRY_CODE_MAP[s]
    if s.isdigit() and s.zfill(2) in INDUSTRY_CODE_MAP:
        return INDUSTRY_CODE_MAP[s.zfill(2)]
    return s


def compute_insider_holdings(rows, issued_shares_map):
    """
    計算董監事持股比例（%）：
    嚴格過濾掉「代表人」與一般經理人，並依 (公司代號, 姓名) 取最大持股避免法人董事重複計算。
    """
    per_company_names = {}
    for raw in rows:
        r = {str(k).strip(): v for k, v in raw.items()}
        code = str(r.get("公司代號", "")).strip()
        if not code:
            continue
        title = str(r.get("職稱", "")).strip()
        if not (("董事" in title or "監察人" in title) and "代表人" not in title):
            continue
        person = str(r.get("姓名", "")).strip()
        shares = parse_float(r.get("目前持股")) or 0.0
        if shares <= 0 or not person:
            continue
        comp_map = per_company_names.setdefault(code, {})
        if shares > comp_map.get(person, 0.0):
            comp_map[person] = shares

    ratio_map = {}
    for code, names_dict in per_company_names.items():
        issued = issued_shares_map.get(code)
        if issued and issued > 0:
            pct = round((sum(names_dict.values()) / issued) * 100.0, 2)
            if 0.0 <= pct <= 100.0:
                ratio_map[code] = pct
    return ratio_map


def fetch_mops_eps_bulk(typek, roc_year, season):
    """抓取 MOPS 單一市場單季綜合損益表（t163sb04）全公司累積 EPS。"""
    url = "https://mopsov.twse.com.tw/mops/web/ajax_t163sb04"
    html = fetch_text(
        url,
        post_data={
            "encodeURIComponent": "1",
            "step": "1",
            "firstin": "1",
            "off": "1",
            "isQuery": "Y",
            "TYPEK": typek,
            "year": str(roc_year),
            "season": f"{season:02d}",
        },
        timeout=30,
    )
    eps_map = {}
    if not html:
        return eps_map
    parser = TableParser()
    parser.feed(html)
    for tbl in parser.tables:
        header = tbl[0]
        eps_idx = next((i for i, h in enumerate(header) if "基本每股盈餘" in h), None)
        if eps_idx is None:
            continue
        for row in tbl[1:]:
            if len(row) <= eps_idx:
                continue
            code = row[0].strip()
            if not code or not code[0].isdigit():
                continue
            val = parse_float(row[eps_idx], round_digits=2)
            if val is not None:
                eps_map[code] = val
    return eps_map


def fetch_mops_dividends_bulk(typek, roc_year, valid_codes):
    """抓取 MOPS 全體上市/上櫃歷年除權息公告（t108sb27）。"""
    url = "https://mopsov.twse.com.tw/mops/web/ajax_t108sb27"
    html = fetch_text(
        url,
        post_data={
            "encodeURIComponent": "1",
            "step": "1",
            "firstin": "1",
            "off": "1",
            "isQuery": "Y",
            "TYPEK": typek,
            "year": str(roc_year),
        },
        timeout=30,
    )
    events_by_code = {}
    if not html:
        return events_by_code
    parser = TableParser()
    parser.feed(html)
    if not parser.tables:
        return events_by_code

    tbl = max(parser.tables, key=len)
    for row in tbl:
        if len(row) < 12:
            continue
        code = row[0].strip()
        if not code or code not in valid_codes:
            continue

        record_date = parse_roc_date(row[3])
        stock_earn = parse_float(row[4]) or 0.0
        stock_cap = parse_float(row[5]) or 0.0
        stock_div = round(stock_earn + stock_cap, 4)
        ex_rights_date = parse_roc_date(row[6])

        cash_earn = parse_float(row[7]) or 0.0
        cash_cap = parse_float(row[8]) or 0.0
        cash_div = round(cash_earn + cash_cap, 4)
        ex_div_date = parse_roc_date(row[10])
        pay_date = parse_roc_date(row[11])

        if cash_div <= 0 and stock_div <= 0:
            continue

        event_year = (
            extract_year_from_date(ex_div_date)
            or extract_year_from_date(ex_rights_date)
            or extract_year_from_date(record_date)
            or (roc_year + 1911)
        )

        events_by_code.setdefault(code, []).append(
            {
                "y": event_year,
                "cash": cash_div,
                "stock": stock_div,
                "stockCap": round(stock_cap, 4),
                "cashCap": round(cash_cap, 4),
                "exD": ex_div_date,
                "exR": ex_rights_date,
                "pay": pay_date,
            }
        )
    return events_by_code


def fetch_twse_etf_dividends(year_ad, etf_codes, pre_ex_price_out=None):
    """抓取 TWSE TWT49U 上市歷年除權除息計算結果表（含除權息前收盤價與 ETF 配息）。"""
    url = (
        f"https://www.twse.com.tw/rwd/zh/exRight/TWT49U"
        f"?startDate={year_ad}0101&endDate={year_ad}1231&response=json"
    )
    data = fetch_json(url, timeout=25)
    events_by_code = {}
    if not data or not isinstance(data, dict):
        return events_by_code
    for row in data.get("data", []):
        if len(row) < 7:
            continue
        code = str(row[1]).strip()
        ex_date = parse_roc_date(row[0])
        if pre_ex_price_out is not None and code and ex_date != "-":
            pre_price = parse_float(row[3], round_digits=2)
            if pre_price and pre_price > 0:
                pre_ex_price_out[(code, ex_date)] = pre_price

        if code not in etf_codes:
            continue
        kind = str(row[6]).strip()
        amt = parse_float(row[5]) or 0.0
        if amt <= 0:
            continue
        is_cash = "息" in kind
        is_stock = "權" in kind
        if not is_cash and not is_stock:
            continue
        events_by_code.setdefault(code, []).append(
            {
                "y": extract_year_from_date(ex_date) or year_ad,
                "cash": round(amt, 4) if is_cash and not is_stock else 0.0,
                "stock": round(amt, 4) if is_stock and not is_cash else 0.0,
                "stockCap": 0.0,
                "cashCap": 0.0,
                "exD": ex_date if is_cash else "-",
                "exR": ex_date if is_stock else "-",
                "pay": "-",
            }
        )
    return events_by_code


def fetch_tpex_etf_dividends(year_ad, etf_codes, pre_ex_price_out=None):
    """抓取 TPEx exDailyQ 上櫃歷年除權除息計算結果表（含除權息前收盤價與 ETF 配息）。"""
    url = (
        f"https://www.tpex.org.tw/www/zh-tw/bulletin/exDailyQ"
        f"?startDate={year_ad}/01/01&endDate={year_ad}/12/31&response=json"
    )
    data = fetch_json(url, timeout=25)
    events_by_code = {}
    if not data or not isinstance(data, dict) or not data.get("tables"):
        return events_by_code
    rows = data["tables"][0].get("data", [])
    for row in rows:
        if len(row) < 15:
            continue
        code = str(row[1]).strip()
        ex_date = parse_roc_date(row[0])
        if pre_ex_price_out is not None and code and ex_date != "-":
            pre_price = parse_float(row[3], round_digits=2)
            if pre_price and pre_price > 0:
                pre_ex_price_out[(code, ex_date)] = pre_price

        if code not in etf_codes:
            continue
        cash_div = parse_float(row[13]) or 0.0
        shares_per_1000 = parse_float(row[14]) or 0.0
        stock_div = round(shares_per_1000 / 100.0, 4) if shares_per_1000 > 0 else 0.0
        if cash_div <= 0 and stock_div <= 0:
            continue
        events_by_code.setdefault(code, []).append(
            {
                "y": extract_year_from_date(ex_date) or year_ad,
                "cash": round(cash_div, 4),
                "stock": stock_div,
                "stockCap": 0.0,
                "cashCap": 0.0,
                "exD": ex_date if cash_div > 0 else "-",
                "exR": ex_date if stock_div > 0 else "-",
                "pay": "-",
            }
        )
    return events_by_code


def load_cache(cache_path, disabled=False):
    if disabled or not os.path.exists(cache_path):
        return {"eps": {}, "div_mops": {}, "div_etf_twse": {}, "div_etf_tpex": {}}
    try:
        with open(cache_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            for k in ("eps", "div_mops", "div_etf_twse", "div_etf_tpex"):
                data.setdefault(k, {})
            return data
    except Exception:
        return {"eps": {}, "div_mops": {}, "div_etf_twse": {}, "div_etf_tpex": {}}


def save_cache(cache_path, cache_data):
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(cache_data, f, ensure_ascii=False)


def merge_events(target_map, source_map):
    for code, evs in source_map.items():
        target_map.setdefault(code, []).extend(evs)


def extract_openapi_date(rows, field="Date"):
    """Extract latest normalized YYYY/MM/DD date from an OpenAPI row list."""
    if not isinstance(rows, list):
        return None
    for row in rows:
        if isinstance(row, dict) and row.get(field):
            parsed = parse_roc_date(row.get(field))
            if parsed and parsed != "-":
                return parsed
    return None


def fetch_twse_rwd_quotes():
    """Fetch same-day TWSE closing quotes via RWD MI_INDEX (dynamically locating table by headers)."""
    url = "https://www.twse.com.tw/rwd/zh/afterTrading/MI_INDEX?type=ALLBUT0999&response=json"
    data = fetch_json(url)
    if not isinstance(data, dict) or data.get("stat") != "OK":
        return None, {}

    mi_date = parse_roc_date(data.get("date"))
    if mi_date == "-":
        mi_date = None

    quotes = {}
    for tbl in data.get("tables") or []:
        fields = tbl.get("fields") or []
        if not isinstance(fields, list):
            continue
        if "證券代號" in fields and "收盤價" in fields:
            code_idx = fields.index("證券代號")
            close_idx = fields.index("收盤價")
            name_idx = fields.index("證券名稱") if "證券名稱" in fields else None
            for row in tbl.get("data") or []:
                if not isinstance(row, list) or len(row) <= max(code_idx, close_idx):
                    continue
                code = str(row[code_idx]).strip()
                if not code:
                    continue
                name = str(row[name_idx]).strip() if name_idx is not None and len(row) > name_idx else ""
                price = parse_float(row[close_idx], round_digits=2)
                quotes[code] = {"price": price, "name": name}
            if quotes:
                break

    return mi_date, quotes


def fetch_twse_rwd_bwibbu():
    """Fetch same-day TWSE PE/PB/Yield via RWD BWIBBU_d (dynamically locating columns)."""
    url = "https://www.twse.com.tw/rwd/zh/afterTrading/BWIBBU_d?selectType=ALL&response=json"
    data = fetch_json(url)
    if not isinstance(data, dict) or data.get("stat") != "OK":
        return None, {}

    bw_date = parse_roc_date(data.get("date"))
    if bw_date == "-":
        bw_date = None

    fields = data.get("fields") or []
    rows = data.get("data") or []
    if (not fields or not rows) and isinstance(data.get("tables"), list):
        for tbl in data["tables"]:
            t_fields = tbl.get("fields") or []
            if "證券代號" in t_fields and ("本益比" in t_fields or "殖利率(%)" in t_fields):
                fields = t_fields
                rows = tbl.get("data") or []
                break

    if not isinstance(fields, list) or "證券代號" not in fields:
        return bw_date, {}

    code_idx = fields.index("證券代號")
    pe_idx = fields.index("本益比") if "本益比" in fields else None
    pb_idx = fields.index("股價淨值比") if "股價淨值比" in fields else None
    yield_idx = fields.index("殖利率(%)") if "殖利率(%)" in fields else None

    val_map = {}
    for row in rows:
        if not isinstance(row, list) or len(row) <= code_idx:
            continue
        code = str(row[code_idx]).strip()
        if not code:
            continue
        val_map[code] = {
            "pe": parse_float(row[pe_idx], round_digits=2) if pe_idx is not None and len(row) > pe_idx else None,
            "pb": parse_float(row[pb_idx], round_digits=2) if pb_idx is not None and len(row) > pb_idx else None,
            "yield": parse_float(row[yield_idx], round_digits=2) if yield_idx is not None and len(row) > yield_idx else None,
        }

    return bw_date, val_map


def main():
    parser = argparse.ArgumentParser(description="全台股真實資料抓取引擎 (上市 + 上櫃 + ETF)")
    parser.add_argument("--no-cache", action="store_true", help="忽略本地十年歷史快取，全部重新抓取")
    args = parser.parse_args()

    start_ts = time.time()
    now = datetime.now()
    current_year = now.year
    current_roc_year = current_year - 1911

    base_dir = os.path.dirname(os.path.abspath(__file__))
    cache_path = os.path.join(base_dir, "cache", "history_cache.json")
    output_root = os.path.join(base_dir, "stocks.json")
    output_public = os.path.join(base_dir, "public", "stocks.json")
    output_meta_root = os.path.join(base_dir, "stocks_meta.json")
    output_meta_public = os.path.join(base_dir, "public", "stocks_meta.json")
    output_js = os.path.join(base_dir, "stocks_data.js")

    print("=" * 70)
    print("  全台股真實資料更新引擎 (TW_Stock_Assistant Full-Market Fetcher)")
    print(f"  執行時間: {now.strftime('%Y-%m-%d %H:%M:%S')}  |  快取模式: {'關閉 (--no-cache)' if args.no_cache else '啟用'}")
    print("=" * 70)

    cache = load_cache(cache_path, disabled=args.no_cache)

    # ------------------------------------------------------------------
    # [1/6] 建立全台股名單（上市 + 上櫃 + ETF）與當日收盤報價 / 估值
    # ------------------------------------------------------------------
    print("\n[1/6] 抓取證交所 (TWSE) 與櫃買中心 (TPEx) 全市場名單、報價與估值...")

    t03_l = fetch_json("https://openapi.twse.com.tw/v1/opendata/t187ap03_L") or []
    day_l = fetch_json("https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_ALL") or []
    bw_l = fetch_json("https://openapi.twse.com.tw/v1/exchangeReport/BWIBBU_ALL") or []
    mi_date, mi_quotes = fetch_twse_rwd_quotes()
    bw_rwd_date, bw_rwd_map = fetch_twse_rwd_bwibbu()

    t03_o = fetch_json("https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap03_O") or []
    day_o = fetch_json("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_daily_close_quotes") or []
    pe_o = fetch_json("https://www.tpex.org.tw/openapi/v1/tpex_mainboard_peratio_analysis") or []

    universe = {}  # code -> meta dict
    issued_shares_l = {}
    issued_shares_o = {}

    for row in t03_l:
        code = str(row.get("公司代號", "")).strip()
        if not code:
            continue
        name = str(row.get("公司簡稱") or row.get("公司名稱") or code).strip()
        ind = resolve_industry(row.get("產業別"))
        iss = parse_float(row.get("已發行普通股數或TDR原股發行股數"))
        if iss:
            issued_shares_l[code] = iss
        universe[code] = {
            "market": "上市",
            "code": code,
            "name": name,
            "category": ind,
            "isEtf": False,
        }

    for row in t03_o:
        code = str(row.get("SecuritiesCompanyCode", "")).strip()
        if not code or code in universe:
            continue
        name = str(row.get("CompanyAbbreviation") or row.get("CompanyName") or code).strip()
        ind = resolve_industry(row.get("SecuritiesIndustryCode"))
        iss = parse_float(row.get("IssueShares"))
        if iss:
            issued_shares_o[code] = iss
        universe[code] = {
            "market": "上櫃",
            "code": code,
            "name": name,
            "category": ind,
            "isEtf": False,
        }

    day_l_open_date = extract_openapi_date(day_l)
    bw_l_open_date = extract_openapi_date(bw_l)
    tpex_price_date = extract_openapi_date(day_o) or extract_openapi_date(pe_o)
    twse_price_date = day_l_open_date

    quote_map = {}
    for row in day_l:
        code = str(row.get("Code", "")).strip()
        if not code:
            continue
        price = parse_float(row.get("ClosingPrice"), round_digits=2)
        name = str(row.get("Name", "")).strip()
        quote_map[code] = price
        if code not in universe and code.startswith("00"):
            universe[code] = {
                "market": "上市",
                "code": code,
                "name": name or code,
                "category": "ETF",
                "isEtf": True,
            }

    if mi_quotes and (not day_l_open_date or (mi_date and mi_date >= day_l_open_date)):
        for code, info in mi_quotes.items():
            if code not in universe and code.startswith("00"):
                universe[code] = {
                    "market": "上市",
                    "code": code,
                    "name": info["name"] or code,
                    "category": "ETF",
                    "isEtf": True,
                }
            if info["price"] is not None:
                quote_map[code] = info["price"]
        if mi_date:
            twse_price_date = mi_date

    for row in day_o:
        code = str(row.get("SecuritiesCompanyCode", "")).strip()
        if not code:
            continue
        # 嚴格過濾權證：只收錄已在上櫃基本資料的公司，或 00* 開頭的上櫃 ETF
        if code not in universe and not code.startswith("00"):
            continue
        price = parse_float(row.get("Close"), round_digits=2)
        name = str(row.get("CompanyName", "")).strip()
        if code not in quote_map or quote_map[code] is None:
            quote_map[code] = price
        if code not in universe and code.startswith("00"):
            universe[code] = {
                "market": "上櫃",
                "code": code,
                "name": name or code,
                "category": "ETF",
                "isEtf": True,
            }

    val_map = {}
    for row in bw_l:
        code = str(row.get("Code", "")).strip()
        if code:
            val_map[code] = {
                "pe": parse_float(row.get("PEratio"), round_digits=2),
                "pb": parse_float(row.get("PBratio"), round_digits=2),
                "yield": parse_float(row.get("DividendYield"), round_digits=2),
            }

    if bw_rwd_map and (not bw_l_open_date or (bw_rwd_date and bw_rwd_date >= bw_l_open_date)):
        for code, vinfo in bw_rwd_map.items():
            val_map[code] = vinfo

    for row in pe_o:
        code = str(row.get("SecuritiesCompanyCode", "")).strip()
        if code:
            val_map[code] = {
                "pe": parse_float(row.get("PriceEarningRatio"), round_digits=2),
                "pb": parse_float(row.get("PriceBookRatio"), round_digits=2),
                "yield": parse_float(row.get("YieldRatio"), round_digits=2),
            }

    date_candidates = [d for d in (twse_price_date, tpex_price_date) if d and d != "-"]
    price_date = max(date_candidates) if date_candidates else now.strftime("%Y/%m/%d")

    listed_stocks = [c for c, m in universe.items() if m["market"] == "上市" and not m["isEtf"]]
    otc_stocks = [c for c, m in universe.items() if m["market"] == "上櫃" and not m["isEtf"]]
    listed_etfs = {c for c, m in universe.items() if m["market"] == "上市" and m["isEtf"]}
    otc_etfs = {c for c, m in universe.items() if m["market"] == "上櫃" and m["isEtf"]}
    ordinary_codes = set(listed_stocks) | set(otc_stocks)

    print(
        f"   ✓ 收盤報價基準日: {price_date} (上市 {twse_price_date or '-'} / 上櫃 {tpex_price_date or '-'})"
    )
    print(
        f"   ✓ 上市個股: {len(listed_stocks)} 檔 | 上櫃個股: {len(otc_stocks)} 檔 | "
        f"上市 ETF: {len(listed_etfs)} 檔 | 上櫃 ETF: {len(otc_etfs)} 檔 | 合計: {len(universe)} 檔"
    )

    # ------------------------------------------------------------------
    # [2/6] 董監持股比例 (上市 t187ap11_L + 上櫃 mopsfin_t187ap11_O)
    # ------------------------------------------------------------------
    print("\n[2/6] 抓取上市與上櫃全市場董監持股明細並去重計算...")
    t11_l = fetch_json("https://openapi.twse.com.tw/v1/opendata/t187ap11_L") or []
    t11_o = fetch_json("https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap11_O") or []

    insider_map = {}
    insider_map.update(compute_insider_holdings(t11_l, issued_shares_l))
    insider_map.update(compute_insider_holdings(t11_o, issued_shares_o))
    print(f"   ✓ 董監持股比例計算完成: {len(insider_map)} 檔")

    # ------------------------------------------------------------------
    # [3/6] 偵測最新財報季度 + 抓取 MOPS 批量累積 EPS
    # ------------------------------------------------------------------
    print("\n[3/6] 抓取公開資訊觀測站 (MOPS t163sb04) 全市場各季與去年 EPS...")
    t14_l = fetch_json("https://openapi.twse.com.tw/v1/opendata/t187ap14_L") or []
    t14_o = fetch_json("https://www.tpex.org.tw/openapi/v1/mopsfin_t187ap14_O") or []

    fallback_ytd_eps = {}
    fallback_ytd_quarters = {}
    period_counts = {}

    for row in t14_l:
        code = str(row.get("公司代號", "")).strip()
        ind = str(row.get("產業別", "")).strip()
        if code in universe and ind:
            universe[code]["category"] = ind
        eps_val = parse_float(row.get("基本每股盈餘(元)"), round_digits=2)
        if code and eps_val is not None:
            fallback_ytd_eps[code] = eps_val
        yr_s = str(row.get("年度", "")).strip()
        q_s = str(row.get("季別", "")).strip()
        if code and q_s.isdigit():
            fallback_ytd_quarters[code] = int(q_s)
        if yr_s.isdigit() and q_s.isdigit():
            key = (int(yr_s), int(q_s))
            period_counts[key] = period_counts.get(key, 0) + 1

    for row in t14_o:
        code = str(row.get("SecuritiesCompanyCode", "")).strip()
        ind = str(row.get("產業別", "")).strip()
        if code in universe and ind:
            universe[code]["category"] = ind
        eps_val = parse_float(row.get("基本每股盈餘"), round_digits=2)
        if code and eps_val is not None:
            fallback_ytd_eps[code] = eps_val
        yr_s = str(row.get("Year", "")).strip()
        q_s = str(row.get("季別", "")).strip()
        if code and q_s.isdigit():
            fallback_ytd_quarters[code] = int(q_s)
        if yr_s.isdigit() and q_s.isdigit():
            key = (int(yr_s), int(q_s))
            period_counts[key] = period_counts.get(key, 0) + 1

    if period_counts:
        eps_roc_year, latest_q = max(period_counts.items(), key=lambda kv: kv[1])[0]
    else:
        eps_roc_year, latest_q = current_roc_year, 3

    eps_ad_year = eps_roc_year + 1911
    print(f"   → 偵測最新財報基準: {eps_ad_year} 年 Q{latest_q}（民國 {eps_roc_year} 年）")

    def get_eps_period(yr_roc, q_num, allow_cache=False):
        cache_key = f"{yr_roc}Q{q_num}"
        if allow_cache and cache_key in cache["eps"] and len(cache["eps"][cache_key]) > 1000:
            print(f"     [快取] {yr_roc + 1911} Q{q_num} EPS ({len(cache['eps'][cache_key])} 檔)")
            return cache["eps"][cache_key]

        merged = {}
        for typek in ("sii", "otc"):
            part = fetch_mops_eps_bulk(typek, yr_roc, q_num)
            merged.update(part)
            time.sleep(0.45)
        print(f"     [抓取] {yr_roc + 1911} Q{q_num} 累積 EPS ({len(merged)} 檔)")
        if allow_cache and len(merged) > 1000:
            cache["eps"][cache_key] = merged
        return merged

    eps_last_year_map = get_eps_period(eps_roc_year - 1, 4, allow_cache=True)
    eps_cum = {}
    for q in range(1, latest_q + 1):
        # 已完成較久之季度仍每週抓或只抓最新兩季，確保財報重編也能同步
        eps_cum[q] = get_eps_period(eps_roc_year, q, allow_cache=False)

    # ------------------------------------------------------------------
    # [4/6] 抓取 10 年除權息與發息日資料（MOPS t108sb27 + 預告表 + ETF）
    # ------------------------------------------------------------------
    print("\n[4/6] 抓取近 10 年全市場配息、配股、除息日、除權日與發息日...")
    all_events = {}  # code -> list of events

    start_roc = current_roc_year - 10
    for roc_yr in range(start_roc, current_roc_year + 1):
        ad_yr = roc_yr + 1911
        yr_key = str(roc_yr)
        can_cache = roc_yr <= (current_roc_year - 2)
        if can_cache and yr_key in cache["div_mops"] and len(cache["div_mops"][yr_key]) > 500:
            merge_events(all_events, cache["div_mops"][yr_key])
            print(f"     [快取] {ad_yr} 年 MOPS 個股除權息 ({len(cache['div_mops'][yr_key])} 檔)")
            continue

        yr_events = {}
        for typek in ("sii", "otc"):
            part = fetch_mops_dividends_bulk(typek, roc_yr, ordinary_codes)
            merge_events(yr_events, part)
            time.sleep(0.45)
        print(f"     [抓取] {ad_yr} 年 MOPS 個股除權息 ({len(yr_events)} 檔)")
        if can_cache and len(yr_events) > 500:
            cache["div_mops"][yr_key] = yr_events
        merge_events(all_events, yr_events)

    # 上市 & 上櫃 10 年 ETF 除息紀錄（同時為近期個股與 ETF 建立除權息前一日收盤價對照表）
    print("   → 抓取近 10 年上市 / 上櫃除權息計算表（ETF 除息與除息前一日收盤價）...")
    pre_ex_price_map = {}  # (code, YYYY/MM/DD) -> pre_ex_close_price
    for yr_ad in range(current_year - 9, current_year + 1):
        yr_key = str(yr_ad)
        can_cache = yr_ad <= (current_year - 2)

        if can_cache and yr_key in cache["div_etf_twse"] and len(cache["div_etf_twse"][yr_key]) > 0:
            merge_events(all_events, cache["div_etf_twse"][yr_key])
        else:
            twse_etf_ev = fetch_twse_etf_dividends(yr_ad, listed_etfs, pre_ex_price_out=pre_ex_price_map)
            if can_cache and len(twse_etf_ev) > 0:
                cache["div_etf_twse"][yr_key] = twse_etf_ev
            merge_events(all_events, twse_etf_ev)
            time.sleep(0.35)

        if can_cache and yr_key in cache["div_etf_tpex"] and len(cache["div_etf_tpex"][yr_key]) > 0:
            merge_events(all_events, cache["div_etf_tpex"][yr_key])
        else:
            tpex_etf_ev = fetch_tpex_etf_dividends(yr_ad, otc_etfs, pre_ex_price_out=pre_ex_price_map)
            if can_cache and len(tpex_etf_ev) > 0:
                cache["div_etf_tpex"][yr_key] = tpex_etf_ev
            merge_events(all_events, tpex_etf_ev)
            time.sleep(0.35)

    print(f"   ✓ 已取得除權息前一日收盤價紀錄: {len(pre_ex_price_map)} 筆")

    # 合併最新除權除息預告表 (TWT48U_ALL & tpex_exright_prepost)
    twt48u = fetch_json("https://openapi.twse.com.tw/v1/exchangeReport/TWT48U_ALL") or []
    tpex_pre = fetch_json("https://www.tpex.org.tw/openapi/v1/tpex_exright_prepost") or []

    def add_pre_event(code, raw_date, raw_cash, raw_stock_ratio):
        if code not in universe:
            return
        ex_date = parse_roc_date(raw_date)
        yr = extract_year_from_date(ex_date)
        if not yr:
            return
        cash = parse_float(raw_cash) or 0.0
        s_ratio = parse_float(raw_stock_ratio) or 0.0
        stock = round(s_ratio * 10.0, 4) if s_ratio > 0 else 0.0
        if cash <= 0 and stock <= 0:
            return
        existing = all_events.get(code, [])
        if any((e["exD"] == ex_date or e["exR"] == ex_date) for e in existing):
            return
        all_events.setdefault(code, []).append(
            {
                "y": yr,
                "cash": round(cash, 4),
                "stock": stock,
                "stockCap": 0.0,
                "cashCap": 0.0,
                "exD": ex_date if cash > 0 else "-",
                "exR": ex_date if stock > 0 else "-",
                "pay": "-",
            }
        )

    for row in twt48u:
        add_pre_event(
            str(row.get("Code", "")).strip(),
            row.get("Date"),
            row.get("CashDividend"),
            row.get("StockDividendRatio"),
        )
    for row in tpex_pre:
        add_pre_event(
            str(row.get("SecuritiesCompanyCode", "")).strip(),
            row.get("ExRrightsExDividendDate"),
            row.get("CashDividend"),
            row.get("StockDividendRatio"),
        )

    # 儲存快取供下次每週更新重複使用
    if not args.no_cache:
        save_cache(cache_path, cache)
        print(f"   ✓ 已保存歷史快取至 {cache_path}")

    # ------------------------------------------------------------------
    # [5/6] 彙整計算每檔股票的 29 欄位數據
    # ------------------------------------------------------------------
    print("\n[5/6] 彙整計算全市場 29 欄位指標...")

    # 去重事件並依年度彙總
    per_code_year_stats = {}  # code -> {year: {cash, stock, stockCap, total, exD, exR, pay, events}}
    codes_with_current_year = 0

    for code, evs in all_events.items():
        dedup = {}
        for ev in evs:
            key = (ev["exD"], ev["exR"], round(ev["cash"], 3), round(ev["stock"], 3))
            if key not in dedup:
                dedup[key] = ev
            elif dedup[key]["pay"] == "-" and ev["pay"] != "-":
                dedup[key]["pay"] = ev["pay"]

        by_yr = {}
        for ev in dedup.values():
            y = ev["y"]
            st = by_yr.setdefault(
                y,
                {
                    "cash": 0.0,
                    "stock": 0.0,
                    "stockCap": 0.0,
                    "total": 0.0,
                    "exD": "-",
                    "exR": "-",
                    "pay": "-",
                    "events": [],
                },
            )
            st["cash"] += ev["cash"]
            st["stock"] += ev["stock"]
            st["stockCap"] += ev.get("stockCap", 0.0)
            st["total"] = st["cash"] + st["stock"]
            st["events"].append(ev)
            if ev["exD"] != "-" and (st["exD"] == "-" or ev["exD"] > st["exD"]):
                st["exD"] = ev["exD"]
            if ev["exR"] != "-" and (st["exR"] == "-" or ev["exR"] > st["exR"]):
                st["exR"] = ev["exR"]
            if ev["pay"] != "-" and (st["pay"] == "-" or ev["pay"] > st["pay"]):
                st["pay"] = ev["pay"]

        per_code_year_stats[code] = by_yr
        if current_year in by_yr and by_yr[current_year]["total"] > 0:
            codes_with_current_year += 1

    anchor_year = current_year if codes_with_current_year >= 400 else (current_year - 1)
    print(f"   → 股利統計基準年度: {anchor_year} 年（今年已有配息家數: {codes_with_current_year}）")

    records = []
    for code in sorted(universe.keys()):
        meta = universe[code]
        is_etf = meta["isEtf"]
        price = quote_map.get(code)
        val = val_map.get(code, {})
        pe = None if is_etf else val.get("pe")
        pb = None if is_etf else val.get("pb")
        insider = None if is_etf else insider_map.get(code)

        by_yr = per_code_year_stats.get(code, {})
        disp_year = current_year if (current_year in by_yr and by_yr[current_year]["total"] > 0) else anchor_year
        cur_div = by_yr.get(disp_year, {})

        cash_div = round(cur_div.get("cash", 0.0), 2)
        stock_div = round(cur_div.get("stock", 0.0), 2)
        cap_reserve_stock_div = None if is_etf else round(cur_div.get("stockCap", 0.0), 2)
        ex_div_date = cur_div.get("exD", "-")
        ex_rights_date = cur_div.get("exR", "-")
        pay_date = cur_div.get("pay", "-")

        # 除息前一日收盤價計算之「真實殖利率」（多次配息則各次合計）
        real_yield_sum = 0.0
        matched_pre_count = 0
        latest_pre_ex_date = "-"
        latest_pre_ex_price = None
        for ev in cur_div.get("events", []):
            if ev["cash"] > 0 and ev["exD"] != "-":
                p_pre = pre_ex_price_map.get((code, ev["exD"]))
                if p_pre and p_pre > 0:
                    real_yield_sum += (ev["cash"] / p_pre) * 100.0
                    matched_pre_count += 1
                    if latest_pre_ex_date == "-" or ev["exD"] >= latest_pre_ex_date:
                        latest_pre_ex_date = ev["exD"]
                        latest_pre_ex_price = p_pre

        real_yield = round(real_yield_sum, 2) if matched_pre_count > 0 else None
        pre_ex_price = latest_pre_ex_price if matched_pre_count > 0 else None

        # 10年股利次數與 3 / 6 / 10 年平均股利
        win_10y = [by_yr.get(y, {}).get("total", 0.0) for y in range(anchor_year - 9, anchor_year + 1)]
        win_6y = [by_yr.get(y, {}).get("total", 0.0) for y in range(anchor_year - 5, anchor_year + 1)]
        win_3y = [by_yr.get(y, {}).get("total", 0.0) for y in range(anchor_year - 2, anchor_year + 1)]

        div_count_10y = sum(1 for x in win_10y if x > 0)
        avg_3y = round(sum(win_3y) / 3.0, 2)
        avg_6y = round(sum(win_6y) / 6.0, 2)
        avg_10y = round(sum(win_10y) / 10.0, 2)

        # EPS（MOPS t163sb04 為累積值，需相減得單季 EPS）
        if is_etf:
            eps_q1 = eps_q2 = eps_q3 = eps_ytd = eps_last_year = None
            eps_quarters = None
        else:
            q1_cum = eps_cum.get(1, {}).get(code)
            q2_cum = eps_cum.get(2, {}).get(code)
            q3_cum = eps_cum.get(3, {}).get(code)
            q4_cum = eps_cum.get(4, {}).get(code)

            eps_q1 = q1_cum
            eps_q2 = round(q2_cum - q1_cum, 2) if (q2_cum is not None and q1_cum is not None) else None
            eps_q3 = round(q3_cum - q2_cum, 2) if (q3_cum is not None and q2_cum is not None) else None

            if q4_cum is not None:
                eps_ytd = q4_cum
                eps_quarters = 4
            elif q3_cum is not None:
                eps_ytd = q3_cum
                eps_quarters = 3
            elif q2_cum is not None:
                eps_ytd = q2_cum
                eps_quarters = 2
            elif q1_cum is not None:
                eps_ytd = q1_cum
                eps_quarters = 1
            elif fallback_ytd_eps.get(code) is not None:
                eps_ytd = fallback_ytd_eps.get(code)
                eps_quarters = fallback_ytd_quarters.get(code) or latest_q
            else:
                eps_ytd = None
                eps_quarters = None

            eps_last_year = eps_last_year_map.get(code)

        # 殖利率（元元相加法）與配息率
        if price and price > 0:
            cash_yield = round((cash_div / price) * 100.0, 2)
            total_yield = round(((cash_div + stock_div) / price) * 100.0, 2)
        else:
            cash_yield = None
            total_yield = None

        total_div = cash_div + stock_div
        if not is_etf and eps_last_year and eps_last_year > 0 and total_div > 0:
            payout_ratio = round((total_div / eps_last_year) * 100.0, 2)
        else:
            payout_ratio = None

        # X = 業績進度 (今年累積EPS / 去年EPS), A = 明年預期配息, B = 明年預期殖利率
        if (
            not is_etf
            and eps_ytd is not None
            and eps_last_year is not None
            and eps_last_year > 0
            and eps_quarters
        ):
            benchmark = eps_quarters / 4.0
            raw_x = eps_ytd / eps_last_year
            eps_progress_ratio = round(raw_x, 2)
            if eps_ytd <= 0 or cash_div <= 0:
                expected_div = 0.0
            else:
                est_full_eps = eps_ytd / benchmark
                cash_payout_ratio = cash_div / eps_last_year
                expected_div = round(est_full_eps * cash_payout_ratio, 2)
            expected_yield = round((expected_div / price) * 100.0, 2) if (price and price > 0) else None
        else:
            eps_progress_ratio = None
            expected_div = None
            expected_yield = None

        records.append(
            {
                "market": meta["market"],
                "code": code,
                "name": meta["name"],
                "category": meta["category"],
                "isEtf": is_etf,
                "cashDividend": cash_div,
                "exDividendDate": ex_div_date,
                "stockDividend": stock_div,
                "capReserveStockDiv": cap_reserve_stock_div,
                "exRightsDate": ex_rights_date,
                "price": price,
                "cashYield": cash_yield,
                "realYield": real_yield,
                "preExPrice": pre_ex_price,
                "totalYield": total_yield,
                "payDate": pay_date,
                "payoutRatio": payout_ratio,
                "insiderHolding": insider,
                "avgDiv3Y": avg_3y,
                "avgDiv6Y": avg_6y,
                "avgDiv10Y": avg_10y,
                "divCount10Y": div_count_10y,
                "epsQ1": eps_q1,
                "epsQ2": eps_q2,
                "epsQ3": eps_q3,
                "epsYTD": eps_ytd,
                "epsLastYear": eps_last_year,
                "epsQuarters": eps_quarters,
                "epsProgressRatio": eps_progress_ratio,
                "expectedDividend": expected_div,
                "expectedYield": expected_yield,
                "peRatio": pe,
                "pbRatio": pb,
            }
        )

    # ------------------------------------------------------------------
    # [6/6] 輸出 stocks.json、public/stocks.json、stocks_data.js
    # ------------------------------------------------------------------
    print(f"\n[6/6] 寫入輸出檔案，共 {len(records)} 筆標的...")
    os.makedirs(os.path.dirname(output_public), exist_ok=True)

    with open(output_root, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))
    with open(output_public, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))

    listed_total = sum(1 for r in records if r["market"] == "上市")
    otc_total = sum(1 for r in records if r["market"] == "上櫃")
    meta_obj = {
        "updatedAt": now.strftime("%Y/%m/%d %H:%M:%S"),
        "updatedDate": now.strftime("%Y/%m/%d"),
        "priceDate": price_date,
        "twsePriceDate": twse_price_date or "-",
        "tpexPriceDate": tpex_price_date or "-",
        "total": len(records),
        "listedCount": listed_total,
        "otcCount": otc_total,
        "stockCount": len(ordinary_codes),
        "etfCount": len(listed_etfs) + len(otc_etfs),
        "epsPeriod": f"{eps_ad_year} Q{latest_q}",
        "dividendYear": anchor_year,
    }
    with open(output_meta_root, "w", encoding="utf-8") as f:
        json.dump(meta_obj, f, ensure_ascii=False, separators=(",", ":"))
    with open(output_meta_public, "w", encoding="utf-8") as f:
        json.dump(meta_obj, f, ensure_ascii=False, separators=(",", ":"))

    with open(output_js, "w", encoding="utf-8") as f:
        f.write("window.__TW_STOCKS_META__ = ")
        json.dump(meta_obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\nwindow.__TW_STOCKS_DATA__ = ")
        json.dump(records, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    elapsed = time.time() - start_ts
    print(f"   ✓ {output_root}")
    print(f"   ✓ {output_public}")
    print(f"   ✓ {output_meta_root}")
    print(f"   ✓ {output_meta_public}")
    print(f"   ✓ {output_js}")
    print("\n" + "=" * 70)
    print(
        f"  ★ 全台股更新完成！共 {len(records)} 檔（上市 {listed_total} / 上櫃 {otc_total}）"
        f"，耗時 {elapsed:.1f} 秒"
    )
    print("=" * 70)


if __name__ == "__main__":
    main()
