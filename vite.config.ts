import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Separa Firebase em chunks próprios (é pesado)
          if (id.includes('firebase')) {
            if (id.includes('firestore')) {
              return 'firebase-firestore';
            }
            if (id.includes('auth')) {
              return 'firebase-auth';
            }
            if (id.includes('firebase/app')) {
              return 'firebase-app';
            }
            return 'firebase-other';
          }
          
          // Separa React Router
          if (id.includes('react-router-dom')) {
            return 'react-router';
          }
          
          // Separa React e React DOM
          if (id.includes('react-dom')) {
            return 'react-dom';
          }
          if (id.includes('react/') || id.includes('react\\')) {
            return 'react';
          }
          
          // Separa react-firebase-hooks
          if (id.includes('react-firebase-hooks')) {
            return 'react-firebase-hooks';
          }
        }
      }
    },
    // Aumenta o limite de aviso para 600 KB
    chunkSizeWarningLimit: 600
  }
})
