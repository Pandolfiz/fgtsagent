import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaSave,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
  FaKey,
  FaShieldAlt,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaIdCard,
  FaUpload,
  FaImage,
  FaTimes
} from 'react-icons/fa'
import Navbar from '../components/Navbar'
import supabase from '../lib/supabaseClient'

export default function Profile() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  // Estados do formulário
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    cpf_cnpj: '',
    avatar_url: ''
  })

  // Estados para alteração de senha
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  })

  // Estados para upload de avatar
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setCurrentUser(session.user)
          await fetchUserProfile(session.user.id)
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

  const fetchUserProfile = async (userId) => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const profile = data.profile
          setFormData({
            first_name: profile.first_name || '',
            last_name: profile.last_name || '',
            email: profile.email || currentUser?.email || '',
            phone: profile.phone || '',
            cpf_cnpj: profile.cpf_cnpj || '',
            avatar_url: profile.avatar_url || ''
          })

          // Definir preview do avatar se existir
          if (profile.avatar_url) {
            setAvatarPreview(profile.avatar_url)
          }
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target

    // Validação específica para CPF/CNPJ
    if (name === 'cpf_cnpj') {
      const cleaned = value.replace(/\D/g, '')
      let formatted = cleaned

      if (cleaned.length <= 11) {
        // Formatar como CPF
        formatted = cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
      } else if (cleaned.length <= 14) {
        // Formatar como CNPJ
        formatted = cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      }

      setFormData(prev => ({
        ...prev,
        [name]: formatted
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handlePasswordChange = (e) => {
    const { name, value } = e.target
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        setMessage({ type: 'error', text: 'Por favor, selecione apenas arquivos de imagem.' })
        return
      }

      // Validar tamanho (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'A imagem deve ter no máximo 5MB.' })
        return
      }

      setAvatarFile(file)

      // Criar preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setAvatarPreview(e.target.result)
      }
      reader.readAsDataURL(file)

      setMessage({ type: 'success', text: 'Imagem selecionada com sucesso!' })
    }
  }

  const removeAvatar = () => {
    setAvatarFile(null)
    setAvatarPreview(null)
    setFormData(prev => ({ ...prev, avatar_url: '' }))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) return null

    try {
      setIsUploading(true)

      // Criar nome único para o arquivo
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      return publicUrl
    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      setMessage({ type: 'error', text: 'Erro ao fazer upload da imagem.' })
      return null
    } finally {
      setIsUploading(false)
    }
  }

  const saveProfile = async () => {
    try {
      setIsSaving(true)
      setMessage({ type: '', text: '' })

      let avatarUrl = formData.avatar_url

      // Fazer upload do avatar se houver arquivo novo
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          avatarUrl = uploadedUrl
        } else {
          return // Erro no upload
        }
      }

      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          cpf_cnpj: formData.cpf_cnpj.replace(/\D/g, ''), // Enviar apenas números
          avatar_url: avatarUrl
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
          setAvatarFile(null) // Limpar arquivo após sucesso
        } else {
          setMessage({ type: 'error', text: data.message || 'Erro ao atualizar perfil.' })
        }
      } else {
        setMessage({ type: 'error', text: 'Erro ao atualizar perfil.' })
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      setMessage({ type: 'error', text: 'Erro ao salvar perfil.' })
    } finally {
      setIsSaving(false)
    }
  }

  const changePassword = async () => {
    try {
      if (passwordData.new_password !== passwordData.confirm_password) {
        setMessage({ type: 'error', text: 'As senhas não coincidem.' })
        return
      }

      if (passwordData.new_password.length < 6) {
        setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' })
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' })
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        })
      }
    } catch (error) {
      console.error('Erro ao alterar senha:', error)
      setMessage({ type: 'error', text: 'Erro ao alterar senha.' })
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="w-8 h-8 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-cyan-200">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Perfil do Usuário</h1>
            <p className="text-cyan-200">Gerencie suas informações pessoais e configurações</p>
          </div>

          {/* Mensagem de feedback */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${
              message.type === 'success'
                ? 'bg-green-900/50 border border-green-500 text-green-200'
                : 'bg-red-900/50 border border-red-500 text-red-200'
            }`}>
              {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
              {message.text}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Informações Pessoais */}
            <div className="bg-gradient-to-br from-emerald-950/50 via-cyan-950/50 to-blue-950/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
              <div className="flex items-center gap-3 mb-6">
                <FaUser className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">Informações Pessoais</h2>
              </div>

              <div className="space-y-4">
                {/* Nome e Sobrenome */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-cyan-200 text-sm font-medium mb-2">
                      Nome *
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      placeholder="Seu nome"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-cyan-200 text-sm font-medium mb-2">
                      Sobrenome *
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      placeholder="Seu sobrenome"
                      className="w-full px-4 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-cyan-200 text-sm font-medium mb-2">
                    <FaEnvelope className="inline w-4 h-4 mr-2" />
                    E-mail
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    disabled
                    className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-300 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-400 mt-1">O e-mail não pode ser alterado</p>
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-cyan-200 text-sm font-medium mb-2">
                    <FaPhone className="inline w-4 h-4 mr-2" />
                    Telefone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                  />
                                 </div>

                 {/* CPF/CNPJ */}
                 <div>
                   <label className="block text-cyan-200 text-sm font-medium mb-2">
                     <FaIdCard className="inline w-4 h-4 mr-2" />
                     CPF ou CNPJ *
                   </label>
                   <input
                     type="text"
                     name="cpf_cnpj"
                     value={formData.cpf_cnpj}
                     onChange={handleInputChange}
                     placeholder="000.000.000-00 ou 00.000.000/0000-00"
                     className="w-full px-4 py-2 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                     required
                   />
                 </div>

                 {/* Avatar Upload */}
                <div>
                  <label className="block text-cyan-200 text-sm font-medium mb-2">
                    <FaImage className="inline w-4 h-4 mr-2" />
                    Foto de Perfil
                  </label>

                  <div className="space-y-4">
                    {/* Preview do avatar */}
                    {avatarPreview && (
                      <div className="relative inline-block">
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="w-24 h-24 rounded-full object-cover border-2 border-cyan-500/30"
                        />
                        <button
                          onClick={removeAvatar}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                          title="Remover avatar"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Upload de arquivo */}
                    <div className="flex items-center gap-4">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <FaSpinner className="w-4 h-4 animate-spin" />
                        ) : (
                          <FaUpload className="w-4 h-4" />
                        )}
                        {isUploading ? 'Enviando...' : 'Escolher Imagem'}
                      </button>
                      <span className="text-xs text-gray-400">
                        JPG, PNG ou GIF (máx. 5MB)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botão Salvar */}
                <button
                  onClick={saveProfile}
                  disabled={isSaving || isUploading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <FaSpinner className="w-5 h-5 animate-spin" />
                  ) : (
                    <FaSave className="w-5 h-5" />
                  )}
                  {isSaving ? 'Salvando...' : 'Salvar Perfil'}
                </button>
              </div>
            </div>

            {/* Alteração de Senha */}
            <div className="bg-gradient-to-br from-emerald-950/50 via-cyan-950/50 to-blue-950/50 backdrop-blur-sm rounded-lg p-6 border border-cyan-500/30">
              <div className="flex items-center gap-3 mb-6">
                <FaKey className="w-6 h-6 text-cyan-400" />
                <h2 className="text-xl font-semibold text-white">Alterar Senha</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-cyan-200 text-sm font-medium mb-2">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      placeholder="Digite sua senha atual"
                      className="w-full px-4 py-2 pr-10 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <FaEyeSlash className="w-4 h-4" /> : <FaEye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-cyan-200 text-sm font-medium mb-2">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      placeholder="Digite a nova senha"
                      className="w-full px-4 py-2 pr-10 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-cyan-200 text-sm font-medium mb-2">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="confirm_password"
                      value={passwordData.confirm_password}
                      onChange={handlePasswordChange}
                      placeholder="Confirme a nova senha"
                      className="w-full px-4 py-2 pr-10 bg-gray-800/50 border border-cyan-500/30 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                <button
                  onClick={changePassword}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <FaKey className="w-5 h-5" />
                  Alterar Senha
                </button>
              </div>
            </div>
          </div>

          {/* Ações da Conta */}
          <div className="mt-8 bg-gradient-to-br from-red-950/50 via-orange-950/50 to-red-950/50 backdrop-blur-sm rounded-lg p-6 border border-red-500/30">
            <div className="flex items-center gap-3 mb-6">
              <FaShieldAlt className="w-6 h-6 text-red-400" />
              <h2 className="text-xl font-semibold text-white">Ações da Conta</h2>
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <FaSignOutAlt className="w-4 h-4" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}