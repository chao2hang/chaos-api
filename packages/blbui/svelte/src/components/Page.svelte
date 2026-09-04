<!--
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { registerAdminElements } from '@chaos_team/blbui-core/register'

  export let title = ''
  export let description = ''
  export let className = ''
  // The element is assigned by Svelte's bind:this directive.
  // oxlint-disable-next-line no-unassigned-vars
  let element: (HTMLElement & Record<string, unknown>) | undefined
  onMount(() => registerAdminElements())
  $: if (element) {
    element.title = title
    element.description = description
  }
</script>

<aui-page bind:this={element} class={className}>
  <span slot="actions"><slot name="actions" /></span>
  <slot />
</aui-page>
