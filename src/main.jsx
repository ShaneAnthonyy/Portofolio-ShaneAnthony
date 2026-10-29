import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Retire only the obsolete preference; World Time always starts Live.
try { localStorage.removeItem('shane-theme') } catch { /* Storage can be unavailable. */ }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
