import Anthropic from "@anthropic-ai/sdk";
import {
  EMPTY_LEASE_FORM,
  type LeaseFormValues,
} from "@/types/lease";

/** 빠른·저비용 추출용 */
export const LEASE_EXTRACT_MODEL = "claude-haiku-5-5";

const EXTRACT_SYSTEM = `당신은 한국 상가 임대차 계약서에서 사실 필드만 추출하는 도우미입니다.
법률 해석·조언은 하지 마세요.
계약서에 보이는 값만 채우고, 없으면 빈 문자열("")을 쓰세요.
날짜는 YYYY-MM-DD, 금액은 숫자만(원 단위), 납부일은 1~31 입니다.
monthlyRent는 월 임대료만(관리비 제외). managementFee는 월 관리비(없으면 "").`;

const LEASE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "room",
    "tenantName",
    "firstContractDate",
    "currentStartDate",
    "currentEndDate",
    "deposit",
    "monthlyRent",
    "managementFee",
    "paymentDay",
    "specialTerms",
  ],
  properties: {
    room: { type: "string" },
    tenantName: { type: "string" },
    firstContractDate: { type: "string" },
    currentStartDate: { type: "string" },
    currentEndDate: { type: "string" },
    deposit: { type: "string" },
    monthlyRent: { type: "string" },
    managementFee: { type: "string" },
    paymentDay: { type: "string" },
    specialTerms: { type: "string" },
  },
} as const;

export type ExtractLeaseResult =
  | { ok: true; values: LeaseFormValues }
  | { ok: false; values: LeaseFormValues; error: string };

function normalizeDate(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "number") return "";
  const trimmed = String(raw).trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const m = trimmed.match(/^(\d{4})[./](\d{1,2})[./](\d{1,2})$/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

function normalizeMoney(raw: unknown): string {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(Math.round(raw));
  }
  if (raw == null) return "";
  const digits = String(raw).replace(/[^\d]/g, "");
  return digits;
}

function normalizeDay(raw: unknown): string {
  if (typeof raw === "number" && raw >= 1 && raw <= 31) {
    return String(Math.trunc(raw));
  }
  if (raw == null) return "";
  const digits = String(raw).replace(/[^\d]/g, "");
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 1 || n > 31) return "";
  return String(n);
}

function asString(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).trim();
}

export function parseLeaseExtractJson(text: string): LeaseFormValues {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  return {
    room: asString(parsed.room),
    tenantName: asString(parsed.tenantName),
    firstContractDate: normalizeDate(parsed.firstContractDate),
    currentStartDate: normalizeDate(parsed.currentStartDate),
    currentEndDate: normalizeDate(parsed.currentEndDate),
    deposit: normalizeMoney(parsed.deposit),
    monthlyRent: normalizeMoney(parsed.monthlyRent),
    managementFee: normalizeMoney(parsed.managementFee),
    paymentDay: normalizeDay(parsed.paymentDay),
    specialTerms: asString(parsed.specialTerms),
  };
}

function collectText(content: Anthropic.Messages.ContentBlock[]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
  }
  return parts.join("\n").trim();
}

function mediaTypeFor(
  contentType: string | undefined,
  fileName: string,
):
  | "application/pdf"
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/gif"
  | null {
  const lowerName = fileName.toLowerCase();
  const ct = (contentType ?? "").toLowerCase();

  if (ct.includes("pdf") || lowerName.endsWith(".pdf")) {
    return "application/pdf";
  }
  if (
    ct.includes("jpeg") ||
    ct.includes("jpg") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }
  if (ct.includes("png") || lowerName.endsWith(".png")) {
    return "image/png";
  }
  if (ct.includes("webp") || lowerName.endsWith(".webp")) {
    return "image/webp";
  }
  if (ct.includes("gif") || lowerName.endsWith(".gif")) {
    return "image/gif";
  }
  return null;
}

export async function extractLeaseFromFile(input: {
  bytes: Uint8Array;
  contentType?: string;
  fileName: string;
  apiKey: string;
}): Promise<ExtractLeaseResult> {
  if (input.bytes.byteLength === 0) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error: "파일이 비어 있습니다. 다시 업로드해 주세요.",
    };
  }

  const mediaType = mediaTypeFor(input.contentType, input.fileName);
  if (!mediaType) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error:
        "지원하지 않는 파일 형식입니다. PDF 또는 JPG/PNG/WebP로 올리거나 아래 폼에 직접 입력하세요.",
    };
  }

  const base64 = Buffer.from(input.bytes).toString("base64");
  const client = new Anthropic({ apiKey: input.apiKey });

  const fileBlock =
    mediaType === "application/pdf"
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: base64,
          },
        };

  try {
    const response = await client.messages.create({
      model: LEASE_EXTRACT_MODEL,
      max_tokens: 4096,
      // 추출은 thinking 불필요 — 토큰이 사고로 비는 것 방지
      thinking: { type: "disabled" },
      output_config: {
        effort: "low",
        format: {
          type: "json_schema",
          schema: LEASE_JSON_SCHEMA,
        },
      },
      system: EXTRACT_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: "이 상가 임대차 계약서에서 지정된 JSON 필드를 추출하세요.",
            },
          ],
        },
      ],
    });

    const text = collectText(response.content);
    const blockTypes = response.content.map((b) => b.type).join(",");

    if (!text) {
      return {
        ok: false,
        values: EMPTY_LEASE_FORM,
        error: `추출 결과가 비어 있습니다. (stop=${response.stop_reason ?? "?"}, blocks=${blockTypes || "none"}) PDF/JPG로 다시 올리거나 폼에 직접 입력하세요.`,
      };
    }

    try {
      const values = parseLeaseExtractJson(text);
      return { ok: true, values };
    } catch {
      return {
        ok: false,
        values: EMPTY_LEASE_FORM,
        error:
          "추출 응답 형식을 읽지 못했습니다. 아래 빈 폼에 직접 입력하세요.",
      };
    }
  } catch (err) {
    return {
      ok: false,
      values: EMPTY_LEASE_FORM,
      error: humanizeExtractError(err),
    };
  }
}

function humanizeExtractError(err: unknown): string {
  const message =
    err && typeof err === "object" && "message" in err
      ? String((err as { message: unknown }).message)
      : "";

  if (/credit balance is too low/i.test(message)) {
    return "Anthropic API 크레딧이 부족합니다. console.anthropic.com → Plans & Billing에서 충전한 뒤 다시 시도하세요. 지금은 아래 폼에 직접 입력할 수 있습니다.";
  }
  if (/invalid.*api.?key|authentication/i.test(message)) {
    return "Anthropic API 키가 올바르지 않습니다. .env.local의 ANTHROPIC_API_KEY를 확인하세요.";
  }
  if (/rate limit/i.test(message)) {
    return "API 요청이 너무 많습니다. 잠시 후 다시 시도하거나 폼에 직접 입력하세요.";
  }
  if (/output_config|json_schema|thinking/i.test(message)) {
    return `자동 추출 설정 오류: ${message.slice(0, 160)}`;
  }

  // 상태코드만 짧게
  const status =
    err && typeof err === "object" && "status" in err
      ? String((err as { status: unknown }).status)
      : "";
  if (status) {
    return `자동 추출에 실패했습니다. (API ${status}) 아래 폼에 직접 입력하세요.`;
  }

  return "자동 추출에 실패했습니다. 아래 빈 폼에 직접 입력한 뒤 확인하세요.";
}
