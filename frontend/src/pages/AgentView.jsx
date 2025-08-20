import React from 'react'
import Navbar from '../components/Navbar'

export default function AgentView() {
  return (
    <>
      <Navbar />
      <div className="p-6 bg-gradient-to-br from-emerald-950 via-cyan-950 to-blue-950 min-h-screen">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-cyan-200 to-blue-300">
            Visualização de Agente
          </h1>
        </div>
      </div>
    </>
  )
}