import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { StudioProvider } from './state/store.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StudioProvider>
    <App />
  </StudioProvider>,
)
