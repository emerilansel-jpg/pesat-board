import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { BASE } from './lib/base'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter basename={BASE || '/'}>
    <App />
  </BrowserRouter>,
)
