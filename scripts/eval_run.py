#!/usr/bin/env python3
"""
eval_run.py — 평가셋을 서비스 엔드포인트에 실행하고 자동 채점.

사용:
  python3 scripts/eval_run.py                          # localhost:3000 대상
  python3 scripts/eval_run.py --base-url https://x.vercel.app

입력:  eval_set/cases/<id>/{description.txt, sample.*, expected.json}
출력:  eval_runs/<timestamp>/{raw/<id>.json, scores.json, scores.md}

자동 채점(scripts로 가능한 것만):
  - decompose_ok        : steps 배열 유효
  - classification_match: execution_type 분포 vs expected_automatable
  - exec_success (P0)   : result_artifact 비어있지 않음
  - advice_only (P0 후보): 결과물이 지시문 형태인지 휴리스틱 → 인간 확인 필요
인간 채점(분해 적절성·결과물 채택률)은 work-hack-eval 스킬이 scores.md 위에서 수행.

API 계약 source of truth: lib/types.ts (DecomposeInput/ExecuteInput) + service_design.md §4.
계약 변경 시 이 스크립트의 요청 페이로드도 같은 커밋에서 맞출 것.
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SAMPLE_EXTS = [".csv", ".txt", ".md"]
ADVICE_MARKERS = ["하는 방법", "다음과 같이", "단계:", "수동으로", "확인하세요", "권장"]


def post(base_url: str, path: str, payload: dict, timeout: int = 60) -> dict:
    req = urllib.request.Request(
        base_url.rstrip("/") + path,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return {"ok": True, "status": res.status,
                    "latency_s": round(time.time() - t0, 2),
                    "body": json.loads(res.read().decode())}
    except urllib.error.HTTPError as e:
        return {"ok": False, "status": e.code, "latency_s": round(time.time() - t0, 2),
                "body": {"error": e.read().decode()[:500]}}
    except Exception as e:
        return {"ok": False, "status": None, "latency_s": round(time.time() - t0, 2),
                "body": {"error": str(e)}}


def load_case(case_dir: Path) -> dict:
    desc = (case_dir / "description.txt").read_text(encoding="utf-8").strip()
    sample_path = next((case_dir / f"sample{ext}" for ext in SAMPLE_EXTS
                        if (case_dir / f"sample{ext}").exists()), None)
    sample_text = sample_path.read_text(encoding="utf-8") if sample_path else None
    expected = {}
    if (case_dir / "expected.json").exists():
        expected = json.loads((case_dir / "expected.json").read_text(encoding="utf-8"))
    return {"id": case_dir.name, "description": desc,
            "sample_file": sample_path.name if sample_path else None,
            "sample_text": sample_text, "expected": expected}


def looks_like_advice(artifact: str) -> bool:
    """결과물이 '실행 결과'가 아니라 '방법 지시' 형태인지 휴리스틱. 확정은 인간."""
    if not artifact:
        return True
    hits = sum(1 for m in ADVICE_MARKERS if m in artifact)
    return hits >= 2 and len(artifact) < 300


def run_case(base_url: str, case: dict) -> dict:
    result = {"id": case["id"], "decompose": None, "execute": None, "auto": {}}

    dec = post(base_url, "/api/decompose", {"work_description": case["description"]})
    result["decompose"] = dec
    steps = dec["body"].get("steps") if dec["ok"] else None
    result["auto"]["decompose_ok"] = bool(isinstance(steps, list) and steps)
    if not result["auto"]["decompose_ok"]:
        return result

    exec_steps = [s for s in steps if s.get("execution_type") == "executable"]
    result["auto"]["executable_step_count"] = len(exec_steps)

    expected = case["expected"].get("expected_automatable", {})
    if "executable_at_least_one" in expected:
        result["auto"]["classification_match"] = (
            (len(exec_steps) > 0) == expected["executable_at_least_one"])

    if exec_steps and case["sample_text"] is not None:
        step = next((s for s in exec_steps
                     if s.get("id") == dec["body"].get("recommended_step_id")),
                    exec_steps[0])
        t0 = time.time()
        ex = post(base_url, "/api/execute", {
            "step": step,
            "task_title": dec["body"].get("task_title"),
            "sample_data": case["sample_text"],
            "sample_filename": case["sample_file"],
        }, timeout=120)
        result["execute"] = ex
        artifact = ex["body"].get("result_artifact") if ex["ok"] else None
        result["auto"]["exec_success"] = bool(ex["ok"] and artifact)
        result["auto"]["advice_only_flag"] = looks_like_advice(artifact or "")
        result["auto"]["wall_seconds"] = round(time.time() - t0, 2)
    elif not exec_steps:
        result["auto"]["exec_success"] = None  # 실행 대상 없음 — 정직한 분해 케이스
    else:
        result["auto"]["exec_success"] = None  # 샘플 데이터 없음

    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-url", default="http://localhost:3000")
    ap.add_argument("--cases", default=str(ROOT / "eval_set" / "cases"))
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    cases_dir = Path(args.cases)
    case_dirs = sorted(d for d in cases_dir.iterdir()
                       if d.is_dir() and (d / "description.txt").exists())
    if not case_dirs:
        print(f"no cases in {cases_dir}", file=sys.stderr)
        return 1

    out_dir = Path(args.out) if args.out else \
        ROOT / "eval_runs" / datetime.now().strftime("%Y-%m-%dT%H%M%S")
    (out_dir / "raw").mkdir(parents=True, exist_ok=True)

    results = [run_case(args.base_url, load_case(d)) for d in case_dirs]
    for r in results:
        (out_dir / "raw" / f"{r['id']}.json").write_text(
            json.dumps(r, ensure_ascii=False, indent=2), encoding="utf-8")

    n = len(results)
    dec_ok = sum(1 for r in results if r["auto"].get("decompose_ok"))
    attempted = [r for r in results if r["auto"].get("exec_success") is not None]
    exec_ok = sum(1 for r in attempted if r["auto"]["exec_success"])
    p0 = sum(1 for r in attempted
             if r["auto"]["exec_success"] is False or r["auto"].get("advice_only_flag"))
    matches = [r for r in results if "classification_match" in r["auto"]]
    cls_ok = sum(1 for r in matches if r["auto"]["classification_match"])

    scores = {
        "cases": n, "decompose_ok": f"{dec_ok}/{n}",
        "exec_success": f"{exec_ok}/{len(attempted)}" if attempted else "n/a",
        "exec_success_rate": round(exec_ok / len(attempted), 3) if attempted else None,
        "p0_count": p0,
        "classification_match": f"{cls_ok}/{len(matches)}" if matches else "n/a",
        "base_url": args.base_url,
    }
    (out_dir / "scores.json").write_text(
        json.dumps(scores, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = ["# Eval scores", "",
             f"- base_url: {args.base_url}", f"- cases: {n}",
             f"- decompose_ok: {scores['decompose_ok']}",
             f"- exec_success: {scores['exec_success']} (rate {scores['exec_success_rate']})",
             f"- P0(실행실패+조언형 결과): {p0}",
             f"- classification_match: {scores['classification_match']}", "",
             "| case | decompose | exec | advice_only | 분류일치 |", "|---|---|---|---|---|"]
    for r in results:
        a = r["auto"]
        lines.append("| {} | {} | {} | {} | {} |".format(
            r["id"], a.get("decompose_ok"), a.get("exec_success"),
            a.get("advice_only_flag", "-"), a.get("classification_match", "-")))
    (out_dir / "scores.md").write_text("\n".join(lines) + "\n", encoding="utf-8")

    print("\n".join(lines))
    print(f"\n→ {out_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
