<script lang="ts">
  import { signIn } from '$lib/auth-client';
  import { goto } from '$app/navigation';
  
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!email || !password) return;
    loading = true;
    error = '';
    try {
      await signIn.email({ email, password });
      goto('/app');
    } catch (e: any) {
      error = e.message || 'Login failed';
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-[80vh] flex items-center justify-center px-8">
  <form onsubmit={handleSubmit} class="w-full max-w-md border border-[#2a2a2a] p-8">
    <h1 class="font-['Barlow_Condensed'] text-4xl font-black mb-8">LOGIN</h1>
    
    {#if error}
      <p class="text-red-400 text-xs mb-4">{error}</p>
    {/if}
    
    <div class="space-y-4 mb-6">
      <input
        type="email"
        bind:value={email}
        placeholder="Email"
        class="bg-transparent border border-[#2a2a2a] px-4 py-3 w-full text-sm focus:outline-none focus:border-[#d4ff00]"
      />
      <input
        type="password"
        bind:value={password}
        placeholder="Password"
        class="bg-transparent border border-[#2a2a2a] px-4 py-3 w-full text-sm focus:outline-none focus:border-[#d4ff00]"
      />
    </div>
    
    <button
      type="submit"
      disabled={loading || !email || !password}
      class="w-full bg-[#d4ff00] text-black py-3 font-['Barlow_Condensed'] font-bold text-sm tracking-wider hover:bg-white transition-colors disabled:opacity-40"
    >
      {loading ? 'LOGGING IN...' : 'LOGIN'}
    </button>
    
    <p class="text-center text-[#888] text-xs mt-6">
      Don't have an account? <a href="/auth/register" class="text-[#d4ff00] underline">Register</a>
    </p>
  </form>
</div>
