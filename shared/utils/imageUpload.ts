import { FileUploadService } from '@/shared/services/fileUploadService';

/**
 * Upload an optional image file to S3 and return its public URL.
 * Returns undefined when no file is provided (image stays optional).
 */
export async function uploadOptionalImage(file: File | null | undefined): Promise<string | undefined> {
  if (!file) {
    return undefined;
  }
  const uploaded = await FileUploadService.uploadFile(file);
  return uploaded.url;
}

/**
 * Upload option-value images in parallel; preserves existing URLs when no new file.
 */
export async function resolveOptionValueImages<
  T extends { image?: File | null; imageUrl?: string | null }
>(values: T[]): Promise<Array<{ image?: string }>> {
  return Promise.all(
    values.map(async (value) => {
      const uploadedUrl = await uploadOptionalImage(value.image ?? null);
      const image = uploadedUrl ?? value.imageUrl ?? undefined;
      return image ? { image } : {};
    })
  );
}
