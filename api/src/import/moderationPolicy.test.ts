import {
  evaluatePhotoImportPolicy,
  PHOTO_IMPORT_MAX_SIZE_BYTES,
  PHOTO_IMPORT_MIN_DIMENSION,
  PhotoImportPolicyInput,
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