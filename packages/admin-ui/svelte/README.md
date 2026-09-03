# @chaos_team/admin-ui-svelte

Svelte 5 bindings and Custom Element registration for `@chaos_team/admin-ui-core`.

```svelte
<script lang="ts">
  import { registerAdminElements } from '@chaos_team/admin-ui-svelte'
  import { AdminButton } from '@chaos_team/admin-ui-svelte/components'
  import '@chaos_team/admin-ui-core/styles.css'

  registerAdminElements()
</script>

<AdminButton variant="primary">Deploy New</AdminButton>
```
