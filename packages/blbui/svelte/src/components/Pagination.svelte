<!--
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { registerAdminElements } from '@chaos_team/blbui-core/register'

  export let page = 1
  export let totalPages = 1
  export let total = 0
  export let pageSize = 10
  export let previousLabel = 'PREV'
  export let nextLabel = 'NEXT'
  export let onPageChange: ((page: number) => void) | undefined = undefined
  // The element is assigned by Svelte's bind:this directive.
  // oxlint-disable-next-line no-unassigned-vars
  let element: HTMLElement | undefined
  onMount(() => {
    registerAdminElements()
    const handler = (event: Event) => onPageChange?.((event as CustomEvent<{ page: number }>).detail.page)
    element.addEventListener('aui-page-change', handler)
    return () => element.removeEventListener('aui-page-change', handler)
  })
</script>

<aui-pagination bind:this={element} {page} {totalPages} {total} {pageSize} {previousLabel} {nextLabel} />
