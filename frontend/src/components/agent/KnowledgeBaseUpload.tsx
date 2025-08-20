import React, { useRef, useState } from 'react'
import Button from '../Button'
import { FaTimes } from 'react-icons/fa'

export interface KnowledgeBaseUploadProps {
  isLoading?: boolean
  onUpload: (files: File[]) => void
  onClear?: () => void
  acceptedTypes?: string
  status?: 'idle' | 'success' | 'error'
  statusMessage?: string
}

export function KnowledgeBaseUpload({
  isLoading,
  onUpload,
  onClear,
  acceptedTypes = '.txt,.doc,.docx,.pdf,.csv,.xlsx,.xls,.xml,image/*',
  status = 'idle',
  statusMessage
}: KnowledgeBaseUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFiles(newFiles: FileList | null) {
    if (!newFiles) return
    const arr = Array.from(newFiles)
    // Evita duplicidade
    const unique = arr.filter(f => !files.some(existing => (
      existing.name === f.name && existing.size === f.size && existing.lastModified === f.lastModified
    )))
    setFiles(prev => [...prev, ...unique])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  function handleRemove(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  function handleClear() {
    setFiles([])
    onClear?.()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (files.length > 0) onUpload(files)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h3 className="text-base font-semibold text-white">Adicionar Documentos à Base de Conhecimento</h3>
      <div
        className="border-2 border-dashed border-cyan-400 bg-transparent rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer"
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onDragLeave={e => e.preventDefault()}
        aria-label="Área de upload de arquivos"
      >
        <span className="text-cyan-300 text-3xl mb-2"><i className="fas fa-cloud-upload-alt" /></span>
        <p className="text-sm text-gray-200">Arraste e solte arquivos aqui ou clique para selecionar</p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={acceptedTypes}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>
      <p className="text-xs text-gray-300">Tipos aceitos: {acceptedTypes.replace(/image\/*/g, 'imagens (jpg, png, etc)')}</p>
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span key={f.name + f.size + f.lastModified} className="bg-transparent text-white rounded px-2 py-1 text-xs flex items-center gap-1">
              {f.name}
              <button type="button" className="ml-1 p-0 bg-transparent text-gray-300 hover:text-gray-100" onClick={e => { e.stopPropagation(); handleRemove(i) }} title="Remover">
                <FaTimes className="w-4 h-4" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" className="px-4 py-2" disabled={isLoading || files.length === 0}>
          {isLoading ? 'Enviando...' : 'Enviar Documento'}
        </Button>
        {files.length > 0 && (
          <Button type="button" className="px-4 py-2 bg-gray-700 hover:bg-gray-600" onClick={handleClear}>
            Limpar
          </Button>
        )}
      </div>
      {status === 'success' && <p className="text-green-400">{statusMessage || 'Upload realizado com sucesso!'}</p>}
      {status === 'error' && <p className="text-red-400">{statusMessage || 'Erro ao enviar.'}</p>}
    </form>
  )
} 