<script lang="ts">
  import '../app.css';
  import { useSession, signOut } from '$lib/auth-client';
  import { goto } from '$app/navigation';
  
  let { children } = $props();
  const session = useSession();
  
  async function handleLogout() {
    await signOut();
    goto('/');
  }
</script>

<main class="min-h-screen bg-[#0e0e0e] text-[#f0ede6] font-['DM_Mono']">
  <nav class="border-b border-[#2a2a2a] px-8 py-4 flex justify-between items-center">
    <a href="/" class="font-['Barlow_Condensed'] text-2xl font-black tracking-tight hover:text-[#d4ff00] transition-colors">
      AICR
    </a>
    <div class="flex gap-4 items-center">
      {#if $session.data?.user}
        <span class="text-xs text-[#888]">{$session.data.user.email}</span>
        <button onclick={handleLogout} class="text-xs border border-[#888] text-[#888] px-4 py-2 hover:border-[#f0ede6] hover:text-[#f0ede6] transition-colors">
          LOGOUT
        </button>
      {:else}
        <a href="/auth/login" class="text-xs border border-[#d4ff00] text-[#d4ff00] px-4 py-2 hover:bg-[#d4ff00] hover:text-black transition-colors">
          LOGIN
        </a>
      {/if}
    </div>
  </nav>
  
  {@render children()}
</main>
