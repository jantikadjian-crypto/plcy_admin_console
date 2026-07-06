import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Use hash routing for static single-file hosting (e.g. artifact preview),
// fall back to history routing for a normal deployment.
const Router = import.meta.env.VITE_HASH_ROUTER === '1' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
)
