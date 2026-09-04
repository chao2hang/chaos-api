<!--
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { registerAdminElements } from '@chaos_team/blbui-core/register'
  import type { AdminButtonSize, AdminButtonVariant } from '@chaos_team/blbui-core'

  export let variant: AdminButtonVariant = 'secondary'
  export let size: AdminButtonSize = 'default'
  export let loading = false
  export let disabled = false
  export let type: 'button' | 'submit' | 'reset' = 'button'
  export let className = ''

  // The element is assigned by Svelte's bind:this directive.
  // oxlint-disable-next-line no-unassigned-vars
  let element: (HTMLElement & Record<string, unknown>) | undefined
  onMount(() => registerAdminElements())
  $: if (element) {
    element.variant = variant
    element.size = size
    element.loading = loading
    element.disabled = disabled
    element.type = type
  }
</script>

<aui-button bind:this={element} class={className}>
  <slot />
</aui-button>
