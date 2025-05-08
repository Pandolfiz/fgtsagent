import React, { useState } from 'react'
import { apiFetch } from '../utilities/apiFetch'
import Navbar from '../components/Navbar'
import type { KnowledgeBaseDoc } from '../components/agent/KnowledgeBaseList'
import { AgentModeForm } from '../components/agent/AgentModeForm'
import { KnowledgeBaseList } from '../components/agent/KnowledgeBaseList'
import { KnowledgeBaseUpload } from '../components/agent/KnowledgeBaseUpload'

export default function AgentsConfigPage() {
  const [mode, setMode] = useState<'full' | 'half' | 'on demand'>('full')
  const [docs, setDocs] = useState<KnowledgeBaseDoc[]>([])
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [errorDocs, setErrorDocs] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [uploadLoading, setUploadLoading] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Função para buscar documentos da base de conhecimento
  const fetchDocs = async () => {
    setLoadingDocs(true)
    setErrorDocs(null)
    try {
      const res = await apiFetch('/api/knowledge-base')
      if (!res) return
      const json = await res.json()
      if (json.success) {
        setDocs(json.data)
      } else {
        setErrorDocs(json.message || 'Erro ao carregar documentos')
      }
    } catch (err: any) {
      setErrorDocs(err.message || 'Erro ao carregar documentos')
    } finally {
      setLoadingDocs(false)
    }
  }

  const handleModeSave = async (newMode: typeof mode) => {
    try {
      const res = await apiFetch('/api/agents/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      })
      if (!res) return
      if (res.ok) {
        setMode(newMode)
        // opcional: exibir mensagem de sucesso
      } else {
        const json = await res.json().catch(() => null)
        console.error('Erro ao salvar modo do agente:', json?.message || res.statusText)
        // opcional: exibir mensagem de erro
      }
    } catch (err) {
      console.error('Erro ao salvar modo do agente:', err)
      // opcional: exibir mensagem de erro
    }
  }

  const handleUpload = async (files: File[]) => {
    setUploadLoading(true)
    setUploadStatus('idle')
    try {
      const formData = new FormData()
      files.forEach(file => formData.append('kbFiles', file))
      // Chama o endpoint de upload existente
      const res = await apiFetch('/api/agent/upload-kb', {
        method: 'POST',
        body: formData
      })
      if (!res) return
      const json = await res.json()
      if (json.success) {
        setUploadStatus('success')
        await fetchDocs()
      } else {
        setUploadStatus('error')
      }
    } catch (err: any) {
      setUploadStatus('error')
    } finally {
      setUploadLoading(false)
    }
  }

  const handleDeleteDoc = async (title: string) => {
    if (!title) return
    setDeleteLoading(true)
    setDeleteStatus('idle')
    try {
      const res = await apiFetch('/api/knowledge-base/delete-by-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      })
      if (!res) return
      const json = await res.json()
      if (json.success) {
        setDeleteStatus('success')
        await fetchDocs()
      } else {
        setDeleteStatus('error')
      }
    } catch {
      setDeleteStatus('error')
    } finally {
      setDeleteLoading(false)
    }
  }

  // Carregar documentos ao montar o componente
  React.useEffect(() => { fetchDocs() }, [])

  return (
    <React.Fragment>
      <Navbar />
      <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6">
          <h1 className="text-3xl font-bold mb-4 lg:mb-0 bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300">
            Configuração do Agente
          </h1>
        </div>
        <div className="space-y-6">
          <div className="relative z-20 overflow-visible bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <AgentModeForm mode={mode} onSave={handleModeSave} isLoading={false} />
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <KnowledgeBaseList docs={docs} loading={loadingDocs} error={errorDocs} onDelete={handleDeleteDoc} />
            {deleteStatus === 'success' && <p className="text-green-400 mt-2">Documento apagado com sucesso!</p>}
            {deleteStatus === 'error' && <p className="text-red-400 mt-2">Erro ao apagar documento.</p>}
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6">
            <KnowledgeBaseUpload onUpload={handleUpload} isLoading={uploadLoading} status={uploadStatus} />
          </div>
        </div>
      </div>
    </React.Fragment>
  )
} 