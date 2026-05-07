<script lang="ts">
  import { viewStore } from '$lib/stores/view';
  import { useSession, signOut } from '$lib/auth-client';
  import { onMount } from 'svelte';

  const session = useSession();

  let isDark = $state(false);

  onMount(() => {
    isDark = document.documentElement.classList.contains('dark');
  });

  function toggleTheme() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  async function handleLogout() {
    await signOut();
    window.location.href = '/';
  }
</script>

<header class="border-b border-[var(--border)] px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center">
  <button onclick={() => viewStore.toLanding()} class="font-['Plus_Jakarta_Sans'] text-xl sm:text-2xl font-black tracking-tight transition-colors">
    AICR
  </button>
  <div class="flex gap-2 sm:gap-4 items-center">
    <button onclick={toggleTheme} class="text-sm">
      {isDark ? '☀️' : '🌙'}
    </button>
    {#if $session.data?.user}
      <span class="hidden sm:inline text-xs text-[var(--muted)]">{$session.data.user.email}</span>
      <button onclick={handleLogout} class="text-xs border border-[var(--muted)] px-2 sm:px-4 py-1 sm:py-2 rounded-xl hover:border-[var(--fg)] hover:text-[var(--fg)] transition-colors">
        LOGOUT
      </button>
    {:else}
      <button onclick={() => viewStore.openAuthModal()} class="bg-[var(--accent)] text-white px-4 sm:px-6 py-2 rounded-xl font-semibold text-xs sm:text-sm hover:opacity-90 transition-opacity">
        Login
      </button>
    {/if}
  </div>
</header>
