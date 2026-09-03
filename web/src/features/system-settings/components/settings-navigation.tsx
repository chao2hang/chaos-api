/*
Copyright (C) 2023-2026 Chaos

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the License,
or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

*/
import { Link, useLocation } from '@tanstack/react-router'
import type { TFunction } from 'i18next'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import {
  AUTH_DEFAULT_SECTION,
  getAuthSectionNavItems,
} from '../auth/section-registry'
import {
  BILLING_DEFAULT_SECTION,
  getBillingSectionNavItems,
} from '../billing/section-registry'
import {
  CONTENT_DEFAULT_SECTION,
  getContentSectionNavItems,
} from '../content/section-registry'
import {
  MODELS_DEFAULT_SECTION,
  getModelsSectionNavItems,
} from '../models/section-registry'
import {
  OPERATIONS_DEFAULT_SECTION,
  getOperationsSectionNavItems,
} from '../operations/section-registry'
import {
  SECURITY_DEFAULT_SECTION,
  getSecuritySectionNavItems,
} from '../security/section-registry'
import {
  SITE_DEFAULT_SECTION,
  getSiteSectionNavItems,
} from '../site/section-registry'

type SettingsCategory = {
  id: string
  titleKey: string
  basePath: string
  defaultSection: string
  sections: (t: TFunction) => Array<{
    title: string
    url: string
  }>
}

const SETTINGS_CATEGORIES: SettingsCategory[] = [
  {
    id: 'site',
    titleKey: 'Site & Branding',
    basePath: '/admin/system-settings/site',
    defaultSection: SITE_DEFAULT_SECTION,
    sections: getSiteSectionNavItems,
  },
  {
    id: 'auth',
    titleKey: 'Authentication',
    basePath: '/admin/system-settings/auth',
    defaultSection: AUTH_DEFAULT_SECTION,
    sections: getAuthSectionNavItems,
  },
  {
    id: 'billing',
    titleKey: 'Billing & Payment',
    basePath: '/admin/system-settings/billing',
    defaultSection: BILLING_DEFAULT_SECTION,
    sections: getBillingSectionNavItems,
  },
  {
    id: 'models',
    titleKey: 'Models & Routing',
    basePath: '/admin/system-settings/models',
    defaultSection: MODELS_DEFAULT_SECTION,
    sections: getModelsSectionNavItems,
  },
  {
    id: 'security',
    titleKey: 'Security & Limits',
    basePath: '/admin/system-settings/security',
    defaultSection: SECURITY_DEFAULT_SECTION,
    sections: getSecuritySectionNavItems,
  },
  {
    id: 'content',
    titleKey: 'Console Content',
    basePath: '/admin/system-settings/content',
    defaultSection: CONTENT_DEFAULT_SECTION,
    sections: getContentSectionNavItems,
  },
  {
    id: 'operations',
    titleKey: 'Operations',
    basePath: '/admin/system-settings/operations',
    defaultSection: OPERATIONS_DEFAULT_SECTION,
    sections: getOperationsSectionNavItems,
  },
]

function RouterLink(props: {
  href: string
  children: React.ReactNode
  active?: boolean
}) {
  return (
    <Link
      to={props.href as React.ComponentProps<typeof Link>['to']}
      aria-current={props.active ? 'page' : undefined}
      className={
        props.active
          ? 'border-l-2 border-white bg-white/[0.04] px-3 py-2 text-white'
          : 'border-l-2 border-transparent px-3 py-2 text-zinc-500 hover:border-zinc-600 hover:text-zinc-200'
      }
    >
      {props.children}
    </Link>
  )
}

export function SettingsNavigation() {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const categories = useMemo(
    () =>
      SETTINGS_CATEGORIES.map((category) => ({
        ...category,
        title: t(category.titleKey),
        sections: category.sections(t),
      })),
    [t]
  )
  const activeCategory =
    categories.find((category) => pathname.startsWith(category.basePath)) ??
    categories[0]

  return (
    <div className='mb-5 border border-zinc-800 bg-[#0f0f0f]'>
      <div className='flex items-center gap-3 border-b border-zinc-800 px-4 py-3'>
        <span className='size-1.5 shrink-0 bg-emerald-500' aria-hidden='true' />
        <span className='mono text-[10px] tracking-[0.18em] text-zinc-500 uppercase'>
          {t('System Administration')}
        </span>
      </div>
      <nav
        aria-label={t('System Settings')}
        className='admin-no-scrollbar flex gap-1 overflow-x-auto p-2'
      >
        {categories.map((category) => (
          <RouterLink
            key={category.id}
            href={`${category.basePath}/${category.defaultSection}`}
            active={activeCategory?.id === category.id}
          >
            <span className='mono block text-[11px] tracking-wide whitespace-nowrap uppercase'>
              {category.title}
            </span>
          </RouterLink>
        ))}
      </nav>
      {activeCategory && (
        <nav
          aria-label={activeCategory.title}
          className='flex flex-wrap gap-x-5 gap-y-2 border-t border-zinc-900 px-4 py-3'
        >
          {activeCategory.sections.map((section) => (
            <RouterLink
              key={section.url}
              href={section.url}
              active={pathname === section.url}
            >
              <span className='mono text-[10px] tracking-wider uppercase'>
                {section.title}
              </span>
            </RouterLink>
          ))}
        </nav>
      )}
    </div>
  )
}
