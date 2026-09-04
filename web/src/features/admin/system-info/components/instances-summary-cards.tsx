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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

type InstancesSummaryCardsProps = {
  loading: boolean
  onlineCount: number
  totalCount: number
  staleCount: number
  staleAfterSeconds: number
}

/** Online / stale / stale-threshold KPI strip above the instance table. */
export function InstancesSummaryCards(props: InstancesSummaryCardsProps) {
  const { t } = useTranslation()

  return (
    <div className='sharp-card grid grid-cols-1 gap-8 border-zinc-800 p-6 md:grid-cols-3'>
      <div>
        <p className='mono mb-2 text-[11px] tracking-widest text-zinc-500 uppercase'>
          {t('Instances online')}
        </p>
        <span className='mono text-3xl font-light text-white'>
          {props.loading
            ? '…'
            : `${props.onlineCount} / ${props.totalCount}`}
        </span>
      </div>
      <div>
        <p className='mono mb-2 text-[11px] tracking-widest text-zinc-500 uppercase'>
          {t('Stale instances')}
        </p>
        <span
          className={cn(
            'mono text-3xl font-light',
            props.staleCount > 0 ? 'text-amber-500' : 'text-white'
          )}
        >
          {props.loading ? '…' : props.staleCount}
        </span>
      </div>
      <div>
        <p className='mono mb-2 text-[11px] tracking-widest text-zinc-500 uppercase'>
          {t('Stale after')}
        </p>
        <span className='mono text-3xl font-light text-white'>
          {props.loading ? '…' : `${props.staleAfterSeconds}s`}
        </span>
      </div>
    </div>
  )
}
