import {
  evaluatePhotoImportPolicy,
  PHOTO_IMPORT_MAX_SIZE_BYTES,
  PHOTO_IMPORT_MIN_DIMENSION,
  PhotoImportPolicyInput,
  validateMagicBytes,
} from './moderation';

function makeInput(overrides: Partial<PhotoImportPolicyInput> = {}): PhotoImportPolicyInput {
  return {
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    width: PHOTO_IMPORT_MIN_DIMENSION,
    height: PHOTO_IMPORT_MIN_DIMENSION,
    moderationVerdict: 'safe',
    relevanceVerdict: 'resource',
    extractedText: '',
    ...overrides,
  };
}

describe('evaluatePhotoImportPolicy', () => {
  it('rejects unsupported MIME types', () => {
    const result = evaluatePhotoImportPolicy(makeInput({ mimeType: 'application/pdf' }));
    expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'UNSUPPORTED_MIME' }));
  });

  it('rejects files over the size limit', () => {
    const result = evaluatePhotoImportPolicy(makeInput({ sizeBytes: PHOTO_IMPORT_MAX_SIZE_BYTES + 1 }));
    expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'FILE_TOO_LARGE' }));
  });

  it('rejects files below minimum dimensions', () => {
    const result = evaluatePhotoImportPolicy(makeInput({ width: PHOTO_IMPORT_MIN_DIMENSION - 1 }));
    expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'DIMENSIONS_TOO_SMALL' }));
  });

  it('rejects unsafe moderation verdicts', () => {
    const result = evaluatePhotoImportPolicy(makeInput({ moderationVerdict: 'unsafe' }));
    expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'MODERATION_UNSAFE' }));
  });

  it('rejects ambiguous moderation verdicts', () => {
    const result = evaluatePhotoImportPolicy(makeInput({ moderationVerdict: 'ambiguous' }));
    expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'MODERATION_AMBIGUOUS' }));
  });

  it('rejects OCR text with banned terms', () => {
    const result = evaluatePhotoImportPolicy(makeInput({ extractedText: 'explicit adults only inventory' }));
    expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'TEXT_POLICY_VIOLATION' }));
  });

  it('rejects photos classified as not resources', () => {
    const result = evaluatePhotoImportPolicy(makeInput({ relevanceVerdict: 'not_resource' }));
    expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'NOT_A_RESOURCE_IMAGE' }));
  });

  it('rejects OCR text with expanded banned terms', () => {
    const bannedPhrases = ['nude', 'nudity', 'porn', 'hentai', 'gore', 'cocaine', 'heroin'];
    for (const phrase of bannedPhrases) {
      const result = evaluatePhotoImportPolicy(makeInput({ extractedText: `buy ${phrase} here` }));
      expect(result).toEqual(expect.objectContaining({ status: 'reject', code: 'TEXT_POLICY_VIOLATION' }));
    }
  });

  it('accepts only when all gates pass and returns a draft-only preview', () => {
    const result = evaluatePhotoImportPolicy(makeInput());
    expect(result).toEqual({
      status: 'allow',
      draft: {
        title: 'Photo resource draft',
        description: null,
        quantity: 1,
        status: 'available',
        is_public: false,
        available_until: null,
        evidence_status: 'photo_attached',
      },
    });
  });
});

describe('validateMagicBytes', () => {
  // JPEG magic: FF D8 FF (followed by padding to reach 12 bytes)
  const jpegBuf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
  // PNG magic: 89 50 4E 47 0D 0A 1A 0A
  const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
  // WebP magic: RIFF....WEBP
  const webpBuf = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // RIFF
    0x00, 0x00, 0x00, 0x00, // file size placeholder
    0x57, 0x45, 0x42, 0x50, // WEBP
  ]);

  it('accepts a JPEG buffer with image/jpeg', () => {
    expect(validateMagicBytes(jpegBuf, 'image/jpeg')).toBe(true);
  });

  it('accepts a PNG buffer with image/png', () => {
    expect(validateMagicBytes(pngBuf, 'image/png')).toBe(true);
  });

  it('accepts a WebP buffer with image/webp', () => {
    expect(validateMagicBytes(webpBuf, 'image/webp')).toBe(true);
  });

  it('rejects a JPEG buffer declared as image/png', () => {
    expect(validateMagicBytes(jpegBuf, 'image/png')).toBe(false);
  });

  it('rejects a PNG buffer declared as image/jpeg', () => {
    expect(validateMagicBytes(pngBuf, 'image/jpeg')).toBe(false);
  });

  it('rejects an unknown MIME type', () => {
    expect(validateMagicBytes(jpegBuf, 'image/gif')).toBe(false);
  });

  it('rejects a buffer that is too short', () => {
    expect(validateMagicBytes(Buffer.from([0xff, 0xd8]), 'image/jpeg')).toBe(false);
  });
});