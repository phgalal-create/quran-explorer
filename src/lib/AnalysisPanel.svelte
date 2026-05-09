<script>
  import { fetchAll } from '$lib/supabase.js';

  export let tokenId = null;

  let morphemes = [];
  let selectedMorpheme = null;
  let loading = false;

  $: if (tokenId) loadMorphemes(tokenId);
  $: if (!tokenId) { morphemes = []; selectedMorpheme = null; }

  async function loadMorphemes(tid) {
    loading = true;
    selectedMorpheme = null;
    try {
      morphemes = await fetchAll('morpheme', {
        select: 'id,morpheme_pos,morpheme_u,morpheme_s,max_morphemes',
        token_id: `eq.${tid}`,
        order: 'morpheme_pos.asc'
      });
      if (morphemes.length === 1) selectedMorpheme = morphemes[0];
    } catch(e) {
      morphemes = [];
    } finally {
      loading = false;
    }
  }
</script>

<div class="panel">
  {#if !tokenId}
    <div class="empty">
      <div class="empty-icon">☝️</div>
      <p>Click any word to see its analysis.</p>
    </div>

  {:else if loading}
    <div class="empty">Loading…</div>

  {:else}
    <!-- Morpheme tabs (most tokens have 1, some have 2-3) -->
    {#if morphemes.length > 1}
      <div class="tabs">
        {#each morphemes as m}
          <button
            class="tab"
            class:active={selectedMorpheme?.id === m.id}
            onclick={() => selectedMorpheme = m}
            dir="rtl"
          >{m.morpheme_u}</button>
        {/each}
      </div>
    {/if}

    {#if selectedMorpheme}
      <div class="word-display" dir="rtl">{selectedMorpheme.morpheme_u}</div>
      <div class="meta">
        Simplified: {selectedMorpheme.morpheme_s} &nbsp;|&nbsp;
        Morpheme #{selectedMorpheme.morpheme_pos} &nbsp;|&nbsp;
        ID: {selectedMorpheme.id}
      </div>
      <table class="detail-table">
        <tbody>
          <tr><td class="key">Position</td><td class="val">{selectedMorpheme.morpheme_pos}</td></tr>
          <tr><td class="key">Uthmani</td><td class="val" dir="rtl">{selectedMorpheme.morpheme_u}</td></tr>
          <tr><td class="key">Simple</td><td class="val" dir="rtl">{selectedMorpheme.morpheme_s}</td></tr>
          <tr><td class="key">Total Morphemes</td><td class="val">{selectedMorpheme.max_morphemes}</td></tr>
          <tr><td class="key">ID</td><td class="val">{selectedMorpheme.id}</td></tr>
        </tbody>
      </table>
    {:else}
      <!-- multiple morphemes, none selected yet -->
      <div class="empty"><p>Select a morpheme above.</p></div>
    {/if}
  {/if}
</div>

<style>
  .panel { padding: 1rem; height: 100%; box-sizing: border-box; overflow-y: auto; }

  .empty {
    text-align: center; color: #94a3b8;
    margin-top: 3rem; padding: 0 1rem;
    font-size: 0.85rem; line-height: 1.6;
  }
  .empty-icon { font-size: 2rem; margin-bottom: 0.75rem; }

  .tabs {
    display: flex; gap: 4px; margin-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0; padding-bottom: 0.5rem;
  }
  .tab {
    background: #f1f5f9; border: 1px solid #e2e8f0;
    border-radius: 4px; padding: 4px 10px;
    font-family: 'Traditional Arabic', serif; font-size: 1.1rem;
    cursor: pointer;
  }
  .tab.active { background: #1a472a; color: white; border-color: #1a472a; }

  .word-display {
    font-family: 'Traditional Arabic', Arial, sans-serif;
    font-size: 2.5rem; text-align: center;
    padding: 0.75rem 0; color: #1e293b;
    border-bottom: 1px solid #e2e8f0; margin-bottom: 0.5rem;
  }

  .meta {
    font-size: 0.75rem; color: #94a3b8;
    text-align: center; margin-bottom: 1rem;
  }

  .detail-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
  .detail-table tr:nth-child(even) { background: #f8fafc; }
  .detail-table td { padding: 0.35rem 0.5rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  .key { color: #64748b; font-weight: 600; white-space: nowrap; width: 45%; }
  .val { color: #1e293b; word-break: break-word; }
</style>
