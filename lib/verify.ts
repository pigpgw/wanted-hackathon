import type { VerificationCard, VerificationItem } from "./types";

// v2 — 코드 재계산 검증: LLM이 만든 결과물 속 수치를 샘플 데이터로 실제 재계산해 대조.
// LLM 자기 검증(자기 출력을 자기가 승인)은 순환 논리라 신뢰 불가 — 집계는 코드가 해야 한다.

interface Derived {
  value: number;
  basis: string;
}

function parseNum(s: string): number | null {
  const n = Number(s.replace(/,/g, "").replace(/%/g, ""));
  return Number.isFinite(n) ? n : null;
}

// 구분자 감지: 첫 줄에서 탭(엑셀 붙여넣기)→세미콜론→콤마 순 — 모든 행에 동일 구분자가 있어야 함
function detectDelimiter(lines: string[]): string | null {
  if (lines.length < 2) return null;
  for (const d of ["\t", ";", ","]) {
    if (
      lines[0].includes(d) &&
      lines.every((l) => l.split(d).length === lines[0].split(d).length) &&
      lines[0].split(d).length >= 2
    ) {
      return d;
    }
  }
  return null;
}

// 샘플 데이터에서 유도 가능한 값들을 코드로 계산 (CSV면 그룹 집계, 아니면 원문 숫자)
function deriveValues(sample: string): Derived[] {
  const lines = sample
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const out: Derived[] = [];

  // 표 감지: 2행 이상 + 모든 행의 필드 수 동일 + 헤더 존재 — 구분자는 콤마·탭(엑셀 붙여넣기)·세미콜론
  const delim = detectDelimiter(lines);
  const rows = delim
    ? lines.map((l) => l.split(delim).map((c) => c.trim()))
    : [];
  const isCsv =
    rows.length >= 2 &&
    rows[0].length >= 2 &&
    rows.every((r) => r.length === rows[0].length);

  if (!isCsv) {
    // 자유 텍스트: 줄 수 + 원문 숫자만 유도
    if (lines.length > 0)
      out.push({ value: lines.length, basis: "데이터 줄 수" });
    for (const l of lines) {
      for (const m of l.matchAll(/\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?%/g)) {
        const v = parseNum(m[0]);
        if (v !== null) out.push({ value: v, basis: "원문 데이터 값" });
      }
    }
    return out;
  }

  const header = rows[0];
  const data = rows.slice(1);
  out.push({ value: data.length, basis: "데이터 건수" });

  // 컬럼 분류: numeric(전부 숫자) / categorical(유니크 ≤ 12)
  const numericCols: number[] = [];
  const catCols: number[] = [];
  for (let c = 0; c < header.length; c++) {
    const vals = data.map((r) => r[c]);
    if (vals.every((v) => v !== "" && Number.isFinite(Number(v)))) {
      numericCols.push(c);
    } else {
      const uniq = new Set(vals);
      if (uniq.size <= 12 && uniq.size > 0) catCols.push(c);
      if (uniq.size <= 12 && uniq.size > 1) {
        out.push({ value: uniq.size, basis: `${header[c]} 종류 수` });
      }
    }
  }

  for (const nc of numericCols) {
    const name = header[nc];
    const nums = data.map((r) => Number(r[nc]));
    const sum = nums.reduce((a, b) => a + b, 0);
    out.push({ value: sum, basis: `${name} 전체 합계` });
    out.push({ value: sum / nums.length, basis: `${name} 평균` });
    out.push({ value: Math.max(...nums), basis: `${name} 최댓값` });
    out.push({ value: Math.min(...nums), basis: `${name} 최솟값` });
  }

  // 비중 표기가 있는 결과물의 "100%"도 검증되도록 — 전체 비중 합계
  if (catCols.length > 0 && numericCols.length > 0) {
    out.push({ value: 100, basis: "전체 비중 합계" });
  }

  // 범주형 × 숫자형 그룹 집계 — 합계·건수·비중·평균
  for (const cc of catCols) {
    const keys = [...new Set(data.map((r) => r[cc]))];
    for (const key of keys) {
      const rowsIn = data.filter((r) => r[cc] === key);
      out.push({ value: rowsIn.length, basis: `${key} 건수` });
      for (const nc of numericCols) {
        const gsum = rowsIn.reduce((a, r) => a + Number(r[nc]), 0);
        const total = data.reduce((a, r) => a + Number(r[nc]), 0);
        out.push({
          value: gsum,
          basis: `${key}의 ${header[nc]} 합계`,
        });
        out.push({
          value: gsum / rowsIn.length,
          basis: `${key}의 ${header[nc]} 평균`,
        });
        if (total > 0) {
          out.push({
            value: (gsum / total) * 100,
            basis: `${key}의 ${header[nc]} 비중(%)`,
          });
        }
      }
    }
  }

  // 원문 셀 값도 유도 — 결과물이 행 값을 그대로 인용하는 경우(가장 흔함)도 검증 대상.
  // 집계값만 유도하면 "145,000"(실제 행 값)이 "확인 필요"로 잘못 표시됨
  for (let i = 0; i < data.length; i++) {
    const label = catCols.length
      ? catCols.map((c) => data[i][c]).join("·")
      : `${i + 1}행`;
    for (const nc of numericCols) {
      out.push({ value: Number(data[i][nc]), basis: `${label}의 ${header[nc]}` });
    }
  }
  return out;
}

// 결과물에서 검증 대상 수치 추출 — 콤마 숫자·쌩숫자(4자리+)·%·단위 붙은 숫자.
// 쌩숫자는 날짜(2026-09-07)·코드(SKU-101)처럼 숫자 앞뒤에 - . , 가 붙은 건 제외 —
// LLM이 "152,000" 대신 "152000"으로 쓰는 경우가 있어 콤마 없는 수치도 검증 대상이다
function extractNumbers(artifact: string): { raw: string; value: number }[] {
  const re =
    /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?%|\d+(?:\.\d+)?(?=\s*(?:원|건|개|명|회|줄|시간|분|행))|(?<![\d.,\-])\d{4,}(?:\.\d+)?(?![\d.,\-])/g;
  const seen = new Set<string>();
  const out: { raw: string; value: number }[] = [];
  for (const m of artifact.matchAll(re)) {
    const raw = m[0];
    if (seen.has(raw)) continue;
    seen.add(raw);
    const v = parseNum(raw);
    if (v !== null) out.push({ raw, value: v });
    if (out.length >= 12) break;
  }
  return out;
}

function closeEnough(a: number, b: number): boolean {
  // 정수끼리는 정확 일치만 인정 — 금액 합계의 0.5% 오차(482,000 vs 480,000)를 통과시키면 안 됨.
  // 비율·평균 같은 비정수는 반올림 표기 차이가 흔하니 0.5% 허용
  if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
  return Math.abs(a - b) <= Math.max(0.6, Math.abs(b) * 0.005);
}

function fmt(n: number): string {
  return Number.isInteger(n)
    ? n.toLocaleString("ko-KR")
    : n.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

// basis 토큰이 수치가 있는 줄에 얼마나 등장하는지 — 같은 맥락의 유도값 우선 매칭
function contextScore(d: Derived, line: string): number {
  const toks = d.basis
    .replace(/([a-zA-Z0-9])([가-힣])/g, "$1 $2") // "offline의" → "offline 의" — 라틴/한글 경계 분리
    .replace(/([가-힣])([a-zA-Z0-9])/g, "$1 $2")
    .split(/[^\w가-힣-]+/)
    .filter((t) => t.length >= 2);
  return toks.reduce((s, t) => s + (line.includes(t) ? 1 : 0), 0);
}

// 표 형태(콤마·탭·세미콜론) 샘플인지 — 코드 재계산이 의미 있는 데이터인지 판별
export function isTabularSample(sample: string): boolean {
  const lines = sample
    .trim()
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const delim = detectDelimiter(lines);
  if (!delim) return false;
  const rows = lines.map((l) => l.split(delim));
  return (
    rows.length >= 2 &&
    rows[0].length >= 2 &&
    rows.every((r) => r.length === rows[0].length)
  );
}

// 코드 재계산 검증 카드 생성 — 유도값이 없으면 null (그때는 LLM 카드에 맡김)
export function codeVerify(
  artifact: string,
  sample: string
): VerificationCard | null {
  const derived = deriveValues(sample);
  const nums = extractNumbers(artifact);
  if (nums.length === 0 || derived.length === 0) return null;
  const lines = artifact.split("\n");

  const items: VerificationItem[] = nums.map(({ raw, value }) => {
    const line = lines.find((l) => l.includes(raw)) ?? "";
    // 같은 줄 맥락과 맞는 유도값 중 정확히 일치하는 것 우선
    const hits = derived
      .filter((d) => closeEnough(value, d.value))
      .sort((a, b) => contextScore(b, line) - contextScore(a, line));
    if (hits.length > 0) {
      return { claim: raw, basis: `재계산 일치 — ${hits[0].basis}`, status: "ok" };
    }
    // 불일치: 맥락 맞는 유도값(없으면 전체) 중 가장 가까운 값을 재계산 결과로 제시
    const inContext = derived.filter((d) => contextScore(d, line) > 0);
    const pool = inContext.length > 0 ? inContext : derived;
    let best: Derived | null = null;
    for (const d of pool) {
      if (
        Math.abs(d.value - value) <= Math.max(1, Math.abs(value) * 0.5) &&
        (!best || Math.abs(d.value - value) < Math.abs(best.value - value))
      ) {
        best = d;
      }
    }
    return {
      claim: raw,
      basis: best
        ? `재계산하면 ${best.basis} = ${fmt(best.value)} — 결과물 수치 확인 필요`
        : "샘플 데이터로 재계산 불가 — 근거 확인 필요",
      status: "check",
    };
  });

  const ok = items.filter((i) => i.status === "ok").length;
  return {
    items,
    summary: `결과물 속 수치 ${items.length}건을 코드로 재계산 — ${ok}건 일치${
      items.length - ok > 0 ? `, ${items.length - ok}건 확인 필요` : ""
    }`,
    source: "code",
  };
}
