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
import { PublicLayout } from '@/components/layout'
import { useAuthStore } from '@/stores/auth-store'

import {
  BlackHoleCanvas,
  CTA,
  Features,
  Hero,
  HowItWorks,
  Stats,
} from './components'

export function Home() {
  const isAuthenticated = useAuthStore((state) => Boolean(state.auth.user))

  return (
    <PublicLayout showMainContainer={false}>
      <div className='relative isolate overflow-hidden'>
        <div className='pointer-events-none absolute inset-0 -z-20'>
          <BlackHoleCanvas />
        </div>
        <main>
          <Hero isAuthenticated={isAuthenticated} />
          <Stats />
          <Features />
          <HowItWorks />
          <CTA isAuthenticated={isAuthenticated} />
        </main>
      </div>
    </PublicLayout>
  )
}
