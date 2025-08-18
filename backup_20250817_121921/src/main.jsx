import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './theme-modern.css'
import App from './App.jsx'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { BrowserRouter } from 'react-router-dom'

const theme = extendTheme({
  fonts: {
    heading: "Futura, 'Avenir Next', 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif",
    body: "Futura, 'Avenir Next', 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: '#f6f7fb',
        color: '#0f172a',
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ChakraProvider theme={theme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ChakraProvider>
  </StrictMode>,
)
