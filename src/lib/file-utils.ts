import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { uploadFileToR2, deleteFileFromR2, getFileUrl } from './r2';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClientComponentClient();

export interface FileMetadata {
  id: string;
  file_key: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  url: string;
  created_at: string;
}

/**
 * 파일을 업로드하고 메타데이터를 데이터베이스에 저장합니다.
 */
export async function uploadFile(
  file: File,
  folder = 'uploads/custom-orders'
): Promise<FileMetadata> {
  try {
    // 파일을 Buffer로 변환
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // R2에 업로드
    const { fileKey } = await uploadFileToR2(buffer, file.name, file.type, folder);
    
    // 데이터베이스에 메타데이터 저장
    const fileId = uuidv4();
    const { data, error } = await supabase
      .from('files')
      .insert({
        id: fileId,
        file_key: fileKey,
        original_name: file.name,
        file_size: file.size,
        mime_type: file.type,
      })
      .select()
      .single();

    if (error) {
      // R2에서 업로드된 파일 삭제 (롤백)
      await deleteFileFromR2(fileKey);
      throw error;
    }

    return {
      ...data,
      url: getFileUrl(fileKey),
    };
  } catch (error) {
    console.error('파일 업로드 실패:', error);
    throw new Error('파일 업로드에 실패했습니다.');
  }
}

/**
 * 여러 파일을 병렬로 업로드합니다.
 */
export async function uploadMultipleFiles(
  files: File[],
  folder = 'uploads/custom-orders'
): Promise<FileMetadata[]> {
  const uploadPromises = files.map(file => uploadFile(file, folder));
  return await Promise.all(uploadPromises);
}

/**
 * 파일을 소프트 삭제합니다.
 */
export async function deleteFile(fileId: string): Promise<void> {
  try {
    // 파일 정보 조회
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('file_key')
      .eq('id', fileId)
      .eq('is_deleted', false)
      .single();

    if (fetchError || !file) {
      throw new Error('파일을 찾을 수 없습니다.');
    }

    // R2에서 실제 파일 삭제
    await deleteFileFromR2(file.file_key);

    // 데이터베이스에서 소프트 삭제
    const { error: updateError } = await supabase
      .from('files')
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    if (updateError) {
      throw updateError;
    }
  } catch (error) {
    console.error('파일 삭제 실패:', error);
    throw new Error('파일 삭제에 실패했습니다.');
  }
}

/**
 * 여러 파일을 삭제합니다.
 */
export async function deleteMultipleFiles(fileIds: string[]): Promise<void> {
  const deletePromises = fileIds.map(id => deleteFile(id));
  await Promise.all(deletePromises);
}

/**
 * 파일 ID 목록으로 파일 정보를 조회합니다.
 */
export async function getFilesByIds(fileIds: string[]): Promise<FileMetadata[]> {
  if (!fileIds.length) return [];

  const { data, error } = await supabase
    .from('files')
    .select('*')
    .in('id', fileIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('파일 조회 실패:', error);
    throw new Error('파일 정보를 불러오는데 실패했습니다.');
  }

  return data?.map(file => ({
    ...file,
    url: getFileUrl(file.file_key),
  })) || [];
}

/**
 * 파일 타입과 크기를 검증합니다.
 */
export function validateFile(
  file: File,
  options: {
    maxSize?: number; // bytes
    allowedTypes?: string[];
  } = {}
): { isValid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes } = options; // 기본 10MB

  // 파일 크기 검증
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `파일 크기는 ${Math.round(maxSize / 1024 / 1024)}MB 이하여야 합니다.`,
    };
  }

  // 파일 타입 검증
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: '지원되지 않는 파일 형식입니다.',
    };
  }

  return { isValid: true };
}

/**
 * 여러 파일을 검증합니다.
 */
export function validateFiles(
  files: File[],
  options: {
    maxSize?: number;
    allowedTypes?: string[];
    maxCount?: number;
  } = {}
): { isValid: boolean; error?: string } {
  const { maxCount = 10 } = options;

  // 파일 개수 검증
  if (files.length > maxCount) {
    return {
      isValid: false,
      error: `파일은 최대 ${maxCount}개까지 업로드 가능합니다.`,
    };
  }

  // 각 파일 개별 검증
  for (const file of files) {
    const validation = validateFile(file, options);
    if (!validation.isValid) {
      return validation;
    }
  }

  return { isValid: true };
}