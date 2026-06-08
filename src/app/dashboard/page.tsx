'use client'

import { useAuth } from '@/hooks/use-auth'
import { useResume } from '@/hooks/use-resume'
import { useJobs } from '@/hooks/use-jobs'
import { useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { FileText, Briefcase, Send, Clock } from 'lucide-react'
import { ResumeUpload } from '@/components/resume/resume-upload'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { resumes, loading: resumeLoading, uploadResume, fetchResumes } = useResume(user?.uid)
  const { jobs, fetchJobs } = useJobs(user?.uid)

  useEffect(() => { document.title = 'Visão Geral — Resume React' }, [])

  useEffect(() => {
    if (user?.uid) {
      fetchResumes()
      fetchJobs()
    }
  }, [user?.uid, fetchResumes, fetchJobs])

  const loadingStats = resumeLoading || !resumes.length

  const sentCount = jobs.filter((j) => j.status === 'sent').length
  const pendingCount = jobs.filter((j) => j.status === 'pending').length

  const stats = [
    { label: 'Currículos', value: resumes.length, icon: FileText, color: 'text-brand' },
    { label: 'Vagas', value: jobs.length, icon: Briefcase, color: 'text-accent' },
    { label: 'Enviadas', value: sentCount, icon: Send, color: 'text-success' },
    { label: 'Pendentes', value: pendingCount, icon: Clock, color: 'text-warning' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">
          Olá, {profile?.name?.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seus currículos e candidaturas
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  {loadingStats ? (
                    <Skeleton className="h-9 w-12 mt-1" />
                  ) : (
                    <p className="font-display text-3xl font-bold mt-1">{stat.value}</p>
                  )}
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-60`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload do Currículo</CardTitle>
        </CardHeader>
        <CardContent>
          <ResumeUpload onUpload={uploadResume} loading={resumeLoading} />
        </CardContent>
      </Card>
    </div>
  )
}
