import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource-variable/jost'
import './index.css'
import App from './App.tsx'
import { initIdentity } from './identity.ts'
import './styles/theme.css'
import './styles/luxe.css'

// Récupère la session Keycloak sans bloquer l'affichage : le catalogue public s'affiche tout de suite.
void initIdentity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
