<script>
  export let morpheme = null;

  const labels = {
    id: 'ID',
    morpheme_pos: 'Position',
    morpheme_u: 'Uthmani',
    morpheme_s: 'Simple',
    max_morphemes: 'Total Morphemes'
  };
</script>

<div class="panel">
  <div class="panel-title">Analysis</div>

  {#if !morpheme}
    <div class="empty">
      <div class="empty-icon">☝️</div>
      <p>Click any word in the text to see its morphological analysis.</p>
    </div>
  {:else}
    <div class="word-display" dir="rtl">{morpheme.morpheme_u}</div>

    <table class="detail-table">
      <tbody>
        {#each Object.entries(morpheme) as [key, val]}
          {#if val !== null && val !== undefined && val !== ''}
            <tr>
              <td class="key">{labels[key] ?? key}</td>
              <td class="val" dir={key === 'morpheme_u' || key === 'morpheme_s' ? 'rtl' : 'ltr'}>{val}</td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .panel {
    padding: 1rem;
    height: 100%;
    box-sizing: border-box;
  }

  .panel-title {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #94a3b8;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .empty {
    text-align: center;
    color: #94a3b8;
    margin-top: 3rem;
    padding: 0 1rem;
    font-size: 0.85rem;
    line-height: 1.6;
  }

  .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }

  .word-display {
    font-family: 'Amiri', serif;
    font-size: 2.5rem;
    text-align: center;
    padding: 1rem 0;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 1rem;
  }

  .detail-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }

  .detail-table tr:nth-child(even) {
    background: #f1f5f9;
  }

  .detail-table td {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }

  .key {
    color: #64748b;
    font-weight: 600;
    white-space: nowrap;
    width: 45%;
  }

  .val {
    color: #1e293b;
    word-break: break-word;
  }
</style>
