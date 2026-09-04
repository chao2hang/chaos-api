<!--
Copyright (C) 2023-2026 Chaos
This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License.
-->
<script lang="ts">
  import { onMount } from 'svelte'
  import { registerAdminElements } from '@chaos_team/blbui-core/register'
  import type { AdminStatus } from '@chaos_team/blbui-core'

  export let status: AdminStatus = 'default'
  onMount(() => registerAdminElements())
</script>

<aui-status-tag {status}><slot /></aui-status-tag>
