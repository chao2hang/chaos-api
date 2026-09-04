<!--
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { registerAdminElements } from '@chaos_team/blbui-core/register'

  export let open = false
  export let title = ''
  export let description = ''
  export let closeLabel = 'Close'
  export let onOpenChange: ((open: boolean) => void) | undefined = undefined
  // The element is assigned by Svelte's bind:this directive.
  // oxlint-disable-next-line no-unassigned-vars
  let element: HTMLElement | undefined
  onMount(() => {
    registerAdminElements()
    const handler = (event: Event) => onOpenChange?.((event as CustomEvent<{ open: boolean }>).detail.open)
    element.addEventListener('aui-close', handler)
    return () => element.removeEventListener('aui-close', handler)
  })
</script>

<aui-dialog bind:this={element} {open} {title} {description} {closeLabel}>
  <slot />
  <span slot="footer"><slot name="footer" /></span>
</aui-dialog>
