import DOMPurify from 'isomorphic-dompurify'

const ALLOWED_TAGS = [
  'html', 'head', 'body', 'meta', 'title',
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'span', 'strong', 'em', 'u', 'br', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'section', 'header', 'footer', 'main', 'article',
]

const ALLOWED_ATTR = [
  'style', 'class', 'id',
  'src', 'alt', 'width', 'height',
  'colspan', 'rowspan',
]

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  })
}
