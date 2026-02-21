<script lang="ts">
  import Header from '$lib/components/Header.svelte';
  import HeroInput from '$lib/components/HeroInput.svelte';
  import JobDetail from '$lib/components/JobDetail.svelte';
  import JobsList from '$lib/components/JobsList.svelte';
  import AuthModal from '$lib/components/AuthModal.svelte';
  import { viewStore } from '$lib/stores/view';
  import { jobStore } from '$lib/stores/job';
</script>

<svelte:head>
  <title>AI Content Repurposer</title>
</svelte:head>

<Header />

<main class="max-w-3xl mx-auto pt-12 sm:pt-24 px-4">
  {#if viewStore.current === 'landing'}
    <div class="text-center mb-12">
        <h1 class="font-['Barlow_Condensed'] text-[clamp(3rem,10vw,6rem)] font-black leading-none mb-4 tracking-tight">
            LONG VIDEO<br />→ VIRAL SHORTS
        </h1>
        <p class="text-[var(--muted)] max-w-xl mx-auto">
            Paste a YouTube URL. Our AI analyzes the video, extracts the best moments, and hands you ready-to-post clips.
        </p>
    </div>
  {/if}

  <div class="flex justify-center">
    <HeroInput />
  </div>

  {#if viewStore.current !== 'landing'}
    <div class="mt-12 space-y-12">
      {#if viewStore.current === 'job' && jobStore.job}
        <section>
          <JobDetail id={jobStore.job.id} />
        </section>
      {/if}

      <section class="border-t border-[var(--border)] pt-8">
        <JobsList />
      </section>
    </div>
  {:else}
    <div class="mt-24">
       <JobsList />
    </div>
  {/if}
</main>

{#if viewStore.showAuthModal}
  <AuthModal />
{/if}

<style>
  :global(body) {
    background-color: var(--bg);
    color: var(--fg);
  }
</style>
