<script lang="ts">
  import '../app.css';
  import { useSession, signOut } from '$lib/auth-client';
  import { toast } from '$lib/toast';
  import ToastContainer from '$lib/toast/ToastContainer.svelte';
  
  let { children } = $props();
  const session = useSession();
  
  async function handleLogout() {
    await signOut();
    toast.success('Logged out successfully');
    window.location.href = '/';
  }
</script>

<main class="min-h-screen">
  {@render children()}
</main>

<ToastContainer />
