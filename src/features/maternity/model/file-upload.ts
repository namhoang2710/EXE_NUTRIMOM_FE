import type { UploadedFile, UploadSession } from '../../../types/domain.ts'

export type UploadStage = 'creating' | 'uploading' | 'completing' | 'ready' | 'error'
export function validateMedicalFile(file: File) {
  if (file.size === 0) throw new Error('Tệp đang trống. Hãy chọn tệp có nội dung.')
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Chỉ hỗ trợ PDF, JPG, PNG hoặc WEBP.')
  if (file.size > 25 * 1024 * 1024) throw new Error('Tệp tải lên không được vượt quá 25 MiB.')
}

interface Dependencies {
  digest: (file: File) => Promise<string>
  create: (digest: string) => Promise<UploadSession>
  put: (session: UploadSession, file: File) => Promise<void>
  complete: (id: string, digest: string, size: number) => Promise<UploadedFile>
}

/** One attempt belongs to one editor. A failed save does not recreate a READY file. */
export function createFileUpload(file: File, api: Dependencies, stage: (value: UploadStage) => void) {
  let digest: string | undefined
  let session: UploadSession | undefined
  let uploaded = false
  let ready: UploadedFile | undefined
  let pending: Promise<UploadedFile> | undefined
  return {
    run(): Promise<UploadedFile> {
      if (ready) return Promise.resolve(ready)
      if (pending) return pending
      pending = (async () => {
        validateMedicalFile(file)
        stage('creating')
        digest ??= await api.digest(file)
        // A PUT can safely repeat while UPLOADING. Complete is idempotent, including lost responses.
        if (session && !uploaded && Date.parse(session.expires_at) <= Date.now()) session = undefined
        session ??= await api.create(digest)
        if (!uploaded) { stage('uploading'); await api.put(session, file); uploaded = true }
        stage('completing')
        const completed = await api.complete(session.file_id, digest, file.size)
        if (completed.status !== 'READY' || completed.id !== session.file_id) throw new Error('Tệp chưa sẵn sàng. Chưa thể đính kèm vào hồ sơ.')
        ready = completed
        stage('ready')
        return ready
      })().catch((reason: unknown) => { stage('error'); throw reason })
        .finally(() => { pending = undefined })
      return pending
    },
  }
}
