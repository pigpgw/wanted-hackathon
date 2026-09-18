"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  AlertTriangle,
  Check,
  Copy,
  FileText,
  Loader2,
  Plug,
  RotateCcw,
  Sparkles,
  Upload,
  UserCheck,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

const TYPE_META: Record<
  ExecutionType,
  { label: string; className: string; icon: typeof Zap }
> = {
  executable: {
    label: "실행 가능",
    className: "border-emerald-300 bg-emerald-50 text-emerald-700",
    icon: Zap,
  },
  integration_needed: {
    label: "연동 필요",
    className: "border-amber-300 bg-amber-50 text-amber-700",
    icon: Plug,
  },
  human_judgment: {
    label: "사람 판단",
    className: "border-slate-300 bg-slate-100 text-slate-600",
    icon: UserCheck,
  },
};

// 결과물 마크다운 — 표 스타일링 필수 (remark-gfm)
const mdComponents: Components = {
  h2: (props) => (
    <h2 className="mt-6 mb-2 text-lg font-bold first:mt-0" {...props} />
  ),
  h3: (props) => (
    <h3 className="mt-5 mb-1.5 text-base font-semibold" {...props} />
  ),
  h4: (props) => (
    <h4 className="mt-4 mb-1 text-sm font-semibold" {...props} />
  ),
  p: (props) => <p className="my-2 leading-relaxed" {...props} />,
  ul: (props) => <ul className="my-2 list-disc space-y-1 pl-5" {...props} />,
  ol: (props) => <ol className="my-2 list-decimal space-y-1 pl-5" {...props} />,
  li: (props) => <li className="leading-relaxed" {...props} />,
  table: (props) => (
    <div className="my-3 overflow-x-auto rounded-md border">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => <thead className="bg-muted" {...props} />,
  th: (props) => (
    <th
      className="border-b px-3 py-2 text-left font-semibold whitespace-nowrap"
      {...props}
    />
  ),
  td: (props) => (
    <td className="border-b px-3 py-2 align-top last:[tr:last-child_&]:border-0" {...props} />
  ),
  code: (props) => (
    <code
      className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]"
      {...props}
    />
  ),
  pre: (props) => (
    <pre
      className="my-3 overflow-x-auto rounded-md bg-muted p-3 text-sm"
      {...props}
    />
  ),
  blockquote: (props) => (
    <blockquote
      className="my-3 border-l-4 border-muted-foreground/30 pl-3 text-muted-foreground"
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
            "size-2.5 rounded-full",
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
    <div className="flex items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <span className="flex items-center gap-2">
        <AlertTriangle className="size-4 shrink-0" />
        {message}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={retrying}
        className="shrink-0"
      >
        {retrying ? <Loader2 className="animate-spin" /> : null}
        재시도
      </Button>
    </div>
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

  // [3] 실행 결과 상태
  const [executed, setExecuted] = useState<ExecuteResult | null>(null);
  const [executedStepType, setExecutedStepType] =
    useState<ExecutionType | null>(null);
  const [copied, setCopied] = useState(false);

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

  const activeSample = fileSample ?? presetSample;

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
    setExecuted(null);
    setExecutedStepType(null);
    setDecomposeError(null);
    setExecuteError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const execSecondsLabel = (s: number) =>
    s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`;

  const stage = executed ? 3 : decomposed ? 2 : 1;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          업무→실행 자동화기
        </h1>
        <p className="mt-2 text-muted-foreground">
          반복 업무를 말로 적으면, AI가 단계로 분해하고 샘플 데이터로{" "}
          <strong className="text-foreground">그 자리에서 실제로 한 번 실행</strong>
          해 결과물을 보여줍니다.
        </p>
        {/* 3단계 표시 */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs sm:text-sm">
          {["1. 업무 서술", "2. 분해·단계 선택", "3. 실행·결과"].map(
            (label, i) => (
              <span key={label} className="flex items-center gap-2">
                <span
                  className={cn(
                    "rounded-full border px-3 py-1",
                    stage === i + 1
                      ? "border-primary bg-primary text-primary-foreground"
                      : stage > i + 1
                        ? "border-primary/40 text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {label}
                </span>
                {i < 2 && <span className="text-muted-foreground">→</span>}
              </span>
            )
          )}
        </div>
      </header>

      {/* ============ [1] 서술 입력 ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
              1
            </span>
            어떤 반복 업무를 자동화하고 싶으세요?
          </CardTitle>
          <CardDescription>
            업무를 말로 적어주세요. 파일 업로드는 3단계에서 합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <Label htmlFor="frequency">반복 빈도 (선택)</Label>
              <Input
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                placeholder="예: 주 1회, 매일"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-minutes">회당 수동 시간(분) (선택)</Label>
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

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              입력할 내용이 없어도 괜찮습니다 — 예시를 눌러 바로 체험하세요.
            </p>
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => (
                <Button
                  key={p.id}
                  variant="secondary"
                  size="sm"
                  onClick={() => applyPreset(p)}
                >
                  <Sparkles className="size-3.5" />
                  {p.label}
                </Button>
              ))}
            </div>
            {presetSample && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-700">
                <FileText className="size-3.5" />
                예시 데이터({presetSample.name})가 준비됐습니다 — 3단계에서 바로
                실행할 수 있습니다.
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
            className="w-full sm:w-auto"
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
        </CardContent>
      </Card>

      {/* ============ [2] 분해 결과 ============ */}
      {decomposed && (
        <div ref={stepsRef} className="mt-8 scroll-mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </span>
                {decomposed.task_title}
              </CardTitle>
              <CardDescription>
                {decomposed.steps.length}개 단계로 분해했습니다. 실행할 단계
                1개를 선택하세요. 수동 소요 시간: 약{" "}
                {decomposed.manual_minutes_est}분
                {manualMinutesNum ? "(입력값)" : "(AI 추정)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
                      "w-full rounded-lg border p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "hover:border-primary/40 hover:bg-accent/50",
                      recommended && !selected && "border-primary/40"
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {step.id}.
                      </span>
                      <span className="font-medium">{step.name}</span>
                      {recommended && (
                        <Badge className="border-transparent bg-primary text-primary-foreground">
                          추천
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn("gap-1", meta.className)}
                      >
                        <Icon className="size-3" />
                        {meta.label}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ScoreDots score={step.score} />
                    </div>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {step.rationale}
                    </p>
                  </button>
                );
              })}

              {/* 선택된 단계의 실행/안내 패널 */}
              {selectedStep && (
                <div className="rounded-lg border bg-muted/40 p-4">
                  {selectedStep.execution_type === "executable" ? (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">
                        「{selectedStep.name}」 단계를 지금 바로 실행합니다.
                      </p>
                      <p className="text-sm text-muted-foreground">
                        샘플 파일(CSV/TXT/MD, 500KB 이하)을 업로드하거나, 예시
                        데이터로 실행하세요. 서버에 저장되지 않습니다.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Label
                          htmlFor="sample-file"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
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
                          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
                            <FileText className="size-4" />
                            {activeSample.name}
                            {activeSample.fromPreset && " (예시 데이터)"}
                          </span>
                        )}
                      </div>
                      {activeSample?.note && (
                        <p className="text-xs text-amber-700">
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
                      >
                        {executing ? (
                          <>
                            <Loader2 className="animate-spin" />
                            실행 중… (LLM이 데이터를 실제로 처리하고 있습니다)
                          </>
                        ) : (
                          <>
                            <Zap />
                            {activeSample ? "실행하기" : "샘플 데이터를 선택해 주세요"}
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
            </CardContent>
          </Card>
        </div>
      )}

      {/* ============ [3] 실행 결과 ============ */}
      {executed && (
        <div ref={resultRef} className="mt-8 scroll-mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </span>
                {executedStepType === "executable"
                  ? "실행 결과"
                  : "생성된 아티팩트"}
              </CardTitle>
              <CardDescription>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                    수동 {executed.manual_minutes_est}분 →{" "}
                    {execSecondsLabel(executed.execution_seconds)}
                  </span>
                  {executedStepType !== "executable" && (
                    <span className="text-xs">
                      외부 연동/사람 승인 단계라 실행 대신 아티팩트를
                      생성했습니다.
                    </span>
                  )}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-sm">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={mdComponents}
                >
                  {executed.result_artifact}
                </ReactMarkdown>
              </div>

              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    재사용 프롬프트팩 · SOP
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyPromptPack}
                    className="gap-1.5"
                  >
                    {copied ? (
                      <>
                        <Check className="size-3.5 text-emerald-600" />
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
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-amber-800">
                    <AlertTriangle className="size-4" />
                    확인 필요 사항
                  </h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
                    {executed.caveats.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Button variant="outline" onClick={resetAll} className="gap-1.5">
                <RotateCcw className="size-4" />
                처음부터
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        조언이 아니라 실행 — 샘플 데이터를 넣으면 결과물이 나옵니다. 파일은
        서버에 저장되지 않습니다.
      </footer>
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
    <div className="space-y-3">
      <p className="text-sm font-medium">「{step.name}」</p>
      {isIntegration ? (
        <p className="text-sm text-muted-foreground">
          이 단계는 메일 발송·사내 DB·외부 채널 등{" "}
          <strong className="text-foreground">외부 시스템 연동</strong>이 필요해
          이 자리에서 바로 실행할 수 없습니다. 대신 연동 방법 안내와 재사용
          프롬프트팩·SOP를 생성해 드릴 수 있습니다.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          이 단계는 <strong className="text-foreground">사람 판단이 핵심</strong>
          이라 전면 자동화를 권장하지 않습니다. &quot;AI 초안 + 사람 승인&quot;
          반자동 설계를 권장하며, 참고용 아티팩트를 생성해 드릴 수 있습니다.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Label
          htmlFor={`sample-file-${step.id}`}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-accent"
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
          <span className="flex items-center gap-1.5 text-sm text-emerald-700">
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
