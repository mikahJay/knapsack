import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

export const PHOTO_IMPORT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_IMPORT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PHOTO_IMPORT_MIN_DIMENSION = 640;

// Maximum decoded byte length accepted for imageBase64 values arriving in JSON
// bodies (e.g. the commit endpoint). Matches PHOTO_IMPORT_MAX_SIZE_BYTES.
export const PHOTO_IMPORT_MAX_BASE64_DECODED_BYTES = PHOTO_IMPORT_MAX_SIZE_BYTES;

// ── Magic-byte signatures for every allowed MIME type ─────────────────────────
const MAGIC_BYTES: Array<{ mime: string; bytes: number[]; offset: number }> = [
  // JPEG: FF D8 FF
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff], offset: 0 },
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], offset: 0 },
  // WebP: "RIFF" at 0 and "WEBP" at 8
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
];

/**
 * Returns true when the leading bytes of `buf` match the expected magic
 * signature for the declared MIME type.  Returns false if the MIME type is
 * unknown or the signature does not match.
 */
export function validateMagicBytes(buf: Buffer, declaredMime: string): boolean {
  if (buf.length < 12) return false;

  for (const sig of MAGIC_BYTES) {
    if (sig.mime !== declaredMime) continue;

    const matches = sig.bytes.every((b, i) => buf[sig.offset + i] === b);
    if (!matches) return false;

    // Extra check for WebP: bytes 8–11 must be "WEBP"
    if (declaredMime === 'image/webp') {
      const webp = [0x57, 0x45, 0x42, 0x50];
      if (!webp.every((b, i) => buf[8 + i] === b)) return false;
    }

    return true;
  }

  return false;
}

export type PhotoImportReasonCode =
  | 'UNSUPPORTED_MIME'
  | 'FILE_TOO_LARGE'
  | 'DIMENSIONS_TOO_SMALL'
  | 'MODERATION_UNSAFE'
  | 'MODERATION_AMBIGUOUS'
  | 'TEXT_POLICY_VIOLATION'
  | 'NOT_A_RESOURCE_IMAGE'
  | 'INTERNAL_ERROR';

export type PhotoModerationVerdict = 'safe' | 'unsafe' | 'ambiguous';
export type ResourcePhotoVerdict = 'resource' | 'not_resource';

export interface UploadedPhotoMetadata {
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  fileName?: string | null;
  imageBase64?: string | null;
}

export interface ResourcePhotoBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResourcePhotoDetection {
  label: string;
  confidence: number;
  box: ResourcePhotoBoundingBox;
}

export interface ResourcePhotoAttachment {
  mimeType: string;
  imageBase64: string;
  width: number;
  height: number;
  focusBox: ResourcePhotoBoundingBox | null;
  detections: ResourcePhotoDetection[];
}

export interface PhotoImportPolicyInput extends UploadedPhotoMetadata {
  moderationVerdict: PhotoModerationVerdict;
  relevanceVerdict: ResourcePhotoVerdict;
  extractedText?: string | null;
}

export interface ResourcePhotoDraftPreview {
  title: string;
  description: string | null;
  quantity: number;
  status: 'available' | 'allocated' | 'retired';
  is_public: false;
  available_until: string | null;
  evidence_status: 'photo_attached';
  photo?: ResourcePhotoAttachment;
}

export interface PhotoImportDiagnostics {
  provider: 'claude' | 'stub';
  model: string;
  usedVision: boolean;
  latencyMs: number;
  moderationVerdict: PhotoModerationVerdict;
  relevanceVerdict: ResourcePhotoVerdict;
  extractedTextPreview: string;
  detectionsCount?: number;
}

export interface PhotoImportRejectResult {
  status: 'reject';
  code: PhotoImportReasonCode;
  message: string;
  diagnostics?: PhotoImportDiagnostics;
}

export interface PhotoImportAllowResult {
  status: 'allow';
  draft: ResourcePhotoDraftPreview;
  additionalDrafts?: ResourcePhotoDraftPreview[];
  diagnostics?: PhotoImportDiagnostics;
}

export type PhotoImportPolicyResult = PhotoImportRejectResult | PhotoImportAllowResult;

export interface PhotoImportServices {
  getModerationVerdict(file: UploadedPhotoMetadata): Promise<PhotoModerationVerdict>;
  getRelevanceVerdict(file: UploadedPhotoMetadata): Promise<ResourcePhotoVerdict>;
  extractText(file: UploadedPhotoMetadata): Promise<string>;
  analyzePhoto?(file: UploadedPhotoMetadata): Promise<PhotoAnalysisResult>;
}

interface PhotoAnalysisResult {
  moderationVerdict: PhotoModerationVerdict;
  relevanceVerdict: ResourcePhotoVerdict;
  extractedText: string;
  drafts: ResourcePhotoDraftPreview[];
  diagnostics: PhotoImportDiagnostics;
}

function buildDraftPreview(): ResourcePhotoDraftPreview {
  return {
    title: 'Photo resource draft',
    description: null,
    quantity: 1,
    status: 'available',
    is_public: false,
    available_until: null,
    evidence_status: 'photo_attached',
  };
}

function reject(code: PhotoImportReasonCode): PhotoImportRejectResult {
  return {
    status: 'reject',
    code,
    message: 'Photo cannot be processed.',
  };
}

function containsPolicyText(text: string | null | undefined): boolean {
  if (!text) return false;
  // Broad list of terms that indicate adult / harmful content.
  // Claude is asked to extract visible text, so matching here adds a
  // defence-in-depth layer on top of the moderation verdict.
  return /(explicit|nude|nudity|naked|nsfw|fetish|sexual|xxx|porn|hentai|adult.?content|18\+|onlyfans|escort|cam.?girl|live.?sex|sex.?chat|violence|gore|weapon|firearm|gun|knife|drug|cocaine|heroin|meth|fentanyl|cannabis\s+deal|weed\s+for\s+sale|hate\s+speech|racial.?slur|child\s+abuse|cp\b)/i.test(text);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function normalizeBoundingBox(raw: Record<string, unknown> | undefined): ResourcePhotoBoundingBox | null {
  if (!raw) return null;
  const x = clamp01(Number(raw['x']));
  const y = clamp01(Number(raw['y']));
  const width = clamp01(Number(raw['width']));
  const height = clamp01(Number(raw['height']));
  if (width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function buildAttachment(
  file: UploadedPhotoMetadata,
  focusBox: ResourcePhotoBoundingBox | null,
  detections: ResourcePhotoDetection[]
): ResourcePhotoAttachment | undefined {
  if (!file.imageBase64) return undefined;
  return {
    mimeType: file.mimeType,
    imageBase64: file.imageBase64,
    width: file.width,
    height: file.height,
    focusBox,
    detections,
  };
}

function normalizeDraft(
  raw: Record<string, unknown>,
  file: UploadedPhotoMetadata,
  detections: ResourcePhotoDetection[]
): ResourcePhotoDraftPreview {
  const title = typeof raw['title'] === 'string' && raw['title'].trim().length > 0
    ? raw['title'].trim()
    : 'Photo resource draft';

  const description = typeof raw['description'] === 'string'
    ? raw['description'].trim() || null
    : null;

  const quantityRaw = typeof raw['quantity'] === 'number' ? raw['quantity'] : Number(raw['quantity']);
  const quantity = Number.isFinite(quantityRaw) && quantityRaw >= 1 ? Math.floor(quantityRaw) : 1;

  const allowedStatus = new Set(['available', 'allocated', 'retired']);
  const statusCandidate = typeof raw['status'] === 'string' ? raw['status'] : 'available';
  const status = allowedStatus.has(statusCandidate)
    ? (statusCandidate as ResourcePhotoDraftPreview['status'])
    : 'available';

  const availableUntil = typeof raw['available_until'] === 'string' && raw['available_until'].trim().length > 0
    ? raw['available_until'].trim()
    : null;

  const focusBox = normalizeBoundingBox(
    raw['bbox'] && typeof raw['bbox'] === 'object' ? (raw['bbox'] as Record<string, unknown>) : undefined
  );

  return {
    title,
    description,
    quantity,
    status,
    is_public: false,
    available_until: availableUntil,
    evidence_status: 'photo_attached',
    photo: buildAttachment(file, focusBox, detections),
  };
}

function normalizeModerationVerdict(value: unknown): PhotoModerationVerdict {
  if (value === 'safe' || value === 'unsafe' || value === 'ambiguous') return value;
  return 'ambiguous';
}

function normalizeRelevanceVerdict(value: unknown): ResourcePhotoVerdict {
  if (value === 'resource' || value === 'not_resource') return value;
  return 'not_resource';
}

function extractJson(text: string): unknown {
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;
  try {
    return JSON.parse(objectMatch[0]);
  } catch {
    return null;
  }
}

function normalizeDetections(rawItems: unknown[]): ResourcePhotoDetection[] {
  return rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => {
      const box = normalizeBoundingBox(
        item['bbox'] && typeof item['bbox'] === 'object'
          ? (item['bbox'] as Record<string, unknown>)
          : undefined
      );
      return {
        label: typeof item['title'] === 'string' ? item['title'] : 'resource',
        confidence: clamp01(Number(item['confidence'])),
        box: box ?? { x: 0, y: 0, width: 1, height: 1 },
      };
    });
}

async function analyzeWithClaude(file: UploadedPhotoMetadata): Promise<PhotoAnalysisResult> {
  const started = Date.now();
  const model = process.env['CLAUDE_MODEL'] ?? 'claude-3-haiku-20240307';

  if (!process.env['ANTHROPIC_API_KEY']) {
    // No API key → moderation cannot run.  Default to ambiguous so images are
    // NOT automatically accepted when the key is missing in production.
    console.warn(
      '[moderation] ANTHROPIC_API_KEY is not set — photo moderation is DISABLED. ' +
        'Images will be rejected as ambiguous until a key is configured.'
    );
    return {
      moderationVerdict: 'ambiguous',
      relevanceVerdict: 'not_resource',
      extractedText: '',
      drafts: [buildDraftPreview()],
      diagnostics: {
        provider: 'stub',
        model,
        usedVision: false,
        latencyMs: Date.now() - started,
        moderationVerdict: 'ambiguous',
        relevanceVerdict: 'not_resource',
        extractedTextPreview: '',
        detectionsCount: 0,
      },
    };
  }

  if (!file.imageBase64) {
    return {
      moderationVerdict: 'ambiguous',
      relevanceVerdict: 'not_resource',
      extractedText: '',
      drafts: [buildDraftPreview()],
      diagnostics: {
        provider: 'stub',
        model,
        usedVision: false,
        latencyMs: Date.now() - started,
        moderationVerdict: 'ambiguous',
        relevanceVerdict: 'not_resource',
        extractedTextPreview: '',
        detectionsCount: 0,
      },
    };
  }

  const mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' =
    file.mimeType === 'image/png'
      ? 'image/png'
      : file.mimeType === 'image/webp'
        ? 'image/webp'
        : file.mimeType === 'image/gif'
          ? 'image/gif'
          : 'image/jpeg';

  const prompt = `You are a strict image moderation and resource extraction engine for a non-explicit platform.

Analyze the uploaded image and return ONLY valid JSON with this exact shape:
{
  "moderationVerdict": "safe" | "unsafe" | "ambiguous",
  "relevanceVerdict": "resource" | "not_resource",
  "extractedText": "string",
  "items": [
    {
      "title": "string",
      "description": "string|null",
      "quantity": number,
      "status": "available" | "allocated" | "retired",
      "available_until": "YYYY-MM-DD|null",
      "bbox": {"x": number, "y": number, "width": number, "height": number},
      "confidence": number
    }
  ]
}

Rules:
- Be conservative: when uncertain about safety, use "ambiguous".
- If image is not clearly a resource/inventory style photo, use "not_resource".
- Return one item per distinct resource visible; if multiple resources are visible, include each.
- Keep title concise and specific (e.g., "Wireless Mouse", "Ceramic Coffee Mug").
- Quantity should default to 1 unless clearly multiple items are visible.
- bbox values must be normalized 0..1 and should tightly frame each item.
- Extract visible text into extractedText if present, otherwise empty string.
- Return JSON only, no markdown.`;

  const client = new Anthropic();
  const response = await client.messages.create({
    model,
    max_tokens: 1536,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: file.imageBase64,
            },
          },
          { type: 'text', text: prompt },
        ],
      },
    ],
  });

  const text = (response.content as Array<{ type: string; text?: string }>)
    .filter((block) => block.type === 'text')
    .map((block) => block.text ?? '')
    .join('');

  const parsed = extractJson(text) as {
    moderationVerdict?: unknown;
    relevanceVerdict?: unknown;
    extractedText?: unknown;
    items?: unknown;
  } | null;

  const moderationVerdict = normalizeModerationVerdict(parsed?.moderationVerdict);
  const relevanceVerdict = normalizeRelevanceVerdict(parsed?.relevanceVerdict);
  const extractedText = typeof parsed?.extractedText === 'string' ? parsed.extractedText : '';
  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  const detections = normalizeDetections(rawItems);
  const drafts = rawItems
    .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
    .map((item) => normalizeDraft(item, file, detections));

  return {
    moderationVerdict,
    relevanceVerdict,
    extractedText,
    drafts: drafts.length > 0 ? drafts : [{ ...buildDraftPreview(), photo: buildAttachment(file, null, detections) }],
    diagnostics: {
      provider: 'claude',
      model,
      usedVision: true,
      latencyMs: Date.now() - started,
      moderationVerdict,
      relevanceVerdict,
      extractedTextPreview: extractedText.slice(0, 160),
      detectionsCount: drafts.length,
    },
  };
}

export function evaluatePhotoImportPolicy(input: PhotoImportPolicyInput): PhotoImportPolicyResult {
  if (!PHOTO_IMPORT_ALLOWED_MIME_TYPES.includes(input.mimeType as (typeof PHOTO_IMPORT_ALLOWED_MIME_TYPES)[number])) {
    return reject('UNSUPPORTED_MIME');
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes > PHOTO_IMPORT_MAX_SIZE_BYTES) {
    return reject('FILE_TOO_LARGE');
  }

  if (
    !Number.isFinite(input.width)
    || !Number.isFinite(input.height)
    || input.width < PHOTO_IMPORT_MIN_DIMENSION
    || input.height < PHOTO_IMPORT_MIN_DIMENSION
  ) {
    return reject('DIMENSIONS_TOO_SMALL');
  }

  if (input.moderationVerdict === 'unsafe') {
    return reject('MODERATION_UNSAFE');
  }

  if (input.moderationVerdict === 'ambiguous') {
    return reject('MODERATION_AMBIGUOUS');
  }

  if (containsPolicyText(input.extractedText)) {
    return reject('TEXT_POLICY_VIOLATION');
  }

  if (input.relevanceVerdict !== 'resource') {
    return reject('NOT_A_RESOURCE_IMAGE');
  }

  return {
    status: 'allow',
    draft: buildDraftPreview(),
  };
}

function createDefaultServices(): PhotoImportServices {
  return {
    async getModerationVerdict() {
      return 'safe';
    },
    async getRelevanceVerdict() {
      return 'resource';
    },
    async extractText() {
      return '';
    },
    async analyzePhoto(file: UploadedPhotoMetadata) {
      return analyzeWithClaude(file);
    },
  };
}

let activePhotoImportServices: PhotoImportServices = createDefaultServices();

export function setPhotoImportServicesForTests(services?: PhotoImportServices): void {
  activePhotoImportServices = services ?? createDefaultServices();
}

export async function previewResourcePhotoImport(file: UploadedPhotoMetadata): Promise<PhotoImportPolicyResult> {
  if (activePhotoImportServices.analyzePhoto) {
    const analysis = await activePhotoImportServices.analyzePhoto(file);
    const decision = evaluatePhotoImportPolicy({
      ...file,
      moderationVerdict: analysis.moderationVerdict,
      relevanceVerdict: analysis.relevanceVerdict,
      extractedText: analysis.extractedText,
    });

    if (decision.status === 'allow') {
      const [draft, ...additionalDrafts] = analysis.drafts;
      return {
        status: 'allow',
        draft: draft ?? buildDraftPreview(),
        ...(additionalDrafts.length > 0 ? { additionalDrafts } : {}),
        ...(config.isProd ? {} : { diagnostics: analysis.diagnostics }),
      };
    }

    return {
      ...decision,
      ...(config.isProd ? {} : { diagnostics: analysis.diagnostics }),
    };
  }

  const moderationVerdict = await activePhotoImportServices.getModerationVerdict(file);
  const relevanceVerdict = await activePhotoImportServices.getRelevanceVerdict(file);
  const extractedText = await activePhotoImportServices.extractText(file);
  const fallbackDecision = evaluatePhotoImportPolicy({
    ...file,
    moderationVerdict,
    relevanceVerdict,
    extractedText,
  });

  const fallbackDiagnostics = {
    provider: 'stub' as const,
    model: process.env['CLAUDE_MODEL'] ?? 'claude-3-haiku-20240307',
    usedVision: false,
    latencyMs: 0,
    moderationVerdict,
    relevanceVerdict,
    extractedTextPreview: extractedText.slice(0, 160),
    detectionsCount: 0,
  };

  if (fallbackDecision.status === 'allow') {
    return {
      status: 'allow',
      draft: buildDraftPreview(),
      ...(config.isProd ? {} : { diagnostics: fallbackDiagnostics }),
    };
  }

  return {
    ...fallbackDecision,
    ...(config.isProd ? {} : { diagnostics: fallbackDiagnostics }),
  };
}

export function httpStatusForPhotoImportResult(result: PhotoImportPolicyResult): number {
  if (result.status === 'allow') return 200;
  if (result.code === 'UNSUPPORTED_MIME' || result.code === 'FILE_TOO_LARGE' || result.code === 'DIMENSIONS_TOO_SMALL') {
    return 400;
  }
  return 422;
}
