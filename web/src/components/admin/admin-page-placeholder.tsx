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
import { TerminalIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AdminPage } from './admin-page'

type AdminPagePlaceholderProps = {
  titleKey: string
  descriptionKey: string
}

/**
 * Industrial placeholder page for admin modules pending reconstruction.
 */
export function AdminPagePlaceholder(props: AdminPagePlaceholderProps) {
  const { t } = useTranslation()
  return (
    <AdminPage title={t(props.titleKey)} description={t(props.descriptionKey)}>
      <div className="sharp-card flex flex-1 items-center justify-center p-16 text-center">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-12 h-12 bg-zinc-900 border border-zinc-800 flex items-center justify-center mono text-zinc-400">
            <TerminalIcon className="size-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold uppercase tracking-widest text-white mono">
              {t('This module is being rebuilt on the new admin console.')}
            </p>
            <p className="text-xs text-zinc-500 mono leading-relaxed">
              {t(
                'The legacy implementation was removed. Functionality will return page by page.'
              )}
            </p>
          </div>
          <div className="pt-2">
            <span className="status-tag text-zinc-500 border-zinc-700">
              STATUS // IN_PROGRESS
            </span>
          </div>
        </div>
      </div>
    </AdminPage>
  )
}
