"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Link2,
  Loader2,
  Plug,
  RotateCcw,
  ShieldCheck,
  Upload,
  UserCheck,
  Wand2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  DecomposeResult,
  ExecuteResult,
  ExecutionType,
  WorkStep,
} from "@/lib/types";

const MAX_FILE_BYTES = 500 * 1024; // service_design.md §4 — ≤500KB
const MAX_CSV_ROWS = 100; // §10 — CSV는 앞 N행만 사용 + "샘플 기준" 명시

interface PresetSummary {
  id: string;
  label: string;
  work_description: string;
  frequency: string;
  manual_minutes: number;
  sample_filename: string;
  sample_data: string;
}

interface SampleFile {
  name: string;
  text: string;
  note: string | null;
  fromPreset: boolean;
}

// v2 — 레시피 링크: 워크플로 설정을 URL fragment(#r=…)에 인코딩 (서버 저장 없음)
interface RecipePayload {
  d: string; // work_description
  fq?: string;
  mm?: number;
  r: DecomposeResult;
  s: number; // selected step id
  f?: string; // output_format
}

function encodeRecipe(p: RecipePayload): string {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeRecipe(s: string): RecipePayload | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = (4 - (b64.length % 4)) % 4;
    const json = decodeURIComponent(escape(atob(b64 + "=".repeat(pad))));
    const p = JSON.parse(json) as RecipePayload;
    if (typeof p?.d !== "string" || !p.r || !Array.isArray(p.r.steps)) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

// 토스 스타일 분류 배지 — flat, 채움형, 작은 텍스트
const TYPE_META: Record<
  ExecutionType,
  { label: string; badgeClass: string; icon: typeof Zap }
> = {
  executable: {
    label: "즉시 실행",
    badgeClass: "bg-[#e8f3ff] text-[#1b64da]",
    icon: Zap,
  },
  integration_needed: {
    label: "연동 필요",
    badgeClass: "bg-[#fff3e0] text-[#c26a00]",
    icon: Plug,
  },
  human_judgment: {
    label: "사람 판단",
    badgeClass: "bg-secondary text-secondary-foreground",
    icon: UserCheck,
  },
};

// 결과물 마크다운 — 표 스타일링 필수 (remark-gfm)
const mdComponents: Components = {
  h2: (props) => (
    <h2 className="mt-7 mb-2 text-lg font-bold first:mt-0" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-5 mb-1.5 text-base font-bold" {...props} />
  ),
  h4: (props) => (
    <h4 className="mt-4 mb-1 text-sm font-semibold" {...props} />
  ),
  p: (props) => <p className="my-2.5 leading-[1.7]" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-xl border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-secondary" {...props} />,
  th: (props) => (
    <th
      className="border-b px-3 py-2.5 text-left font-semibold whitespace-nowrap"
      {...props}
    />
  ),
  td: (props) => (
    <td
      className="border-b px-3 py-2.5 align-top last:[tr:last-child_&]:border-0"
      {...props}
    />
  ),
  code: (props) => (
    <code
      className="rounded bg-secondary px-1 py-0.5 font-mono text-[0.85em]"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-3 overflow-x-auto rounded-xl bg-secondary p-3 text-sm"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="my-3 border-l-[3px] border-muted-foreground/30 pl-3 text-muted-foreground"
      {...props}
    />
  ),
  hr: () => <hr className="my-4 border-border" />,
  a: (props) => (
    <a className="text-primary underline underline-offset-2" {...props} />
  ),
};

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-1" title={`자동화 적합도 ${score}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "size-2 rounded-full",
            i < score ? "bg-primary" : "bg-muted-foreground/20"
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{score}/5</span>
    </span>
  );
}

function ErrorBox({
  message,
  onRetry,
  retrying,
}: {
  message: string;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[#fff0f1] px-4 py-3 text-sm text-destructive">
      <span className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" />
        {message}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRetry}
        disabled={retrying}
        className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        {retrying ? <Loader2 className="animate-spin" /> : null}
        재시도
      </Button>
    </div>
  );
}

// 토스 스타일 섹션 — 흰 카드, 보더 없이 큰 라운드
function Section({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-card p-5 sm:p-7",
        className
      )}
    >
      {children}
    </section>
  );
}

export function AutomationApp() {
  // [1] 입력 상태
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [presetSample, setPresetSample] = useState<SampleFile | null>(null);

  // [2] 분해 결과 상태
  const [decomposed, setDecomposed] = useState<DecomposeResult | null>(null);
  const [selectedStep, setSelectedStep] = useState<WorkStep | null>(null);
  const [fileSample, setFileSample] = useState<SampleFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState("");
  const [outputFormat, setOutputFormat] = useState(""); // v2 — 결과 양식

  // [3] 실행 결과 상태
  const [executed, setExecuted] = useState<ExecuteResult | null>(null);
  const [executedStepType, setExecutedStepType] =
    useState<ExecutionType | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedArtifact, setCopiedArtifact] = useState(false);
  const [copiedRecipe, setCopiedRecipe] = useState(false);

  // v2 — 자연어 수정·레시피 복원
  const [revisionText, setRevisionText] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseError, setReviseError] = useState<string | null>(null);
  const [recipeRestored, setRecipeRestored] = useState(false);

  // 로딩·에러 (§10 — 조용한 크래시 금지, 명시적 표시 + 재시도)
  const [decomposing, setDecomposing] = useState(false);
  const [decomposeError, setDecomposeError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executeError, setExecuteError] = useState<string | null>(null);

  const stepsRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: PresetSummary[]) => setPresets(data))
      .catch(() => setPresets([]));
  }, []);

  // v2 — 레시피 링크(#r=…)로 들어오면 워크플로 복원 (데이터만 새로 넣으면 됨)
  useEffect(() => {
    const m = /#r=([A-Za-z0-9_-]+)/.exec(window.location.hash);
    if (!m) return;
    const p = decodeRecipe(m[1]);
    if (!p) return;
    setDescription(p.d);
    if (p.fq) setFrequency(p.fq);
    if (typeof p.mm === "number") setManualMinutes(String(p.mm));
    setDecomposed(p.r);
    const step = p.r.steps.find((s) => s.id === p.s);
    if (step) setSelectedStep(step);
    if (p.f) setOutputFormat(p.f);
    setRecipeRestored(true);
    history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (decomposed)
      stepsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [decomposed]);

  useEffect(() => {
    if (executed)
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [executed]);

  const manualMinutesNum = (() => {
    const n = Number(manualMinutes);
    return manualMinutes.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
  })();

  function applyPreset(p: PresetSummary) {
    setDescription(p.work_description);
    setFrequency(p.frequency);
    setManualMinutes(String(p.manual_minutes));
    setPresetSample({
      name: p.sample_filename,
      text: p.sample_data,
      note: null,
      fromPreset: true,
    });
    // 입력이 바뀌면 아래 단계는 무효
    setDecomposed(null);
    setSelectedStep(null);
    setExecuted(null);
    setDecomposeError(null);
    setExecuteError(null);
    setFileSample(null);
    setPasteText("");
    setOutputFormat("");
    setRevisionText("");
    setReviseError(null);
    setRecipeRestored(false);
  }

  async function runDecompose() {
    setDecomposing(true);
    setDecomposeError(null);
    try {
      const res = await fetch("/api/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_description: description,
          ...(frequency.trim() ? { frequency: frequency.trim() } : {}),
          ...(manualMinutesNum ? { manual_minutes: manualMinutesNum } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDecomposeError(data?.error ?? "분해에 실패했습니다");
        setDecomposed(null);
        return;
      }
      setDecomposed(data as DecomposeResult);
      setSelectedStep(null);
      setExecuted(null);
      setExecuteError(null);
    } catch {
      setDecomposeError("네트워크 오류 — 다시 시도해 주세요");
      setDecomposed(null);
    } finally {
      setDecomposing(false);
    }
  }

  function selectStep(step: WorkStep) {
    setSelectedStep(step);
    setExecuted(null);
    setExecuteError(null);
    setFileError(null);
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setFileError(null);
    if (!f) return;
    const ext = f.name.toLowerCase().split(".").pop() ?? "";
    if (!["csv", "txt", "md"].includes(ext)) {
      setFileError(".csv / .txt / .md 파일만 업로드할 수 있습니다");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setFileError("파일은 500KB 이하만 업로드할 수 있습니다");
      return;
    }
    let text = await f.text();
    let note: string | null = null;
    if (ext === "csv") {
      const lines = text.split("\n");
      if (lines.length > MAX_CSV_ROWS) {
        text = lines.slice(0, MAX_CSV_ROWS).join("\n");
        note = `CSV가 커서 앞 ${MAX_CSV_ROWS}행만 사용합니다 (전체 ${lines.length}행)`;
      }
    }
    setFileSample({ name: f.name, text, note, fromPreset: false });
  }

  const pasteSample: SampleFile | null = pasteText.trim()
    ? {
        name: "직접 붙여넣기 입력",
        text: pasteText.trim(),
        note: null,
        fromPreset: false,
      }
    : null;
  const activeSample = fileSample ?? pasteSample ?? presetSample;

  async function runExecute() {
    if (!selectedStep || !decomposed || !activeSample) return;
    setExecuting(true);
    setExecuteError(null);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: selectedStep,
          task_title: decomposed.task_title,
          sample_data: activeSample.text,
          sample_filename: activeSample.name,
          ...(outputFormat.trim()
            ? { output_format: outputFormat.trim() }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExecuteError(data?.error ?? "실행에 실패했습니다");
        setExecuted(null);
        return;
      }
      setExecuted(data as ExecuteResult);
      setExecutedStepType(selectedStep.execution_type);
    } catch {
      setExecuteError("네트워크 오류 — 다시 시도해 주세요");
      setExecuted(null);
    } finally {
      setExecuting(false);
    }
  }

  // v2 — 자연어 수정: 결과물 + 지시 → /api/revise → 결과물 교체
  async function runRevise() {
    if (!executed || !revisionText.trim()) return;
    setRevising(true);
    setReviseError(null);
    try {
      const res = await fetch("/api/revise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result_artifact: executed.result_artifact,
          instruction: revisionText.trim(),
          task_title: decomposed?.task_title,
          ...(outputFormat.trim() ? { output_format: outputFormat.trim() } : {}),
          ...(activeSample ? { sample_data: activeSample.text } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviseError(data?.error ?? "수정에 실패했습니다");
        return;
      }
      const revised = data as {
        result_artifact: string;
        verification?: ExecuteResult["verification"];
      };
      setExecuted({
        ...executed,
        result_artifact: revised.result_artifact,
        ...(revised.verification
          ? { verification: revised.verification }
          : {}),
      });
      setRevisionText("");
    } catch {
      setReviseError("네트워크 오류 — 다시 시도해 주세요");
    } finally {
      setRevising(false);
    }
  }

  // v2 — 레시피 링크: 현재 워크플로(서술+분해+선택 단계+양식)를 URL로 인코딩해 복사
  async function copyRecipeLink() {
    if (!decomposed || !selectedStep) return;
    const payload: RecipePayload = {
      d: description,
      ...(frequency.trim() ? { fq: frequency.trim() } : {}),
      ...(manualMinutesNum ? { mm: manualMinutesNum } : {}),
      r: decomposed,
      s: selectedStep.id,
      ...(outputFormat.trim() ? { f: outputFormat.trim() } : {}),
    };
    const url = `${window.location.origin}${window.location.pathname}#r=${encodeRecipe(payload)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedRecipe(true);
      setTimeout(() => setCopiedRecipe(false), 2500);
    } catch {
      /* 클립보드 권한 거부 시 무시 */
    }
  }

  async function copyPromptPack() {
    if (!executed) return;
    try {
      await navigator.clipboard.writeText(executed.prompt_pack);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 권한 거부 시 무시 */
    }
  }

  function resetAll() {
    setDescription("");
    setFrequency("");
    setManualMinutes("");
    setPresetSample(null);
    setDecomposed(null);
    setSelectedStep(null);
    setFileSample(null);
    setFileError(null);
    setPasteText("");
    setExecuted(null);
    setExecutedStepType(null);
    setDecomposeError(null);
    setExecuteError(null);
    setOutputFormat("");
    setRevisionText("");
    setReviseError(null);
    setRecipeRestored(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function copyArtifact() {
    if (!executed) return;
    try {
      await navigator.clipboard.writeText(executed.result_artifact);
      setCopiedArtifact(true);
      setTimeout(() => setCopiedArtifact(false), 2000);
    } catch {
      /* 클립보드 권한 거부 시 무시 */
    }
  }

  function downloadArtifact() {
    if (!executed) return;
    const blob = new Blob([executed.result_artifact], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${decomposed?.task_title ?? "result"}-result.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const execSecondsLabel = (s: number) =>
    s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;

  const stage = executed ? 3 : decomposed ? 2 : 1;

  // 빈도 문자열 → 연간 횟수 (절감 시간 계산용. 추정치라 "약" 표기)
  const timesPerYear = (() => {
    const f = frequency.trim();
    if (!f) return null;
    const num = (f.match(/\d+/) ?? ["1"]).map(Number)[0] || 1;
    if (f.includes("매일") || f.includes("매번")) return 250;
    if (f.includes("격주")) return 26;
    if (f.includes("주")) return 52 * num;
    if (f.includes("월")) return 12 * num;
    if (f.includes("분기")) return 4 * num;
    if (f.includes("년")) return num;
    return null;
  })();

  const annualHoursSaved =
    executed && timesPerYear
      ? Math.round((executed.manual_minutes_est * timesPerYear) / 60)
      : null;

  const STAGES = ["업무 서술", "분해·선택", "실행·결과"];

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        {/* ============ 히어로 ============ */}
        <header className="mb-8 sm:mb-10">
          <h1 className="text-[28px] font-extrabold leading-[1.25] tracking-tight sm:text-4xl">
            조언이 아니라,
            <br />
            <span className="text-primary">실행.</span>
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground sm:text-base">
            반복 업무를 말로 적으면 AI가 단계로 분해하고, 샘플 데이터로 그
            자리에서 한 번 실행해 결과물을 보여줍니다.
          </p>
          {/* 진행 표시 — 토스 스타일 스텝 */}
          <div className="mt-5 flex items-center gap-1.5 text-xs sm:text-[13px]">
            {STAGES.map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-medium transition-colors",
                    stage === i + 1
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                      stage === i + 1
                        ? "bg-primary text-primary-foreground"
                        : stage > i + 1
                          ? "bg-[#e8f3ff] text-primary"
                          : "bg-secondary text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  {label}
                </span>
                {i < 2 && (
                  <ChevronRight className="size-3.5 text-muted-foreground/50" />
                )}
              </div>
            ))}
          </div>
        </header>

        {/* ============ [1] 서술 입력 ============ */}
        <Section>
          <h2 className="text-lg font-bold sm:text-xl">
            어떤 반복 업무를 자동화하고 싶으세요?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            업무를 말로 적어주세요. 파일 업로드는 3단계에서 합니다.
          </p>

          <div className="mt-5 space-y-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 매주 월요일 매출 CSV 정리해서 팀장님께 보고서로 올려요"
              rows={3}
              maxLength={1000}
              className="resize-y"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="frequency"
                  className="text-xs font-medium text-muted-foreground"
                >
                  반복 빈도 (선택)
                </Label>
                <Input
                  id="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  placeholder="예: 주 1회, 매일"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="manual-minutes"
                  className="text-xs font-medium text-muted-foreground"
                >
                  회당 수동 시간(분) (선택)
                </Label>
                <Input
                  id="manual-minutes"
                  type="number"
                  min={1}
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  placeholder="예: 40"
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground">
                입력할 내용이 없어도 괜찮습니다 — 예시를 눌러 바로 체험하세요.
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-[#e5e8eb]"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {presetSample && (
                <p className="flex items-center gap-1.5 text-xs text-[#00a661]">
                  <FileText className="size-3.5" />
                  예시 데이터({presetSample.name})가 준비됐습니다 — 3단계에서
                  바로 실행할 수 있습니다.
                </p>
              )}
            </div>

            {decomposeError && (
              <ErrorBox
                message={decomposeError}
                onRetry={runDecompose}
                retrying={decomposing}
              />
            )}

            <Button
              onClick={runDecompose}
              disabled={!description.trim() || decomposing}
              size="lg"
              className="w-full"
            >
              {decomposing ? (
                <>
                  <Loader2 className="animate-spin" />
                  업무를 분해하고 있습니다…
                </>
              ) : (
                "업무 분해하기"
              )}
            </Button>
          </div>
        </Section>

        {/* ============ [2] 분해 결과 ============ */}
        {decomposed && (
          <div ref={stepsRef} className="mt-4 scroll-mt-4 sm:mt-6">
            <Section>
              {recipeRestored && (
                <div className="mb-4 flex items-center gap-2 rounded-xl bg-[#e8f3ff] px-4 py-3 text-sm font-medium text-[#1b64da]">
                  <Link2 className="size-4 shrink-0" />
                  저장된 레시피를 불러왔습니다 — 새 데이터만 넣고 실행하세요.
                </div>
              )}
              <h2 className="text-lg font-bold sm:text-xl">
                {decomposed.task_title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {decomposed.steps.length}개 단계로 분해했습니다. 실행할 단계
                1개를 선택하세요 · 수동 소요 약{" "}
                {decomposed.manual_minutes_est}분
                {manualMinutesNum ? " (입력값)" : " (AI 추정)"}
              </p>

              <div className="mt-5 space-y-2.5">
                {decomposed.steps.map((step) => {
                  const meta = TYPE_META[step.execution_type];
                  const Icon = meta.icon;
                  const selected = selectedStep?.id === step.id;
                  const recommended = step.id === decomposed.recommended_step_id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => selectStep(step)}
                      className={cn(
                        "w-full rounded-2xl border-2 p-4 text-left transition-all sm:p-5",
                        selected
                          ? "border-primary bg-[#f5f9ff]"
                          : "border-transparent bg-secondary hover:bg-[#e9edf2]"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                          <span className="text-[15px] font-bold sm:text-base">
                            {step.id}. {step.name}
                          </span>
                          {recommended && (
                            <span className="rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                              추천
                            </span>
                          )}
                        </div>
                        <span
                          className={cn(
                            "mt-0.5 flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold",
                            meta.badgeClass
                          )}
                        >
                          <Icon className="size-3" />
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ScoreDots score={step.score} />
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                        {step.rationale}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* 선택된 단계의 실행/안내 패널 */}
              {selectedStep && (
                <div className="mt-4 rounded-2xl bg-[#f5f9ff] p-4 sm:p-5">
                  {selectedStep.execution_type === "executable" ? (
                    <div className="space-y-3.5">
                      <p className="text-[15px] font-bold">
                        「{selectedStep.name}」 단계를 지금 바로 실행합니다.
                      </p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        샘플 파일(CSV/TXT/MD, 500KB 이하)을 업로드하거나 직접
                        붙여넣으세요. 서버에 저장되지 않습니다.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Label
                          htmlFor="sample-file"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
                        >
                          <Upload className="size-4" />
                          파일 업로드
                        </Label>
                        <input
                          id="sample-file"
                          type="file"
                          accept=".csv,.txt,.md"
                          className="hidden"
                          onChange={onFileChange}
                        />
                        {activeSample && (
                          <span className="flex items-center gap-1.5 text-sm font-medium text-[#00a661]">
                            <FileText className="size-4" />
                            {activeSample.name}
                            {activeSample.fromPreset && " (예시 데이터)"}
                          </span>
                        )}
                      </div>
                      <Textarea
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        placeholder="또는 여기에 샘플 데이터를 직접 붙여넣으세요 (CSV 행, 텍스트 등)"
                        className="min-h-[80px] bg-background text-xs"
                      />
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="output-format"
                          className="text-xs font-medium text-muted-foreground"
                        >
                          결과 양식 (선택) — 우리 팀 보고서 포맷을 붙여넣으면
                          그대로 채웁니다
                        </Label>
                        <Textarea
                          id="output-format"
                          value={outputFormat}
                          onChange={(e) => setOutputFormat(e.target.value)}
                          placeholder={"예: | 항목 | 값 | 비고 |\n|---|---|---|\n| 총 매출 | | |\n| 전주 대비 | | |"}
                          className="min-h-[70px] bg-background font-mono text-xs"
                        />
                      </div>
                      {activeSample?.note && (
                        <p className="text-xs text-[#c26a00]">
                          {activeSample.note} — 샘플 기준 실행 결과가
                          표시됩니다.
                        </p>
                      )}
                      {fileError && (
                        <p className="flex items-center gap-1.5 text-sm text-destructive">
                          <AlertTriangle className="size-4" />
                          {fileError}
                        </p>
                      )}
                      {executeError && (
                        <ErrorBox
                          message={executeError}
                          onRetry={runExecute}
                          retrying={executing}
                        />
                      )}
                      <Button
                        onClick={runExecute}
                        disabled={!activeSample || executing}
                        size="lg"
                        className="w-full"
                      >
                        {executing ? (
                          <>
                            <Loader2 className="animate-spin" />
                            실행 중… (LLM이 데이터를 실제로 처리하고 있습니다)
                          </>
                        ) : (
                          <>
                            <Zap />
                            {activeSample
                              ? "실행하기"
                              : "샘플 데이터를 선택해 주세요"}
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <NonExecutablePanel
                      step={selectedStep}
                      hasSample={!!activeSample}
                      executing={executing}
                      executeError={executeError}
                      fileError={fileError}
                      onFileChange={onFileChange}
                      onRun={runExecute}
                      sampleName={activeSample?.name ?? null}
                    />
                  )}
                </div>
              )}
            </Section>
          </div>
        )}

        {/* ============ [3] 실행 결과 ============ */}
        {executed && (
          <div ref={resultRef} className="mt-4 scroll-mt-4 sm:mt-6">
            <Section>
              <h2 className="text-lg font-bold sm:text-xl">
                {executedStepType === "executable"
                  ? "실행 결과"
                  : "생성된 아티팩트"}
              </h2>
              {executedStepType !== "executable" && (
                <p className="mt-1 text-sm text-muted-foreground">
                  외부 연동/사람 승인 단계라 실행 대신 아티팩트를 생성했습니다.
                </p>
              )}

              {/* 임팩트 스탯 — 토스 스타일 큰 숫자 */}
              <div className="mt-5 rounded-2xl bg-secondary p-5 sm:p-6">
                <div className="flex flex-wrap items-end gap-x-6 gap-y-4 sm:gap-x-8">
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      수동 작업
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tracking-tight text-muted-foreground line-through decoration-muted-foreground/40 sm:text-3xl">
                      {executed.manual_minutes_est}분
                    </p>
                  </div>
                  <div className="pb-1.5 text-xl text-muted-foreground/60">
                    →
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-muted-foreground">
                      AI 실행
                      {executed.cached && " · 프리셋 사전 실측"}
                    </p>
                    <p className="mt-0.5 text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
                      {execSecondsLabel(executed.execution_seconds)}
                    </p>
                  </div>
                </div>
                {annualHoursSaved !== null && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-[15px] font-semibold">
                      이 빈도로 반복하면{" "}
                      <span className="text-[#00a661]">
                        연 약 {annualHoursSaved}시간
                      </span>
                      을 아낄 수 있습니다
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold">결과물</h3>
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyArtifact}
                    className="gap-1"
                  >
                    {copiedArtifact ? (
                      <>
                        <Check className="size-3.5 text-[#00a661]" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        복사
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadArtifact}
                    className="gap-1"
                  >
                    <Download className="size-3.5" />
                    .md
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-[15px]">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents}
                >
                  {executed.result_artifact}
                </ReactMarkdown>
              </div>

              {/* v2 — 검증 카드: 결과물 속 수치·사실을 샘플 데이터와 대조 */}
              {executed.verification && executed.verification.items.length > 0 && (
                <div className="mt-6 rounded-2xl border border-[#d6e8ff] bg-[#f5f9ff] p-5">
                  <h3 className="flex items-center gap-1.5 text-[15px] font-bold text-[#1b64da]">
                    <ShieldCheck className="size-4" />
                    검증 카드
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {executed.verification.summary}
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {executed.verification.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span
                          className={cn(
                            "mt-0.5 flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold",
                            item.status === "ok"
                              ? "bg-[#e3f9e9] text-[#00a661]"
                              : "bg-[#fff3e0] text-[#c26a00]"
                          )}
                        >
                          {item.status === "ok" ? "일치" : "확인"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium leading-relaxed">
                            {item.claim}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                            근거: {item.basis}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* v2 — 자연어 수정 */}
              <div className="mt-6 rounded-2xl bg-secondary p-5">
                <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
                  <Wand2 className="size-4 text-primary" />
                  자연어로 수정
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  결과물을 바꾸고 싶은 대로 말해주세요 — 데이터에 없는 수치는
                  지어내지 않습니다.
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={revisionText}
                    onChange={(e) => setRevisionText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") runRevise();
                    }}
                    placeholder="예: 전주 대비 행 빼고, 표 아래 한 줄 요약 추가해줘"
                    className="bg-background"
                    disabled={revising}
                  />
                  <Button
                    onClick={runRevise}
                    disabled={!revisionText.trim() || revising}
                    className="shrink-0"
                  >
                    {revising ? (
                      <>
                        <Loader2 className="animate-spin" />
                        수정 중…
                      </>
                    ) : (
                      "수정 적용"
                    )}
                  </Button>
                </div>
                {reviseError && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-destructive">
                    <AlertTriangle className="size-4" />
                    {reviseError}
                  </p>
                )}
              </div>

              <div className="mt-6 rounded-2xl bg-secondary p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-bold">
                    재사용 프롬프트팩 · SOP
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPromptPack}
                    className="gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-[#00a661]" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        복사
                      </>
                    )}
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={mdComponents}
                  >
                    {executed.prompt_pack}
                  </ReactMarkdown>
                </div>
              </div>

              {executed.caveats.length > 0 && (
                <div className="mt-4 rounded-2xl bg-[#fff8e6] p-5">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-[#c26a00]">
                    <AlertTriangle className="size-4" />
                    확인 필요 사항
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#8a5a00]">
                    {executed.caveats.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* v2 — 레시피 링크: 다음 주엔 데이터만 교체 */}
              <div className="mt-6 rounded-2xl border border-border p-5">
                <h3 className="flex items-center gap-1.5 text-[15px] font-bold">
                  <Link2 className="size-4 text-primary" />
                  다음 주엔 데이터만 바꾸세요
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  이 링크를 저장해두면 업무 서술·분해·선택 단계·양식이 그대로
                  불려옵니다 — 다음 주엔 새 데이터만 넣고 바로 실행.
                </p>
                <Button
                  variant="outline"
                  onClick={copyRecipeLink}
                  className="mt-3 w-full gap-1.5 sm:w-auto"
                >
                  {copiedRecipe ? (
                    <>
                      <Check className="size-4 text-[#00a661]" />
                      레시피 링크 복사됨
                    </>
                  ) : (
                    <>
                      <Link2 className="size-4" />
                      레시피 링크 복사
                    </>
                  )}
                </Button>
              </div>

              <Button
                variant="secondary"
                size="lg"
                onClick={resetAll}
                className="mt-6 w-full gap-1.5"
              >
                <RotateCcw className="size-4" />
                처음부터 다시 하기
              </Button>
            </Section>
          </div>
        )}

        <footer className="mt-10 text-center text-xs leading-relaxed text-muted-foreground">
          조언이 아니라 실행 — 샘플 데이터를 넣으면 결과물이 나옵니다.
          <br />
          파일은 서버에 저장되지 않습니다.
        </footer>
      </div>
    </div>
  );
}

// §7 — integration_needed / human_judgment: 실행 대신 안내 패널
function NonExecutablePanel({
  step,
  hasSample,
  executing,
  executeError,
  fileError,
  onFileChange,
  onRun,
  sampleName,
}: {
  step: WorkStep;
  hasSample: boolean;
  executing: boolean;
  executeError: string | null;
  fileError: string | null;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRun: () => void;
  sampleName: string | null;
}) {
  const isIntegration = step.execution_type === "integration_needed";
  return (
    <div className="space-y-3.5">
      <p className="text-[15px] font-bold">「{step.name}」</p>
      {isIntegration ? (
        <p className="text-sm leading-relaxed text-muted-foreground">
          이 단계는 메일 발송·사내 DB·외부 채널 등{" "}
          <strong className="text-foreground">외부 시스템 연동</strong>이 필요해
          이 자리에서 바로 실행할 수 없습니다. 대신 연동 방법 안내와 재사용
          프롬프트팩·SOP를 생성해 드릴 수 있습니다.
        </p>
      ) : (
        <p className="text-sm leading-relaxed text-muted-foreground">
          이 단계는 <strong className="text-foreground">사람 판단이 핵심</strong>
          이라 전면 자동화를 권장하지 않습니다. &quot;AI 초안 + 사람 승인&quot;
          반자동 설계를 권장하며, 참고용 아티팩트를 생성해 드릴 수 있습니다.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor={`sample-file-${step.id}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <Upload className="size-4" />
          샘플 파일 (선택)
        </Label>
        <input
          id={`sample-file-${step.id}`}
          type="file"
          accept=".csv,.txt,.md"
          className="hidden"
          onChange={onFileChange}
        />
        {sampleName && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-[#00a661]">
            <FileText className="size-4" />
            {sampleName}
          </span>
        )}
      </div>
      {fileError && (
        <p className="flex items-center gap-1.5 text-sm text-destructive">
          <AlertTriangle className="size-4" />
          {fileError}
        </p>
      )}
      {executeError && (
        <ErrorBox message={executeError} onRetry={onRun} retrying={executing} />
      )}
      <Button
        variant="secondary"
        onClick={onRun}
        disabled={!hasSample || executing}
        className="w-full sm:w-auto"
      >
        {executing ? (
          <>
            <Loader2 className="animate-spin" />
            아티팩트 생성 중…
          </>
        ) : (
          <>
            <FileText />
            {hasSample
              ? "아티팩트(프롬프트팩·SOP) 생성"
              : "샘플 데이터가 있으면 아티팩트를 생성할 수 있습니다"}
          </>
        )}
      </Button>
    </div>
  );
}
