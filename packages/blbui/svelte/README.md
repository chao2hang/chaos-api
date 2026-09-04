# @chaos_team/blbui-svelte

Svelte 5 bindings and Custom Element registration for `@chaos_team/blbui-core`.

```svelte
<script lang="ts">
  import { registerAdminElements } from '@chaos_team/blbui-svelte'
  import { AdminButton } from '@chaos_team/blbui-svelte/components'
  import '@chaos_team/blbui-core/styles.css'

  registerAdminElements()
</script>

<AdminButton variant="primary">Deploy New</AdminButton>
```
