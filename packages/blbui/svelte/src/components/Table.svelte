<!--
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { registerAdminElements } from '@chaos_team/blbui-core/register'

  export let loading = false
  export let empty = false
  export let loadingLabel = 'Loading...'
  export let emptyLabel = 'No data available.'
  onMount(() => registerAdminElements())
</script>

<aui-table {loading} {empty} {loadingLabel} {emptyLabel}><slot /></aui-table>
