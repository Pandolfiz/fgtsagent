import { Card, CardBody, Spinner } from '@nextui-org/react'

export interface KnowledgeBaseDoc {
  id: string
  title?: string
  originalName?: string
  created_at?: string
}

export interface KnowledgeBaseListProps {
  docs: KnowledgeBaseDoc[]
  loading?: boolean
  error?: string | null
  onDelete?: (title: string) => void
}

export function KnowledgeBaseList({ docs, loading, error, onDelete }: KnowledgeBaseListProps) {
  return (
    <section className="mb-8 max-w-xl">
      <h3 className="text-base font-semibold mb-3">Documentos da Base de Conhecimento</h3>
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-gray-500"><Spinner size="sm" /> Carregando documentos...</div>
        )}
        {error && (
          <div className="text-danger-500 text-sm">{error}</div>
        )}
        {!loading && !error && docs.length === 0 && (
          <div className="text-gray-400 text-sm">Nenhum documento encontrado.</div>
        )}
        {!loading && !error && docs.length > 0 && (
          <div className="flex flex-col gap-2">
            {docs.map(doc => (
              <Card key={doc.id} shadow="sm" className="hover:ring-2 hover:ring-primary-200 transition">
                <CardBody className="flex flex-row items-center justify-between py-2 px-4 gap-2">
                  <div>
                    <span className="font-medium">{doc.title || doc.originalName || 'Documento sem título'}</span>
                    {doc.created_at && (
                      <span className="text-xs text-gray-400 ml-2">{new Date(doc.created_at).toLocaleString('pt-BR')}</span>
                    )}
                  </div>
                  {onDelete && (
                    <button
                      className="ml-2 px-2 py-1 rounded bg-red-700/70 hover:bg-red-500 text-white text-xs transition-colors"
                      title="Apagar documento"
                      onClick={() => onDelete(doc.title || doc.originalName || '')}
                    >
                      Apagar
                    </button>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  )
} 