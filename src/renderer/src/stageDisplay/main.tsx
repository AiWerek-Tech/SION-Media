import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

import '../assets/main.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { StageDisplayApp } from './StageDisplayApp'
import { ErrorBoundary } from '../components/ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <StageDisplayApp />
    </ErrorBoundary>
  </React.StrictMode>
)
