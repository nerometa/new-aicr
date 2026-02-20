<script lang="ts">
  import { signUp } from '$lib/auth-client';
  import { toast } from '$lib/toast';
  
  let name = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  
  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!email || !password || !name) return;
    loading = true;
    try {
      await signUp.email({ email, password, name });
      toast.success('Account created!');
      window.location.href = '/app';
    } catch (e: any) {
      toast.error(e.message || 'Registration failed');
    } finally {
      loading = false;
    }
  }
</script>

<div class="min-h-[80vh] flex items-center justify-center px-8">
  <form onsubmit={handleSubmit} class="w-full max-w-md border border-[#2a2a2a] p-8">
    <h1 class="font-['Barlow_Condensed'] text-4xl font-black mb-8">REGISTER</h1>
    
    <div class="space-y-4 mb-6">
      <input
        type="text"
        bind:value={name}
        placeholder="Name"
        class="bg-transparent border border-[#2a2a2a] px-4 py-3 w-full text-sm focus:outline-none focus:border-[#d4ff00]"
      />
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
      disabled={loading || !email || !password || !name}
      class="w-full bg-[#d4ff00] text-black py-3 font-['Barlow_Condensed'] font-bold text-sm tracking-wider hover:bg-white transition-colors disabled:opacity-40"
    >
      {loading ? 'CREATING ACCOUNT...' : 'REGISTER'}
    </button>
    
    <p class="text-center text-[#888] text-xs mt-6">
      Already have an account? <a href="/auth/login" class="text-[#d4ff00] underline">Login</a>
    </p>
  </form>
</div>
