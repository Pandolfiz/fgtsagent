import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCog,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBell,
  FaGlobe,
  FaSave
} from 'react-icons/fa'
import Navbar from '../components/Navbar'
import supabase from '../lib/supabaseClient'

export default function Settings() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Estados para configurações gerais
  const [generalSettings, setGeneralSettings] = useState({
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    notifications: {
      email: true,
      push: true,
      whatsapp: false
    },
    theme: 'dark',
    auto_sync: true,
    sync_interval: 30
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setCurrentUser(session.user)
          await fetchGeneralSettings()
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        navigate('/login')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [navigate])

  const fetchGeneralSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          setGeneralSettings(prev => ({
            ...prev,
            ...data.settings
          }))
        }
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
    }
  }

  const handleGeneralSettingsChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.startsWith('notifications.')) {
      const notificationType = name.split('.')[1]
      setGeneralSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationType]: type === 'checkbox' ? checked : value
        }
      }))
    } else {
      setGeneralSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const saveGeneralSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(generalSettings)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      } else {
        setMessage({ type: 'error', text: data.message || 'Erro ao salvar configurações' })
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
            <p className="text-cyan-200">Gerencie suas configurações do sistema</p>
          </div>

          {/* Mensagem de feedback */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-900/50 border-green-500/30 text-green-200' 
                : 'bg-red-900/50 border-red-500/30 text-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <FaCheckCircle className="w-5 h-5" />
                ) : (
                  <FaExclamationTriangle className="w-5 h-5" />
                )}
                <span>{message.text}</span>
              </div>
            </div>
          )}

          {/* Configurações Gerais */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/30">
            <div className="flex items-center gap-3 mb-6">
              <FaCog className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Configurações Gerais</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Configurações de Idioma e Região */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <FaGlobe className="w-5 h-5 text-blue-400" />
                  Idioma e Região
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Idioma
                  </label>
                  <select
                    name="language"
                    value={generalSettings.language}
                    onChange={handleGeneralSettingsChange}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fuso Horário
                  </label>
                  <select
                    name="timezone"
                    value={generalSettings.timezone}
                    onChange={handleGeneralSettingsChange}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="America/Belem">Belém (GMT-3)</option>
                    <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tema
                  </label>
                  <select
                    name="theme"
                    value={generalSettings.theme}
                    onChange={handleGeneralSettingsChange}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="dark">Escuro</option>
                    <option value="light">Claro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>
              </div>

              {/* Configurações de Notificações */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <FaBell className="w-5 h-5 text-green-400" />
                  Notificações
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="notifications.email"
                      checked={generalSettings.notifications.email}
                      onChange={handleGeneralSettingsChange}
                      className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                    />
                    <span className="text-gray-300">Notificações por e-mail</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="notifications.push"
                      checked={generalSettings.notifications.push}
                      onChange={handleGeneralSettingsChange}
                      className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                    />
                    <span className="text-gray-300">Notificações push</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="notifications.whatsapp"
                      checked={generalSettings.notifications.whatsapp}
                      onChange={handleGeneralSettingsChange}
                      className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                    />
                    <span className="text-gray-300">Notificações WhatsApp</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sincronização Automática
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="auto_sync"
                        checked={generalSettings.auto_sync}
                        onChange={handleGeneralSettingsChange}
                        className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                      />
                      <span className="text-gray-300">Ativar sincronização automática</span>
                    </label>
                    
                    {generalSettings.auto_sync && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Intervalo de Sincronização (segundos)
                        </label>
                        <input
                          type="number"
                          name="sync_interval"
                          value={generalSettings.sync_interval}
                          onChange={handleGeneralSettingsChange}
                          min="10"
                          max="300"
                          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={saveGeneralSettings}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 flex items-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 
import { useNavigate } from 'react-router-dom'
import {
  FaCog,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaBell,
  FaGlobe,
  FaSave
} from 'react-icons/fa'
import Navbar from '../components/Navbar'
import supabase from '../lib/supabaseClient'

export default function Settings() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState({ type: '', text: '' })
  
  // Estados para configurações gerais
  const [generalSettings, setGeneralSettings] = useState({
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    notifications: {
      email: true,
      push: true,
      whatsapp: false
    },
    theme: 'dark',
    auto_sync: true,
    sync_interval: 30
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setCurrentUser(session.user)
          await fetchGeneralSettings()
        } else {
          navigate('/login')
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        navigate('/login')
      } finally {
        setIsLoading(false)
      }
    }
    checkAuth()
  }, [navigate])

  const fetchGeneralSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.settings) {
          setGeneralSettings(prev => ({
            ...prev,
            ...data.settings
          }))
        }
      }
    } catch (error) {
      console.error('Erro ao buscar configurações:', error)
    }
  }

  const handleGeneralSettingsChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name.startsWith('notifications.')) {
      const notificationType = name.split('.')[1]
      setGeneralSettings(prev => ({
        ...prev,
        notifications: {
          ...prev.notifications,
          [notificationType]: type === 'checkbox' ? checked : value
        }
      }))
    } else {
      setGeneralSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }))
    }
  }

  const saveGeneralSettings = async () => {
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(generalSettings)
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      } else {
        setMessage({ type: 'error', text: data.message || 'Erro ao salvar configurações' })
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
            <p className="text-cyan-200">Gerencie suas configurações do sistema</p>
          </div>

          {/* Mensagem de feedback */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg border ${
              message.type === 'success' 
                ? 'bg-green-900/50 border-green-500/30 text-green-200' 
                : 'bg-red-900/50 border-red-500/30 text-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {message.type === 'success' ? (
                  <FaCheckCircle className="w-5 h-5" />
                ) : (
                  <FaExclamationTriangle className="w-5 h-5" />
                )}
                <span>{message.text}</span>
              </div>
            </div>
          )}

          {/* Configurações Gerais */}
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/30">
            <div className="flex items-center gap-3 mb-6">
              <FaCog className="w-6 h-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">Configurações Gerais</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Configurações de Idioma e Região */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <FaGlobe className="w-5 h-5 text-blue-400" />
                  Idioma e Região
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Idioma
                  </label>
                  <select
                    name="language"
                    value={generalSettings.language}
                    onChange={handleGeneralSettingsChange}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es-ES">Español</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Fuso Horário
                  </label>
                  <select
                    name="timezone"
                    value={generalSettings.timezone}
                    onChange={handleGeneralSettingsChange}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="America/Belem">Belém (GMT-3)</option>
                    <option value="America/Fortaleza">Fortaleza (GMT-3)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tema
                  </label>
                  <select
                    name="theme"
                    value={generalSettings.theme}
                    onChange={handleGeneralSettingsChange}
                    className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="dark">Escuro</option>
                    <option value="light">Claro</option>
                    <option value="auto">Automático</option>
                  </select>
                </div>
              </div>

              {/* Configurações de Notificações */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                  <FaBell className="w-5 h-5 text-green-400" />
                  Notificações
                </h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="notifications.email"
                      checked={generalSettings.notifications.email}
                      onChange={handleGeneralSettingsChange}
                      className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                    />
                    <span className="text-gray-300">Notificações por e-mail</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="notifications.push"
                      checked={generalSettings.notifications.push}
                      onChange={handleGeneralSettingsChange}
                      className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                    />
                    <span className="text-gray-300">Notificações push</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="notifications.whatsapp"
                      checked={generalSettings.notifications.whatsapp}
                      onChange={handleGeneralSettingsChange}
                      className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                    />
                    <span className="text-gray-300">Notificações WhatsApp</span>
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Sincronização Automática
                  </label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="auto_sync"
                        checked={generalSettings.auto_sync}
                        onChange={handleGeneralSettingsChange}
                        className="w-4 h-4 text-cyan-600 bg-gray-800 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                      />
                      <span className="text-gray-300">Ativar sincronização automática</span>
                    </label>
                    
                    {generalSettings.auto_sync && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Intervalo de Sincronização (segundos)
                        </label>
                        <input
                          type="number"
                          name="sync_interval"
                          value={generalSettings.sync_interval}
                          onChange={handleGeneralSettingsChange}
                          min="10"
                          max="300"
                          className="w-full px-3 py-2 bg-gray-800/50 border border-gray-600/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-end">
              <button
                onClick={saveGeneralSettings}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-cyan-500 hover:to-blue-500 transition-all duration-200 flex items-center gap-2"
              >
                <FaSave className="w-4 h-4" />
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 