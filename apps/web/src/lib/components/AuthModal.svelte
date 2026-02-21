<script lang="ts">
  import { signIn, signUp } from '$lib/auth-client';
  import { toast } from '$lib/toast';
  import { viewStore } from '$lib/stores/view';

  let mode = $state<'login' | 'register'>('login');

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);

  async function handleLogin() {
    if (!email || !password) return;
    loading = true;
    try {
      await signIn.email({ email, password });
      toast.success('Login successful!');
      viewStore.closeAuthModal();
      viewStore.toLanding();
    } catch (e: any) {
      toast.error(e.message || 'Login failed');
    } finally {
      loading = false;
    }
  }

  async function handleRegister() {
    if (!email || !password || !name) return;
    loading = true;
    try {
      await signUp.email({ email, password, name });
      toast.success('Account created!');
      viewStore.closeAuthModal();
      viewStore.toLanding();
    } catch (e: any) {
      toast.error(e.message || 'Registration failed');
    } finally {
      loading = false;
    }
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (mode === 'login') {
      handleLogin();
    } else {
      handleRegister();
    }
  }
</script>

{#if $viewStore.showAuthModal}
<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onclick={() => viewStore.closeAuthModal()}>
  <div class="bg-[var(--bg)] rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-sm" onclick={(e) => e.stopPropagation()}>
    <h1 class="font-['Plus_Jakarta_Sans'] text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-center">
      {mode === 'login' ? 'Welcome Back' : 'Create Account'}
    </h1>
    
    <form onsubmit={handleSubmit}>
      <div class="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
        {#if mode === 'register'}
          <input
            type="text"
            bind:value={name}
            placeholder="Name"
            class="bg-transparent border border-[var(--border)] px-3 sm:px-4 py-2.5 sm:py-3 w-full text-sm text-[var(--fg)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
          />
        {/if}
        <input
          type="email"
          bind:value={email}
          placeholder="Email"
          class="bg-transparent border border-[var(--border)] px-3 sm:px-4 py-2.5 sm:py-3 w-full text-sm text-[var(--fg)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          type="password"
          bind:value={password}
          placeholder="Password"
          class="bg-transparent border border-[var(--border)] px-3 sm:px-4 py-2.5 sm:py-3 w-full text-sm text-[var(--fg)] rounded-xl focus:outline-none focus:border-[var(--accent)]"
        />
      </div>
      
      <button
        type="submit"
        disabled={loading}
        class="w-full bg-[var(--accent)] text-white py-2.5 sm:py-3 font-semibold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
      >
        {mode === 'login' ? (loading ? 'LOGGING IN...' : 'LOGIN') : (loading ? 'CREATING ACCOUNT...' : 'REGISTER')}
      </button>
      
      <p class="text-center text-[var(--muted)] text-xs mt-4 sm:mt-6">
        {#if mode === 'login'}
          Don't have an account? <button type="button" onclick={() => mode = 'register'} class="text-[var(--accent)] font-semibold">Register</button>
        {:else}
          Already have an account? <button type="button" onclick={() => mode = 'login'} class="text-[var(--accent)] font-semibold">Login</button>
        {/if}
      </p>
    </form>
  </div>
</div>
{/if}
