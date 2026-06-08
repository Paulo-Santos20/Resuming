export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/on\w+=\w+/gi, '')
    .replace(/<iframe\b[^>]*\/?>/gi, '')
    .replace(/<embed\b[^>]*\/?>/gi, '')
    .replace(/<object\b[^>]*\/?>/gi, '')
}
