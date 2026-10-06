import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, port: 5173, 
    
    // 3. Force Vite to exit if the port is already busy (prevents changing ports)
    strictPort: true
 
    //allowedHosts: ['cattracker5173.loca.lt']
  }
})
//https://gwdr7hxr.inc1.devtunnels.ms:5173/
// https://gwdr7hxr.inc1.devtunnels.ms:5173, https://gwdr7hxr-5173.inc1.devtunnels.ms
// Inspect network activity: https://gwdr7hxr-5173-inspect.inc1.devtunnels.ms