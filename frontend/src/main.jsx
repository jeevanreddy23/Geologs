import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.tsx'

const apiKey = import.meta.env.VITE_AUTOSOIL_API_KEY || import.meta.env.VITE_API_KEY || 'UTYkyv08ThI0NnjOIx5rH36wKyxtIoEZ';
if (apiKey) {
  axios.interceptors.request.use((config) => {
    config.headers['X-Autosoil-Api-Key'] = apiKey;
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
