<script lang="ts">
  import { viewStore } from '$lib/stores/view';
  import { useSession, signOut } from '$lib/auth-client';

  const session = useSession();

  let isDark = $state(false);

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

<header class="border-b border-[var(--border)] px-8 py-4 flex justify-between items-center">
  <a href="/" class="font-['Plus_Jakarta_Sans'] text-2xl font-black tracking-tight transition-colors">
    AICR
  </a>
  <div class="flex gap-4 items-center">
    <button onclick={toggleTheme} class="text-sm">
      {isDark ? 'Light' : 'Dark'}
    </button>
    {#if $session.data?.user}
      <span class="text-xs text-[var(--muted)]">{$session.data.user.email}</span>
      <button onclick={handleLogout} class="text-xs border border-[var(--muted)] px-4 py-2 rounded-xl hover:border-[var(--fg)] hover:text-[var(--fg)] transition-colors">
        LOGOUT
      </button>
    {:else}
      <button onclick={() => viewStore.openAuthModal()} class="bg-[var(--accent)] text-white px-6 py-2 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
        Login
      </button>
    {/if}
  </div>
</header>
