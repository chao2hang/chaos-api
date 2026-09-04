<!--
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { registerAdminElements } from '@chaos_team/blbui-core/register'

  export let value = ''
  export let type = 'text'
  export let name = ''
  export let placeholder = ''
  export let disabled = false
  export let invalid = false
  export let className = ''
  export let onValueChange: ((value: string) => void) | undefined = undefined

  // The element is assigned by Svelte's bind:this directive.
  // oxlint-disable-next-line no-unassigned-vars
  let element: (HTMLElement & Record<string, unknown>) | undefined
  onMount(() => {
    registerAdminElements()
    element.addEventListener('aui-input', handleInput as EventListener)
    return () => element.removeEventListener('aui-input', handleInput as EventListener)
  })
  $: if (element) {
    element.value = value
    element.type = type
    element.name = name
    element.placeholder = placeholder
    element.disabled = disabled
    element.invalid = invalid
  }
  function handleInput(event: CustomEvent<{ value: string }>) {
    value = event.detail.value
    onValueChange?.(value)
  }
</script>

<aui-input bind:this={element} class={className} />
