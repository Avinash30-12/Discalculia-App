import React from 'react'

export default function ErrorBanner({ message, onClose }){
  if(!message) return null
  return (
    <div role="alert" className="p-3 bg-red-100 text-red-800 rounded-lg flex items-start gap-3">
      <div className="flex-1">{message}</div>
      {onClose && <button aria-label="Close" onClick={onClose} className="text-red-700 font-bold">×</button>}
    </div>
  )
}
