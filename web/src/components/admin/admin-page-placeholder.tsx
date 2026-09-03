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
import { ConstructionIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AdminPage } from './admin-page'

type AdminPagePlaceholderProps = {
  titleKey: string
  descriptionKey: string
}

/**
 * Placeholder page for admin modules that have not been rebuilt on the
 * new admin console yet. Renders a clear "under reconstruction" state
 * instead of resurrecting legacy UI code.
 */
export function AdminPagePlaceholder(props: AdminPagePlaceholderProps) {
  const { t } = useTranslation()
  return (
    <AdminPage title={t(props.titleKey)} description={t(props.descriptionKey)}>
      <div className='bg-background flex flex-1 items-center justify-center rounded-xl border border-dashed p-10'>
        <div className='flex flex-col items-center gap-3 text-center'>
          <ConstructionIcon
            className='text-muted-foreground size-10'
            aria-hidden='true'
          />
          <p className='text-foreground text-base font-medium'>
            {t('This module is being rebuilt on the new admin console.')}
          </p>
          <p className='text-muted-foreground max-w-md text-sm'>
            {t(
              'The legacy implementation was removed. Functionality will return page by page.'
            )}
          </p>
        </div>
      </div>
    </AdminPage>
  )
}
