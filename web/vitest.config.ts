/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

*/
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // See rsbuild.config.ts: chaos-ui's layout chunk imports `next/link`
      // at module scope; stub it so tests can load that chunk.
      'next/link': path.resolve(__dirname, './src/lib/next-link-stub.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    clearMocks: true,
    restoreMocks: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Inline chaos-ui so the `next/link` alias above also applies to imports
    // inside the package's own chunks (externalized deps bypass aliases).
    server: {
      deps: {
        inline: ['@chaos_team/chaos-ui'],
      },
    },
  },
})
