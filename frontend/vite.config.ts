import { defineConfig } from "vite"
import tsconfigPaths from "vite-tsconfig-paths"

import basicSsl from "@vitejs/plugin-basic-ssl"
import react from "@vitejs/plugin-react-swc"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), basicSsl()],
  server: {
    allowedHosts: true,
    host: true, 
    port: 5173,
    strictPort: true,
  },
})
