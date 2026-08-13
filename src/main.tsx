import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// No StrictMode: its dev-mode double-mount re-runs every Firestore fetch and
// opens duplicate live listeners, flooding the network tab with repeats.
createRoot(document.getElementById('root')!).render(<App />)
