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
import {
  PageContainer,
  PageContent,
  PageHeader,
} from '@chaos_team/chaos-ui/ui'
import {
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/utils'

import { PageFooterProvider } from './page-footer'

type SlotProps = { children?: ReactNode }

function SectionPageLayoutTitle(_props: SlotProps) {
  return null
}
SectionPageLayoutTitle.displayName = 'SectionPageLayout.Title'

function SectionPageLayoutActions(_props: SlotProps) {
  return null
}
SectionPageLayoutActions.displayName = 'SectionPageLayout.Actions'

function SectionPageLayoutContent(_props: SlotProps) {
  return null
}
SectionPageLayoutContent.displayName = 'SectionPageLayout.Content'

function SectionPageLayoutBreadcrumb(_props: SlotProps) {
  return null
}
SectionPageLayoutBreadcrumb.displayName = 'SectionPageLayout.Breadcrumb'

export type SectionPageLayoutProps = {
  children: ReactNode
  fixedContent?: boolean
}

/**
 * Page scaffold for console routes, built on chaos-ui's
 * `PageContainer` / `PageHeader` / `PageContent`.
 *
 * The slot API (`.Title`, `.Actions`, `.Content`, `.Breadcrumb`) is
 * unchanged so existing call sites keep working.
 */
export function SectionPageLayout(props: SectionPageLayoutProps) {
  const [footerContainer, setFooterContainer] = useState<HTMLDivElement | null>(
    null
  )

  let title: ReactNode = null
  let actions: ReactNode = null
  let content: ReactNode = null
  let breadcrumb: ReactNode = null

  Children.forEach(props.children, (node) => {
    if (!isValidElement(node)) return
    const child = node as ReactElement<SlotProps>
    if (child.type === SectionPageLayoutTitle) {
      title = child.props.children
    } else if (child.type === SectionPageLayoutActions) {
      actions = child.props.children
    } else if (child.type === SectionPageLayoutContent) {
      content = child.props.children
    } else if (child.type === SectionPageLayoutBreadcrumb) {
      breadcrumb = child.props.children
    }
  })

  return (
    <PageFooterProvider container={footerContainer}>
      <PageContainer
        size='full'
        padding='none'
        center={false}
        className='flex min-h-0 flex-1 flex-col'
      >
        <PageHeader
          // chaos-ui types `title` as string, but it renders any ReactNode;
          // call sites pass `t('...')` strings or small inline elements.
          title={(title ?? '') as unknown as string}
          breadcrumb={breadcrumb ?? undefined}
          actions={actions ?? undefined}
          size='sm'
          className='shrink-0 px-3 pt-3 pb-2.5 sm:px-4 sm:pt-5 sm:pb-3'
        />

        <PageContent
          density='compact'
          className={cn(
            'min-h-0 flex-1 px-3 pt-1 pb-3 sm:px-4 sm:pt-1.5 sm:pb-4',
            props.fixedContent ? 'overflow-hidden' : 'overflow-auto'
          )}
        >
          {content}
        </PageContent>

        <div
          ref={setFooterContainer}
          className='bg-background shrink-0 border-t px-3 py-2.5 empty:hidden sm:px-4 sm:py-3'
        />
      </PageContainer>
    </PageFooterProvider>
  )
}

SectionPageLayout.Title = SectionPageLayoutTitle
SectionPageLayout.Actions = SectionPageLayoutActions
SectionPageLayout.Content = SectionPageLayoutContent
SectionPageLayout.Breadcrumb = SectionPageLayoutBreadcrumb
