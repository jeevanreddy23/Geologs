import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'
import { API_KEY } from './lib/api'

if (API_KEY) {
  axios.interceptors.request.use((config) => {
    config.headers['X-Autosoil-Api-Key'] = API_KEY;
    return config;
  }, (error) => {
    return Promise.reject(error);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
