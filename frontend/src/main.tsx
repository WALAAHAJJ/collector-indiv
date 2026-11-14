import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource-variable/caveat'
import '@fontsource-variable/karla'
import './index.css'
import App from './App.tsx'
import { initIdentity } from './identity.ts'

// Récupère la session Keycloak sans bloquer l'affichage : le catalogue public s'affiche tout de suite.
void initIdentity()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
