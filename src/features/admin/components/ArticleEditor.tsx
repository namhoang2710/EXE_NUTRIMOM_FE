import { ArrowDown, ArrowUp, BookOpenText, FloppyDisk, ImageSquare, Plus, SpinnerGap, Trash, UploadSimple, WarningCircle, X } from '@phosphor-icons/react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiClientError } from '@/core/api/api-error'
import { knowledgeAdminApi } from '@/features/knowledge/api/knowledge-api'
import { mapUploadToArticleMedia } from '@/features/knowledge/model/article-adapters'
import { articleCategories, articleStages } from '@/features/knowledge/model/article-types'
import {
  articleDetailToForm,
  articleFormToPayload,
  emptyArticleForm,
  emptySection,
  slugifyArticleTitle,
  validateArticleForm,
} from '@/features/knowledge/model/article-form'
import type { ArticleFormDraft, ArticleImageDraft } from '@/features/knowledge/model/article-form'
import { SimpleRichTextEditor } from './SimpleRichTextEditor'

interface ArticleEditorProps {
  articleId?: string
  onClose: () => void
  onSaved: () => void
}

interface ImageFieldProps {
  label: string
  image?: ArticleImageDraft
  busy: boolean
  error?: string
  onChange: (image: ArticleImageDraft | undefined) => void
  onUpload: (file: File) => void
}

function ImageField({ label, image, busy, error, onChange, onUpload }: ImageFieldProps) {
  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file) onUpload(file)
  }
  return <div className="admin-image-field">
    <div className="admin-image-preview">{image?.url ? <img src={image.url} alt={image.alt} /> : <ImageSquare size={34} weight="duotone" />}</div>
    <div className="admin-image-copy"><strong>{label}</strong><span>JPEG, PNG hoặc WebP · tối đa 10 MiB</span>
      <div className="admin-inline-actions"><label className="admin-button compact secondary admin-upload-button">{busy ? <SpinnerGap className="admin-spin" size={16} /> : <UploadSimple size={16} />}{busy ? 'Đang tải…' : image ? 'Thay ảnh' : 'Chọn ảnh'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={selectFile} /></label>{image && <button className="admin-text-danger" type="button" onClick={() => onChange(undefined)}><Trash size={15} /> Xóa ảnh</button>}</div>
      {error && <small className="admin-field-error">{error}</small>}
    </div>
    {image && <div className="admin-image-metadata"><label><span>Alt text</span><input maxLength={500} value={image.alt} onChange={(event) => onChange({ ...image, alt: event.target.value })} /></label><label><span>Chú thích</span><input maxLength={1000} value={image.caption} onChange={(event) => onChange({ ...image, caption: event.target.value })} /></label></div>}
  </div>
}

export function ArticleEditor({ articleId, onClose, onSaved }: ArticleEditorProps) {
  const [form, setForm] = useState<ArticleFormDraft>(emptyArticleForm)
  const [loading, setLoading] = useState(Boolean(articleId))
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [requestError, setRequestError] = useState('')
  const [conflict, setConflict] = useState(false)
  const [uploading, setUploading] = useState('')
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [slugTouched, setSlugTouched] = useState(Boolean(articleId))

  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !saving) onClose() }
    document.addEventListener('keydown', escape)
    document.body.classList.add('admin-dialog-open')
    return () => { document.removeEventListener('keydown', escape); document.body.classList.remove('admin-dialog-open') }
  }, [onClose, saving])

  useEffect(() => {
    if (!articleId) return
    const controller = new AbortController()
    setLoading(true)
    knowledgeAdminApi.getArticle(articleId, controller.signal)
      .then((article) => { if (!controller.signal.aborted) { setForm(articleDetailToForm(article)); setSlugTouched(true) } })
      .catch((error: unknown) => { if (!controller.signal.aborted) setRequestError(error instanceof Error ? error.message : 'Không thể tải bài viết.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [articleId])

  function update<K extends keyof ArticleFormDraft>(name: K, value: ArticleFormDraft[K]) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => { const next = { ...current }; delete next[name]; return next })
  }

  function updateSection(index: number, patch: Partial<ArticleFormDraft['sections'][number]>) {
    setForm((current) => ({ ...current, sections: current.sections.map((section, position) => position === index ? { ...section, ...patch } : section) }))
    setErrors((current) => { const next = { ...current }; delete next[`section-${index}`]; return next })
  }

  function moveSection(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= form.sections.length) return
    const sections = [...form.sections]
    ;[sections[index], sections[target]] = [sections[target], sections[index]]
    update('sections', sections)
  }

  async function upload(file: File, target: 'cover' | number) {
    const uploadKey = target === 'cover' ? 'cover' : `section-${target}`
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadErrors((current) => ({ ...current, [uploadKey]: 'Chỉ chấp nhận JPEG, PNG hoặc WebP.' }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadErrors((current) => ({ ...current, [uploadKey]: 'Ảnh vượt quá giới hạn 10 MiB.' }))
      return
    }
    const currentImage = target === 'cover' ? form.coverImage : form.sections[target].image
    setUploading(uploadKey)
    setUploadErrors((current) => ({ ...current, [uploadKey]: '' }))
    try {
      const result = mapUploadToArticleMedia(await knowledgeAdminApi.uploadMedia(file, currentImage?.alt, currentImage?.caption))
      const image = { id: result.id, url: result.url, alt: result.alt, caption: result.caption }
      if (target === 'cover') update('coverImage', image)
      else updateSection(target, { image })
    } catch (error) {
      setUploadErrors((current) => ({ ...current, [uploadKey]: error instanceof Error ? error.message : 'Tải ảnh thất bại.' }))
    } finally { setUploading('') }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const validation = validateArticleForm(form)
    setErrors(validation)
    setRequestError('')
    setConflict(false)
    if (Object.keys(validation).length) return
    setSaving(true)
    try {
      const payload = articleFormToPayload(form)
      if (articleId) await knowledgeAdminApi.updateArticle(articleId, payload)
      else await knowledgeAdminApi.createArticle(payload)
      onSaved()
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.code === 'SLUG_ALREADY_EXISTS') setErrors((current) => ({ ...current, slug: 'Slug này đã được sử dụng.' }))
        else if (error.code === 'VERSION_CONFLICT') setConflict(true)
        else if (Object.keys(error.fields).length) {
          const { youtubeVideoId, ...otherFields } = error.fields
          setErrors((current) => ({ ...current, ...otherFields, ...(youtubeVideoId ? { youtubeVideo: youtubeVideoId } : {}) }))
        }
        setRequestError(error.message)
      } else setRequestError('Không thể lưu bài viết. Vui lòng thử lại.')
    } finally { setSaving(false) }
  }

  function reloadLatest() {
    if (!articleId) return
    setLoading(true); setConflict(false); setRequestError('')
    knowledgeAdminApi.getArticle(articleId).then((article) => setForm(articleDetailToForm(article)))
      .catch((error: unknown) => setRequestError(error instanceof Error ? error.message : 'Không thể tải phiên bản mới nhất.'))
      .finally(() => setLoading(false))
  }

  return <div className="admin-dialog-backdrop" role="presentation"><section className="admin-editor" role="dialog" aria-modal="true" aria-labelledby="article-editor-title">
    <header className="admin-editor-header"><div><span>Knowledge CMS</span><h2 id="article-editor-title">{articleId ? 'Chỉnh sửa bài viết' : 'Tạo bài viết mới'}</h2><p>Soạn nội dung với các định dạng cơ bản, gọn gàng và dễ đọc.</p></div><button className="admin-editor-close" type="button" aria-label="Đóng" disabled={saving} onClick={onClose}><X size={22} /></button></header>
    {loading ? <div className="admin-editor-loading"><SpinnerGap className="admin-spin" size={28} /><p>Đang tải nội dung…</p></div> : <form className="admin-editor-form" onSubmit={submit}>
      {requestError && <div className="admin-request-error" role="alert"><WarningCircle size={20} /><div><strong>{conflict ? 'Bài viết vừa được cập nhật ở nơi khác' : 'Chưa thể lưu bài viết'}</strong><p>{requestError}</p>{conflict && <button type="button" onClick={reloadLatest}>Tải phiên bản mới nhất</button>}</div></div>}
      <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>01</span><div><h3>Thông tin cơ bản</h3><p>Tiêu đề, slug và phân loại hiển thị trên thư viện.</p></div></div><div className="admin-form-grid admin-knowledge-grid">
        <label className="admin-field-wide"><span>Tiêu đề *</span><input maxLength={300} value={form.title} onChange={(event) => { const title = event.target.value; setForm((current) => ({ ...current, title, ...(slugTouched ? {} : { slug: slugifyArticleTitle(title) }) })); setErrors((current) => { const next = { ...current }; delete next.title; return next }) }} />{errors.title && <small>{errors.title}</small>}</label>
        <label><span>Slug *</span><input maxLength={180} value={form.slug} onChange={(event) => { setSlugTouched(true); update('slug', event.target.value.toLowerCase()) }} />{errors.slug && <small>{errors.slug}</small>}</label>
        <label><span>Trạng thái *</span><select value={form.status} onChange={(event) => update('status', event.target.value as ArticleFormDraft['status'])}><option value="draft">Bản nháp</option><option value="published">Xuất bản</option><option value="archived">Lưu trữ</option></select></label>
        <label><span>Danh mục *</span><select value={form.category} onChange={(event) => update('category', event.target.value)}>{articleCategories.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Giai đoạn *</span><select value={form.stage} onChange={(event) => update('stage', event.target.value)}>{articleStages.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Thời gian xuất bản</span><input type="datetime-local" disabled={form.status !== 'published'} value={form.publishedAt} onChange={(event) => update('publishedAt', event.target.value)} />{errors.publishedAt && <small>{errors.publishedAt}</small>}</label>
        <label><span>Chủ đề</span><input maxLength={3029} placeholder="vitamin, chăm sóc hằng ngày" value={form.topics} onChange={(event) => update('topics', event.target.value)} />{errors.topics && <small>{errors.topics}</small>}</label>
        <label className="admin-field-wide"><span>Mô tả ngắn</span><textarea rows={3} maxLength={2000} value={form.excerpt} onChange={(event) => update('excerpt', event.target.value)} />{errors.excerpt && <small>{errors.excerpt}</small>}</label>
        <label className="admin-field-wide"><span>Nội dung mở đầu</span><textarea rows={5} maxLength={10000} value={form.lead} onChange={(event) => update('lead', event.target.value)} />{errors.lead && <small>{errors.lead}</small>}</label>
      </div></section>

      <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>02</span><div><h3>Ảnh bìa</h3><p>Ảnh được tối ưu và lưu qua media upload trước khi gắn vào bài.</p></div></div><ImageField label="Ảnh đại diện bài viết" image={form.coverImage} busy={uploading === 'cover'} error={uploadErrors.cover} onChange={(image) => update('coverImage', image)} onUpload={(file) => { void upload(file, 'cover') }} /></section>

      <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>03</span><div><h3>Nội dung bài viết</h3><p>Bôi đen nội dung để in đậm, in nghiêng hoặc gạch chân.</p></div><button className="admin-button compact secondary" type="button" disabled={form.sections.length >= 100 || Boolean(uploading)} onClick={() => update('sections', [...form.sections, emptySection()])}><Plus size={16} /> Thêm phần</button></div>
        {errors.sections && <p className="admin-field-error">{errors.sections}</p>}
        <div className="admin-section-builder">{form.sections.length === 0 && <div className="admin-empty-sections"><BookOpenText size={24} /><p>Bài viết chưa có phần nội dung. PUT sẽ xóa toàn bộ sections hiện tại.</p></div>}{form.sections.map((section, index) => <article className="admin-section-card" key={section.key}><header><strong>Phần {index + 1}</strong><div><button type="button" aria-label="Đưa lên" disabled={index === 0 || Boolean(uploading)} onClick={() => moveSection(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label="Đưa xuống" disabled={index === form.sections.length - 1 || Boolean(uploading)} onClick={() => moveSection(index, 1)}><ArrowDown size={16} /></button><button type="button" aria-label="Xóa phần" disabled={Boolean(uploading)} onClick={() => update('sections', form.sections.filter((_, position) => position !== index))}><Trash size={16} /></button></div></header>
          <div className="admin-form-grid admin-knowledge-grid"><label className="admin-field-wide"><span>Tiêu đề phần *</span><input maxLength={300} value={section.heading} onChange={(event) => updateSection(index, { heading: event.target.value })} />{errors[`section-${index}`] && <small>{errors[`section-${index}`]}</small>}</label><div className="admin-field-wide admin-rich-text-field"><span>Nội dung</span><SimpleRichTextEditor paragraphs={section.paragraphs} bullets={section.bullets} ariaLabel={`Nội dung phần ${index + 1}`} onChange={(paragraphs, bullets) => updateSection(index, { paragraphs, bullets })} /></div></div>
          <ImageField label={`Ảnh cho phần ${index + 1}`} image={section.image} busy={uploading === `section-${index}`} error={uploadErrors[`section-${index}`]} onChange={(image) => updateSection(index, { image })} onUpload={(file) => { void upload(file, index) }} />
        </article>)}</div>
      </section>

      <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>04</span><div><h3>Video YouTube</h3><p>Video sẽ hiển thị ở cuối bài viết, sau tất cả các phần nội dung.</p></div></div><div className="admin-form-grid admin-knowledge-grid"><div className="admin-field-wide admin-youtube-field"><label htmlFor="article-youtube-video"><span>Link hoặc ID video</span></label><input id="article-youtube-video" type="text" value={form.youtubeVideo} placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ" aria-invalid={Boolean(errors.youtubeVideo)} aria-describedby={errors.youtubeVideo ? 'article-youtube-error' : undefined} onChange={(event) => update('youtubeVideo', event.target.value)} />{errors.youtubeVideo && <small id="article-youtube-error" className="admin-field-error" role="alert">{errors.youtubeVideo}</small>}{form.youtubeVideo && <button className="admin-text-danger" type="button" onClick={() => update('youtubeVideo', '')}><Trash size={15} /> Xóa video</button>}</div></div></section>

      <section className="admin-editor-section"><div className="admin-editor-section-heading"><span>05</span><div><h3>Nguồn tham khảo</h3><p>Để trống cả hai trường nếu bài không có nguồn ngoài.</p></div></div><div className="admin-form-grid admin-knowledge-grid"><label><span>Tên nguồn</span><input maxLength={300} value={form.sourceLabel} onChange={(event) => update('sourceLabel', event.target.value)} /></label><label><span>Đường dẫn</span><input type="url" maxLength={2048} value={form.sourceHref} onChange={(event) => update('sourceHref', event.target.value)} /></label>{errors.source && <small className="admin-field-error admin-field-wide">{errors.source}</small>}</div></section>
      <footer className="admin-editor-actions"><span>{form.status === 'published' ? form.publishedAt ? 'Bài sẽ hiển thị theo lịch đã chọn.' : 'BE sẽ dùng thời gian UTC hiện tại.' : 'publishedAt sẽ được BE xóa với trạng thái này.'}</span><div><button className="admin-button secondary" type="button" disabled={saving} onClick={onClose}>Hủy</button><button className={`admin-button primary${articleId ? '' : ' admin-create-article'}`} type="submit" disabled={saving || Boolean(uploading)}>{saving ? <SpinnerGap className="admin-spin" size={17} /> : <FloppyDisk size={17} />}{saving ? 'Đang lưu…' : articleId ? 'Lưu thay đổi' : 'Tạo bài viết'}</button></div></footer>
    </form>}
  </section></div>
}
