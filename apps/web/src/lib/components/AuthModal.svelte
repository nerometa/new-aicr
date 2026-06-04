<script lang="ts">
  import { signIn, signUp } from '$lib/auth-client';
  import { toast } from '$lib/toast';
  import { viewStore } from '$lib/stores/view';

  let mode = $state<'login' | 'register'>('login');

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);

  async function handleGoogleSignIn() {
    loading = true;
    try {
      await signIn.social({ provider: 'google' });
    } catch (e: any) {
      toast.error(e.message || 'Google sign-in failed');
      loading = false;
    }
  }

  async function handleLogin() {
    if (!email || !password) return;
    loading = true;
    try {
      const result = await signIn.email({ email, password });
      if (result.error) {
        toast.error(result.error.message || 'Login failed');
      } else {
        toast.success('Login successful!');
        viewStore.closeAuthModal();
        viewStore.toLanding();
      }
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
      const result = await signUp.email({ email, password, name });
      if (result.error) {
        toast.error(result.error.message || 'Registration failed');
      } else {
        toast.success('Account created!');
        viewStore.closeAuthModal();
        viewStore.toLanding();
      }
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

      <div class="flex items-center gap-3 my-4 sm:my-5">
        <div class="flex-1 h-px bg-[var(--border)]"></div>
        <span class="text-[var(--muted)] text-xs">OR</span>
        <div class="flex-1 h-px bg-[var(--border)]"></div>
      </div>

      <button
        type="button"
        onclick={handleGoogleSignIn}
        disabled={loading}
        class="w-full flex items-center justify-center gap-2.5 border border-[var(--border)] py-2.5 sm:py-3 text-sm font-medium text-[var(--fg)] rounded-xl hover:bg-[var(--border)]/10 transition-colors disabled:opacity-40"
      >
        <svg class="w-4.5 h-4.5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        Continue with Google
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
