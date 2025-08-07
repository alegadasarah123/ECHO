import react from '@vitejs/plugin-react'; // ✅ Enables React support (JSX, Fast Refresh, etc.)
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],                         // ✅ Apply the React plugin
  server: {
    historyApiFallback: true                  // ✅ Good for React Router (enables SPA fallback)
  }
})
