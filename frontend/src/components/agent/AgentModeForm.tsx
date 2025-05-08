import React, { useState, useEffect } from 'react'
import { Listbox } from '@headlessui/react'
import { ChevronUpDownIcon } from '@heroicons/react/24/solid'
import Button from '../Button'

export interface AgentModeFormProps {
  mode: 'full' | 'half' | 'on demand'
  isLoading?: boolean
  onSave: (mode: 'full' | 'half' | 'on demand') => void
}

const modeOptions = [
  { value: 'full', label: 'Full - ouve, executa ações e responde', desc: 'agente ouve, executa as ações (simulações, proposta...) e responde.' },
  { value: 'half', label: 'Half - ouve e executa ações; usuário responde', desc: 'agente ouve e executa ações; o usuário responde.' },
  { value: 'on demand', label: 'On Demand - só responde quando acionado no chat', desc: 'agente assume apenas quando acionado no chat.' }
]

export function AgentModeForm({ mode, isLoading, onSave }: AgentModeFormProps) {
  const [selectedMode, setSelectedMode] = useState<typeof mode>(mode)

  useEffect(() => { setSelectedMode(mode) }, [mode])

  const current = modeOptions.find(opt => opt.value === selectedMode)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (selectedMode) onSave(selectedMode)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Modo do Agente</h2>
      <label htmlFor="agent-mode" className="block text-sm font-medium text-white">Selecione o modo do agente</label>
      <div className="relative">
        <Listbox value={selectedMode} onChange={setSelectedMode}>
          <Listbox.Button className="w-full px-3 py-2 rounded-lg bg-white/5 border border-cyan-500 text-cyan-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/60 transition-colors duration-200 shadow-inner flex items-center justify-between">
            {current?.label}
            <ChevronUpDownIcon className="w-5 h-5 text-cyan-300 ml-2" />
          </Listbox.Button>
          <Listbox.Options className="absolute z-50 mt-1 w-full rounded-lg bg-cyan-900/80 backdrop-blur-md border-0 shadow-lg ring-1 ring-cyan-800/30 outline-none ring-0 focus:outline-none focus:ring-0">
            {modeOptions.map(opt => (
              <Listbox.Option
                key={opt.value}
                value={opt.value}
                className={({ active, selected }) =>
                  `cursor-pointer select-none px-4 py-2 text-base rounded-lg transition-colors duration-100 ${selected ? 'bg-cyan-800/80 text-white font-semibold' : ''} ${active && !selected ? 'bg-cyan-900/80 text-cyan-100' : ''}`
                }
              >
                {opt.label}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Listbox>
      </div>
      <div className="text-xs text-gray-200">{current?.desc}</div>
      <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>Salvar Modo</Button>
    </form>
  )
} 