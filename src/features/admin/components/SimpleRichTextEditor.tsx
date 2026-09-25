import { useEffect, useLayoutEffect, useRef, useState, type ClipboardEvent } from 'react'
import { hasRichTextContent, sanitizeInlineHtml, serializeInlineChildren } from '@/features/knowledge/model/rich-text'

type FormatCommand = 'bold' | 'italic' | 'underline'

interface SimpleRichTextEditorProps {
  paragraphs: string
  bullets: string
  ariaLabel: string
  placeholder?: string
  onChange: (paragraphs: string, bullets: string) => void
}

const formats: { command: FormatCommand; label: string; symbol: string }[] = [
  { command: 'bold', label: 'In đậm', symbol: 'B' },
  { command: 'italic', label: 'In nghiêng', symbol: 'I' },
  { command: 'underline', label: 'Gạch chân', symbol: 'U' },
]

function lines(value: string) {
  return value.split(/\r?\n/gu).map((item) => item.trim()).filter(Boolean)
}

function editorHtml(paragraphs: string, bullets: string) {
  const paragraphHtml = lines(paragraphs).map((paragraph) => `<div>${sanitizeInlineHtml(paragraph)}</div>`).join('')
  const bulletItems = lines(bullets).map((bullet) => `<li>${sanitizeInlineHtml(bullet)}</li>`).join('')
  return `${paragraphHtml}${bulletItems ? `<ul>${bulletItems}</ul>` : ''}`
}

function editorValue(editor: HTMLDivElement) {
  const paragraphs: string[] = []
  const bullets: string[] = []
  let inlineContent = ''

  const flushInlineContent = () => {
    if (hasRichTextContent(inlineContent)) paragraphs.push(inlineContent.trim())
    inlineContent = ''
  }

  for (const node of Array.from(editor.childNodes)) {
    if (!(node instanceof HTMLElement)) {
      inlineContent += sanitizeInlineHtml(node.textContent ?? '')
      continue
    }

    if (node.tagName === 'UL' || node.tagName === 'OL') {
      flushInlineContent()
      for (const item of Array.from(node.children)) {
        const content = serializeInlineChildren(item as HTMLElement).trim()
        if (hasRichTextContent(content)) bullets.push(content)
      }
      continue
    }

    if (node.tagName === 'LI') {
      flushInlineContent()
      const content = serializeInlineChildren(node).trim()
      if (hasRichTextContent(content)) bullets.push(content)
      continue
    }

    if (node.tagName === 'DIV' || node.tagName === 'P') {
      flushInlineContent()
      const content = serializeInlineChildren(node).trim()
      if (hasRichTextContent(content)) paragraphs.push(content)
      continue
    }

    if (node.tagName === 'BR') {
      flushInlineContent()
      continue
    }

    inlineContent += sanitizeInlineHtml(node.outerHTML)
  }

  flushInlineContent()
  return { paragraphs: paragraphs.join('\n'), bullets: bullets.join('\n') }
}

export function SimpleRichTextEditor({ paragraphs, bullets, ariaLabel, placeholder = 'Nhập nội dung bài viết…', onChange }: SimpleRichTextEditorProps) {
  const editor = useRef<HTMLDivElement>(null)
  const [activeFormats, setActiveFormats] = useState<Record<FormatCommand, boolean>>({ bold: false, italic: false, underline: false })

  useLayoutEffect(() => {
    const element = editor.current
    if (!element) return
    const current = editorValue(element)
    if (current.paragraphs !== paragraphs || current.bullets !== bullets) element.innerHTML = editorHtml(paragraphs, bullets)
  }, [bullets, paragraphs])

  useEffect(() => {
    const updateActiveFormats = () => {
      const element = editor.current
      const selection = document.getSelection()
      if (!element || !selection?.anchorNode || !element.contains(selection.anchorNode)) return
      setActiveFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
      })
    }
    document.addEventListener('selectionchange', updateActiveFormats)
    return () => document.removeEventListener('selectionchange', updateActiveFormats)
  }, [])

  function emitChange() {
    const element = editor.current
    if (!element) return
    const next = editorValue(element)
    onChange(next.paragraphs, next.bullets)
  }

  function format(command: FormatCommand) {
    editor.current?.focus()
    document.execCommand(command, false)
    setActiveFormats((current) => ({ ...current, [command]: document.queryCommandState(command) }))
    emitChange()
  }

  function pastePlainText(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    const safeHtml = event.clipboardData.getData('text/plain')
      .replace(/&/gu, '&amp;')
      .replace(/</gu, '&lt;')
      .replace(/>/gu, '&gt;')
      .replace(/\r?\n/gu, '<br>')
    document.execCommand('insertHTML', false, safeHtml)
    emitChange()
  }

  return <div className="admin-rich-editor" data-empty={!paragraphs && !bullets}>
    <div className="admin-rich-editor-toolbar" role="toolbar" aria-label="Định dạng văn bản">
      {formats.map(({ command, label, symbol }) => <button key={command} type="button" title={label} aria-label={label} aria-pressed={activeFormats[command]} onMouseDown={(event) => event.preventDefault()} onClick={() => format(command)} className={`is-${command}`}><span>{symbol}</span></button>)}
    </div>
    <div ref={editor} className="admin-rich-editor-content" contentEditable suppressContentEditableWarning role="textbox" aria-label={ariaLabel} aria-multiline="true" data-placeholder={placeholder} onInput={emitChange} onPaste={pastePlainText} />
  </div>
}
