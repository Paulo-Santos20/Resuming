import type { ResumeData } from '@/types'

export function renderResumeDataToHtml(data: ResumeData): string {
  const sections: string[] = []

  // Header
  sections.push(`<h1>${esc(data.personal.nome)}</h1>`)
  const contact = [data.personal.email, data.personal.telefone, data.personal.linkedin, data.personal.endereco]
    .filter(Boolean)
    .join(' | ')
  if (contact) sections.push(`<p>${esc(contact)}</p>`)
  if (data.personal.resumo) sections.push(`<p>${esc(data.personal.resumo)}</p>`)

  // Experience
  if (data.experiencia?.length) {
    sections.push('<h2>Experiência Profissional</h2>')
    for (const exp of data.experiencia) {
      sections.push(`<h3>${esc(exp.cargo)} — ${esc(exp.empresa)}</h3>`)
      sections.push(`<p><em>${esc(exp.periodo)}</em></p>`)
      if (exp.realizacoes?.length) {
        sections.push('<ul>')
        for (const r of exp.realizacoes) sections.push(`<li>${esc(r)}</li>`)
        sections.push('</ul>')
      }
    }
  }

  // Education
  if (data.educacao?.length) {
    sections.push('<h2>Formação Acadêmica</h2>')
    for (const edu of data.educacao) {
      sections.push(`<h3>${esc(edu.curso)} — ${esc(edu.instituicao)}</h3>`)
      sections.push(`<p><em>${esc(edu.grau)} &mdash; ${esc(edu.periodo)}</em></p>`)
    }
  }

  // Skills
  if (data.habilidades?.length) {
    sections.push('<h2>Habilidades</h2>')
    sections.push(`<p>${data.habilidades.map(h => esc(h.trim())).filter(Boolean).join(', ')}</p>`)
  }

  // Languages
  if (data.idiomas?.length) {
    sections.push('<h2>Idiomas</h2>')
    sections.push('<ul>')
    for (const lang of data.idiomas) sections.push(`<li>${esc(lang.idioma)} — ${esc(lang.nivel)}</li>`)
    sections.push('</ul>')
  }

  // Certifications
  if (data.certificacoes?.length) {
    sections.push('<h2>Certificações</h2>')
    for (const cert of data.certificacoes) {
      sections.push(`<p><strong>${esc(cert.nome)}</strong> — ${esc(cert.instituicao)} (${esc(cert.ano)})</p>`)
    }
  }

  return sections.join('\n')
}

function esc(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
