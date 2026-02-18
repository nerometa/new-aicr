<script lang="ts">
  import { useSession } from '$lib/auth-client';
  import { goto } from '$app/navigation';
  
  let { children } = $props();
  const session = useSession();

  $effect(() => {
    if (!$session.isPending && !$session.data?.user) {
      goto('/auth/login');
    }
  });
</script>

{#if $session.isPending}
  <div class="min-h-[80vh] flex items-center justify-center">
    <p class="text-[#888] text-sm">Loading...</p>
  </div>
{:else if $session.data?.user}
  {@render children()}
{/if}
