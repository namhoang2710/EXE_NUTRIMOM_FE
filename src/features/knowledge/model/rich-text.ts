const inlineTagNames: Record<string, string> = {
  B: 'strong',
  STRONG: 'strong',
  I: 'em',
  EM: 'em',
  U: 'u',
}

function escapeText(value: string) {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/\r?\n/gu, ' ')
}

function serializeInlineNode(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '')
  if (!(node instanceof HTMLElement)) return ''
  if (node.tagName === 'BR') return '<br>'
  if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return ''

  const content = Array.from(node.childNodes).map(serializeInlineNode).join('')
  const tag = inlineTagNames[node.tagName]
  return tag ? `<${tag}>${content}</${tag}>` : content
}

export function sanitizeInlineHtml(value: string) {
  if (typeof DOMParser === 'undefined') return escapeText(value)
  const document = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html')
  return Array.from(document.body.childNodes).map(serializeInlineNode).join('')
}

export function serializeInlineChildren(element: HTMLElement) {
  return Array.from(element.childNodes).map(serializeInlineNode).join('')
}

export function hasRichTextContent(value: string) {
  return value
    .replace(/<br\s*\/?>/giu, '')
    .replace(/<[^>]+>/gu, '')
    .replace(/&nbsp;/giu, ' ')
    .trim().length > 0
}
