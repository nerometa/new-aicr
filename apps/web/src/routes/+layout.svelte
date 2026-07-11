<script lang="ts">
  import '../app.css';
  import { useSession, signOut } from '$lib/auth-client';
  import { toast } from '$lib/toast';
  import ToastContainer from '$lib/toast/ToastContainer.svelte';
  import Header from '$lib/components/Header.svelte';
  import { fetchUsage } from '$lib/stores/tier';

  let { children } = $props();
  const session = useSession();

  // Reactive: fetch usage whenever session resolves to an authenticated user
  $effect(() => {
    if ($session.data?.user) {
      fetchUsage();
    }
  });

  async function handleLogout() {
    await signOut();
    toast.success('Logged out successfully');
    window.location.href = '/';
  }
</script>

<Header />

<main class="min-h-screen">
  {@render children()}
</main>

<ToastContainer />
