/** Storage 경로: {userId}/... — RLS가 첫 폴더 = auth.uid() 를 검사 */

export const STORAGE_BUCKETS = {
  contracts: "contracts",
  eventAttachments: "event-attachments",
} as const;

export function contractObjectPath(
  userId: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[^\w.\-가-힣]/g, "_");
  return `${userId}/${Date.now()}-${safe}`;
}

export function eventAttachmentObjectPath(
  userId: string,
  eventId: string,
  fileName: string,
): string {
  const safe = fileName.replace(/[^\w.\-가-힣]/g, "_");
  return `${userId}/${eventId}/${Date.now()}-${safe}`;
}
