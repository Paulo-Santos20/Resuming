const ALLOWED_TAGS = new Set([
  'html', 'head', 'body', 'meta', 'title',
  'div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'span', 'strong', 'em', 'u', 'br', 'hr',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'section', 'header', 'footer', 'main', 'article',
])

const ALLOWED_ATTR = new Set([
  'style', 'class', 'id',
  'src', 'alt', 'width', 'height',
  'colspan', 'rowspan',
])

/** Tags whose entire content is removed (not just unwrapped). */
const DANGEROUS_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript'])

/** Find the end of a tag, skipping over quoted attribute values so we don't
 *  mistake a `>` inside a string for the tag closer. */
function findTagEnd(s: string, start: number): number {
  let i = start
  while (i < s.length) {
    const ch = s[i]
    if (ch === '"') {
      i++
      while (i < s.length && s[i] !== '"') i++
      if (s[i] === '"') i++
    } else if (ch === "'") {
      i++
      while (i < s.length && s[i] !== "'") i++
      if (s[i] === "'") i++
    } else if (ch === '>') {
      return i
    } else {
      i++
    }
  }
  return -1
}

/** Return a regex that removes the given tag and everything between it. */
function stripElementRe(tag: string): RegExp {
  return new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, 'gi')
}

export function sanitizeHtml(html: string): string {
  let result: string = html

  // ---- Step 1: strip dangerous elements with their content ----
  for (const tag of DANGEROUS_TAGS) {
    result = result.replace(stripElementRe(tag), '')
    // self-closing variants
    result = result.replace(new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi'), '')
  }

  // HTML comments
  result = result.replace(/<!--[\s\S]*?-->/g, '')
  // DOCTYPE
  result = result.replace(/<!DOCTYPE\s+[^>]*>/gi, '')

  // ---- Step 2: walk the string tag by tag, filtering ----
  const out: string[] = []
  let i = 0

  while (i < result.length) {
    const tagStart = result.indexOf('<', i)
    if (tagStart === -1) {
      out.push(result.slice(i))
      break
    }

    // text before the tag
    if (tagStart > i) out.push(result.slice(i, tagStart))

    const tagEnd = findTagEnd(result, tagStart + 1)
    if (tagEnd === -1) {
      // dangling `<` – treat as text
      out.push(result.slice(tagStart))
      break
    }

    const tagContent = result.slice(tagStart + 1, tagEnd)
    i = tagEnd + 1

    // non-tags (processing instructions, `<?`, `<%`)
    if (tagContent.length === 0 || tagContent[0] === '!' || tagContent[0] === '?') continue

    const isClosing = tagContent[0] === '/'

    // extract tag name (first word)
    const nameMatch = tagContent.match(isClosing ? /^\/(\w+)/ : /^(\w+)/)
    if (!nameMatch) {
      // not a valid tag – emit as text
      out.push(result.slice(tagStart, i))
      continue
    }

    const tagName = nameMatch[1].toLowerCase()

    if (isClosing) {
      if (ALLOWED_TAGS.has(tagName)) out.push(`</${tagName}>`)
      continue
    }

    if (!ALLOWED_TAGS.has(tagName)) {
      // unwrap – keep content, drop the tag
      continue
    }

    // ---- allowed opening tag – filter attributes ----
    const isSelfClose = tagContent.endsWith('/')
    const afterName: string = (() => {
      const raw = tagContent.slice(nameMatch[0].length)
      return isSelfClose ? raw.slice(0, -1).trim() : raw.trim()
    })()

    let filtered = `<${tagName}`

    const attrRe = /(\w+)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g
    let m: RegExpExecArray | null
    while ((m = attrRe.exec(afterName)) !== null) {
      const attrName = m[1].toLowerCase()
      if (!ALLOWED_ATTR.has(attrName)) continue
      const val = (m[2] ?? m[3] ?? m[4] ?? '').replace(/"/g, '&quot;')
      // block javascript: in src
      if (attrName === 'src' && /^\s*javascript:/i.test(val)) continue
      filtered += ` ${attrName}="${val}"`
    }

    filtered += '>'
    out.push(filtered)
  }

  return out.join('')
}
