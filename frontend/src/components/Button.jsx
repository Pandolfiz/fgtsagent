import React from 'react'

export default function Button({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-medium px-4 py-2 rounded-md shadow-md hover:shadow-lg transition-colors duration-200 ${className}`}
    >
      {children}
    </button>
  )
}