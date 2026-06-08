'use client'

import { useMemo } from 'react'
import type { ResumeData } from '@/types'

interface ResumePreviewATSProps {
  data: ResumeData
}

export function ResumePreviewATS({ data }: ResumePreviewATSProps) {
  const style = useMemo(() => ({
    container: {
      fontFamily: "'DM Sans', sans-serif",
      color: 'var(--color-foreground)',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px',
      background: 'var(--color-card)',
      lineHeight: 1.6,
    },
    header: {
      borderBottom: '2px solid var(--color-brand)',
      paddingBottom: '20px',
      marginBottom: '24px',
    },
    name: {
      fontFamily: "'Satoshi', sans-serif",
      fontSize: '28px',
      fontWeight: 700,
      color: 'var(--color-brand)',
      margin: 0,
    } as React.CSSProperties,
    subtitle: {
      color: 'var(--color-text-secondary)',
      fontSize: '14px',
      marginTop: '4px',
    } as React.CSSProperties,
    sectionTitle: {
      fontFamily: "'Satoshi', sans-serif",
      fontSize: '16px',
      fontWeight: 700,
      color: 'var(--color-brand)',
      borderBottom: '1px solid var(--color-border)',
      paddingBottom: '6px',
      marginTop: '20px',
      marginBottom: '12px',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.05em',
    } as React.CSSProperties,
    company: {
      fontWeight: 600,
      fontSize: '15px',
      color: 'var(--color-foreground)',
    } as React.CSSProperties,
    role: {
      color: 'var(--color-text-secondary)',
      fontSize: '14px',
    } as React.CSSProperties,
    highlight: {
      fontSize: '14px',
      marginTop: '6px',
      paddingLeft: '16px',
      color: 'var(--color-foreground)',
    } as React.CSSProperties,
    skillTag: {
      display: 'inline-block' as const,
      background: 'var(--color-surface-alt)',
      padding: '4px 12px',
      borderRadius: '4px',
      fontSize: '13px',
      margin: '3px 4px 3px 0',
      color: 'var(--color-foreground)',
    } as React.CSSProperties,
  }), [])

  return (
    <div style={style.container}>
      <div style={style.header}>
        <h1 style={style.name}>{data.personal.name}</h1>
        <div style={style.subtitle}>
          {data.personal.email} {data.personal.phone && `| ${data.personal.phone}`}
          {data.personal.location && ` | ${data.personal.location}`}
          {data.personal.linkedin && ` | ${data.personal.linkedin}`}
        </div>
        {data.personal.summary && (
          <p style={{ ...style.subtitle, marginTop: '12px', lineHeight: 1.5 }}>
            {data.personal.summary}
          </p>
        )}
      </div>

      {data.experience.length > 0 && (
        <>
          <h2 style={style.sectionTitle}>Experiência Profissional</h2>
          {data.experience.map((exp, i) => (
            <div key={i} style={{ marginBottom: '16px' }}>
              <div style={style.company}>{exp.company}</div>
              <div style={style.role}>{exp.role} | {exp.period}</div>
              <ul style={style.highlight}>
                {exp.highlights.map((h, j) => (
                  <li key={j} style={{ marginBottom: '4px' }}>{h}</li>
                ))}
              </ul>
            </div>
          ))}
        </>
      )}

      {data.education.length > 0 && (
        <>
          <h2 style={style.sectionTitle}>Formação Acadêmica</h2>
          {data.education.map((edu, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={style.company}>{edu.institution}</div>
              <div style={style.role}>{edu.degree} em {edu.field} | {edu.period}</div>
            </div>
          ))}
        </>
      )}

      {data.skills.length > 0 && (
        <>
          <h2 style={style.sectionTitle}>Habilidades</h2>
          <div>
            {data.skills.map((skill, i) => (
              <span key={i} style={style.skillTag}>{skill}</span>
            ))}
          </div>
        </>
      )}

      {data.languages.length > 0 && (
        <>
          <h2 style={style.sectionTitle}>Idiomas</h2>
          {data.languages.map((lang, i) => (
            <div key={i} style={style.role}>
              {lang.language} — {lang.level}
            </div>
          ))}
        </>
      )}

      {data.certifications.length > 0 && (
        <>
          <h2 style={style.sectionTitle}>Certificações</h2>
          {data.certifications.map((cert, i) => (
            <div key={i} style={style.role}>
              {cert.name} — {cert.issuer} ({cert.year})
            </div>
          ))}
        </>
      )}
    </div>
  )
}
