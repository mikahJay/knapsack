import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';

export const PHOTO_IMPORT_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_IMPORT_MAX_SIZE_BYTES = 10 * 1024 * 1024;
export const PHOTO_IMPORT_MIN_DIMENSION = 640;

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
  diagnostics?: PhotoImportDiagnostics;
}

export interface PhotoImportDiagnostics {
  provider: 'claude' | 'stub';
  model: string;
  usedVision: boolean;
  latencyMs: number;
  moderationVerdict: PhotoModerationVerdict;
  relevanceVerdict: ResourcePhotoVerdict;
  extractedTextPreview: string;
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
  draft: ResourcePhotoDraftPreview;
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
  return /(explicit|nude|nsfw|fetish|sexual|xxx)/i.test(text);
}

function normalizeDraft(raw: Record<string, unknown>): ResourcePhotoDraftPreview {
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

  return {
    title,
    description,
    quantity,
    status,
    is_public: false,
    available_until: availableUntil,
    evidence_status: 'photo_attached',
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

async function analyzeWithClaude(file: UploadedPhotoMetadata): Promise<PhotoAnalysisResult> {
  const started = Date.now();
  const model = process.env['CLAUDE_MODEL'] ?? 'claude-3-haiku-20240307';

  if (!process.env['ANTHROPIC_API_KEY']) {
    return {
      moderationVerdict: 'safe',
      relevanceVerdict: 'resource',
      extractedText: '',
      draft: buildDraftPreview(),
      diagnostics: {
        provider: 'stub',
        model,
        usedVision: false,
        latencyMs: Date.now() - started,
        moderationVerdict: 'safe',
        relevanceVerdict: 'resource',
        extractedTextPreview: '',
      },
    };
  }

  if (!file.imageBase64) {
    return {
      moderationVerdict: 'ambiguous',
      relevanceVerdict: 'not_resource',
      extractedText: '',
      draft: buildDraftPreview(),
      diagnostics: {
        provider: 'stub',
        model,
        usedVision: false,
        latencyMs: Date.now() - started,
        moderationVerdict: 'ambiguous',
        relevanceVerdict: 'not_resource',
        extractedTextPreview: '',
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
  "draft": {
    "title": "string",
    "description": "string|null",
    "quantity": number,
    "status": "available" | "allocated" | "retired",
    "available_until": "YYYY-MM-DD|null"
  }
}

Rules:
- Be conservative: when uncertain about safety, use "ambiguous".
- If image is not clearly a resource/inventory style photo, use "not_resource".
- Keep title concise and specific (e.g., "Wireless Mouse", "Ceramic Coffee Mug").
- Quantity should default to 1 unless clearly multiple items are visible.
- Extract visible text into extractedText if present, otherwise empty string.
- Return JSON only, no markdown.`;

  const client = new Anthropic();
  const response = await client.messages.create({
    model,
    max_tokens: 1024,
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
    draft?: unknown;
  } | null;

  const moderationVerdict = normalizeModerationVerdict(parsed?.moderationVerdict);
  const relevanceVerdict = normalizeRelevanceVerdict(parsed?.relevanceVerdict);
  const extractedText = typeof parsed?.extractedText === 'string' ? parsed.extractedText : '';
  const draft = parsed?.draft && typeof parsed.draft === 'object'
    ? normalizeDraft(parsed.draft as Record<string, unknown>)
    : buildDraftPreview();

  return {
    moderationVerdict,
    relevanceVerdict,
    extractedText,
    draft,
    diagnostics: {
      provider: 'claude',
      model,
      usedVision: true,
      latencyMs: Date.now() - started,
      moderationVerdict,
      relevanceVerdict,
      extractedTextPreview: extractedText.slice(0, 160),
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
      return {
        status: 'allow',
        draft: analysis.draft,
        ...(config.isProd ? {} : { diagnostics: analysis.diagnostics }),
      };
    }

    return {
      ...decision,
      ...(config.isProd ? {} : { diagnostics: analysis.diagnostics }),
    } as PhotoImportPolicyResult;
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