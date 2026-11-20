#!/usr/bin/env python3
"""Fetch Ricacorp firsthand detail stock fields; keep 在售 (stockQuantity>0); mark 現樓."""

from __future__ import annotations

import csv
import json
import re
import time
import concurrent.futures
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://www.ricacorp.com"
LIST = f"{BASE}/zh-hk/new-property/api/firsthand"
DETAIL = f"{BASE}/zh-hk/new-property/api/firsthand/{{id}}"
LOC = "cc5d58f7-5de0-43ab-9724-e99203ebdffa"
OUT = Path("/agent/repos/building-project-")
WORKERS = 3
RETRIES = 8


def get_json(url: str):
    last = None
    for i in range(RETRIES):
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (compatible; RicaResearch/1.0)",
                    "Accept": "application/json",
                    "Referer": f"{BASE}/zh-hk/new-property/list",
                },
            )
            with urllib.request.urlopen(req, timeout=45) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:  # noqa: BLE001
            last = e
            # Back off hard on rate limit
            wait = 15 * (i + 1) if e.code == 429 else 1.2 * (i + 1)
            print(f"HTTP {e.code} for {url} → sleep {wait}s", flush=True)
            time.sleep(wait)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(1.2 * (i + 1))
    raise last  # type: ignore[misc]


def parse_total(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        return int(v)
    m = re.search(r"\d+", str(v))
    return int(m.group()) if m else None


def is_completed_building(text) -> bool:
    """現樓 = ready / completed building (not a future estimated key date)."""
    if not text:
        return False
    t = str(text).strip()
    return t in {"現樓", "现楼"} or "現樓" in t or "现楼" in t


def list_all():
    items = []
    offset = 0
    total = None
    while True:
        data = get_json(f"{LIST}?offset={offset}&locationId={LOC}")
        results = data.get("results") or []
        total = data.get("total")
        items.extend(results)
        print(
            f"list offset={offset} got={len(results)} cumulative={len(items)} total={total}",
            flush=True,
        )
        if not results or (total is not None and len(items) >= total):
            break
        offset += len(results)
        if offset > 5000:
            break
    return items, total


def fetch_detail(did: int):
    try:
        time.sleep(0.35)  # gentle pacing to avoid 429
        d = get_json(DETAIL.format(id=did))
        results = d.get("results") or []
        if not results:
            return did, None, "empty"
        return did, results[0], None
    except Exception as e:  # noqa: BLE001
        return did, None, str(e)


def main():
    items, total = list_all()
    print("LISTED", len(items), flush=True)
    ids = [it["developmentId"] for it in items]

    details = {}
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as ex:
        futs = [ex.submit(fetch_detail, i) for i in ids]
        done = 0
        for fut in concurrent.futures.as_completed(futs):
            did, row, err = fut.result()
            done += 1
            if err or not row:
                errors.append((did, err or "empty"))
            else:
                details[did] = row
            if done % 40 == 0 or done == len(ids):
                print(
                    f"details {done}/{len(ids)} ok={len(details)} err={len(errors)}",
                    flush=True,
                )

    # retry errors once more serially
    still = []
    for did, err in errors:
        did2, row, err2 = fetch_detail(did)
        if row:
            details[did2] = row
        else:
            still.append((did, err2 or err))
        time.sleep(0.25)
    errors = still
    print(f"after retry ok={len(details)} err={len(errors)}", flush=True)

    rows = []
    for did, r in details.items():
        stock = int(r.get("stockQuantity") or 0)
        sold = int(r.get("soldOutQuantity") or 0)
        unreleased = int(r.get("unreleasedQuantity") or 0)
        total_u = parse_total(r.get("totalUnits"))
        key_date = r.get("estimatedMaterialDateText")
        completed = is_completed_building(key_date)
        is_sold_out = stock == 0 and unreleased == 0 and (
            sold > 0 or (total_u is not None and sold >= total_u)
        )
        is_onsale = stock > 0
        slug = r.get("alias") or f"{r.get('urlEncodeDisplayName')}-{did}"
        url = f"{BASE}/zh-hk/new-property/detail/{slug}"
        rows.append(
            {
                "developmentId": did,
                "displayName": r.get("displayName"),
                "districtName": r.get("districtName"),
                "areaName": r.get("areaName"),
                "displayAddress": r.get("displayAddress"),
                "vendor": r.get("vendor"),
                "buildingType": "現樓" if completed else "期樓",
                "estimatedMaterialDateText": key_date,
                "listSalesStatus": r.get("salesStatus"),
                "stockQuantity": stock,
                "soldOutQuantity": sold,
                "unreleasedQuantity": unreleased,
                "totalUnits": total_u if total_u is not None else r.get("totalUnits"),
                "isSoldOut": is_sold_out,
                "isOnSaleByStock": is_onsale,
                "lowestPrice": r.get("lowestPriceOfAllPriceList"),
                "url": url,
                "updateTableDate": r.get("updateTableDate"),
            }
        )

    sold_out = [x for x in rows if x["isSoldOut"]]
    onsale = [x for x in rows if x["isOnSaleByStock"]]
    other = [x for x in rows if not x["isSoldOut"] and not x["isOnSaleByStock"]]
    onsale_sorted = sorted(
        onsale,
        key=lambda x: (
            0 if x["buildingType"] == "現樓" else 1,
            -(x["stockQuantity"] or 0),
            x["districtName"] or "",
            x["displayName"] or "",
        ),
    )

    print("DETAIL_OK", len(rows), "ERRORS", len(errors))
    print("售清", len(sold_out))
    print("在售(銷售中>0)", len(onsale))
    print("  其中現樓", sum(1 for x in onsale if x["buildingType"] == "現樓"))
    print("  其中期樓", sum(1 for x in onsale if x["buildingType"] == "期樓"))
    print("其他(非售清且銷售中=0)", len(other))
    print("onsale listSalesStatus", Counter(x["listSalesStatus"] for x in onsale))
    print("soldout listSalesStatus", Counter(x["listSalesStatus"] for x in sold_out))

    fetched_at = datetime.now(timezone.utc).isoformat()
    payload = {
        "source": f"{BASE}/zh-hk/new-property/list",
        "method": "GET /zh-hk/new-property/api/firsthand/{id} → stockQuantity/soldOutQuantity/unreleasedQuantity + estimatedMaterialDateText",
        "fetchedAt": fetched_at,
        "totalListed": total,
        "detailFetched": len(rows),
        "detailErrors": len(errors),
        "soldOutCount": len(sold_out),
        "onsaleByStockCount": len(onsale),
        "onsaleCompletedCount": sum(1 for x in onsale if x["buildingType"] == "現樓"),
        "onsaleOffplanCount": sum(1 for x in onsale if x["buildingType"] == "期樓"),
        "otherNotSoldOutCount": len(other),
        "definition": {
            "在售": "詳情頁銷售情況：銷售中(stockQuantity) > 0",
            "售清": "銷售中=0 且 未開售=0 且 已售>0（已從表中剔除）",
            "現樓": "預計關鍵日期 = 現樓",
            "期樓": "預計關鍵日期為具體日期（未入伙）",
        },
        "properties": onsale_sorted,
        "errors": [{"developmentId": d, "error": e} for d, e in errors[:100]],
    }

    fields = [
        "developmentId",
        "displayName",
        "buildingType",
        "districtName",
        "areaName",
        "displayAddress",
        "vendor",
        "estimatedMaterialDateText",
        "listSalesStatus",
        "stockQuantity",
        "soldOutQuantity",
        "unreleasedQuantity",
        "totalUnits",
        "lowestPrice",
        "url",
        "updateTableDate",
    ]

    for folder in [OUT, OUT / "ricacorp-onsale-app"]:
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "ricacorp-onsale-by-stock.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        with (folder / "ricacorp-onsale-by-stock.csv").open(
            "w", newline="", encoding="utf-8"
        ) as f:
            w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
            w.writeheader()
            for row in onsale_sorted:
                w.writerow(row)

    # also write a compact markdown table preview
    md = [
        "# 利嘉閣一手在售（按詳情頁「銷售情況」）",
        "",
        f"- 抓取時間：{fetched_at}",
        f"- 列表總盤：{total}；詳情成功：{len(rows)}；失敗：{len(errors)}",
        f"- **在售（銷售中>0）**：{len(onsale)}（現樓 {payload['onsaleCompletedCount']} / 期樓 {payload['onsaleOffplanCount']}）",
        f"- 已剔除售清：{len(sold_out)}",
        "",
        "| # | 樓盤 | 類型 | 分區 | 銷售中 | 已售 | 未開售 | 總單位 | 預計關鍵日期 | 詳情 |",
        "|---|---|---|---|---:|---:|---:|---:|---|---|",
    ]
    for i, x in enumerate(onsale_sorted, 1):
        md.append(
            f"| {i} | {x['displayName']} | {x['buildingType']} | {x['districtName']}/{x['areaName']} | "
            f"{x['stockQuantity']} | {x['soldOutQuantity']} | {x['unreleasedQuantity']} | {x['totalUnits']} | "
            f"{x['estimatedMaterialDateText'] or '—'} | [打開]({x['url']}) |"
        )
    (OUT / "ricacorp-onsale-by-stock.md").write_text("\n".join(md) + "\n", encoding="utf-8")

    print("WROTE", len(onsale_sorted), "onsale rows")
    print("TOP 現樓:")
    for x in [r for r in onsale_sorted if r["buildingType"] == "現樓"][:8]:
        print(
            x["displayName"],
            "銷售中",
            x["stockQuantity"],
            "已售",
            x["soldOutQuantity"],
            x["url"],
        )
    print("TOP 期樓:")
    for x in [r for r in onsale_sorted if r["buildingType"] == "期樓"][:8]:
        print(
            x["displayName"],
            "銷售中",
            x["stockQuantity"],
            "關鍵日期",
            x["estimatedMaterialDateText"],
            x["url"],
        )


if __name__ == "__main__":
    main()
