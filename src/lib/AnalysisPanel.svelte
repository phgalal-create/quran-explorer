<script>
  export let morpheme = null;
</script>

<div class="analysis-panel">
  {#if !morpheme}
    <p class="hint">Click a word in the text to see its analysis.</p>
  {:else}
    <h3 class="word" dir="rtl">{morpheme.morpheme_u}</h3>
    <table class="details">
      <tbody>
        {#each Object.entries(morpheme) as [key, val]}
          {#if val !== null && val !== ''}
            <tr>
              <td class="key">{key}</td>
              <td class="val">{val}</td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .analysis-panel {
    font-size: 0.85rem;
  }

  .hint {
    color: #94a3b8;
    font-style: italic;
    margin-top: 2rem;
    text-align: center;
  }

  .word {
    font-size: 2rem;
    text-align: center;
    margin-bottom: 1rem;
    font-family: 'Amiri', serif;
    color: #1e293b;
  }

  .details {
    width: 100%;
    border-collapse: collapse;
  }

  .details tr:nth-child(even) {
    background: #f8fafc;
  }

  .details td {
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid #f1f5f9;
    vertical-align: top;
  }

  .key {
    color: #64748b;
    font-weight: 500;
    white-space: nowrap;
    width: 40%;
  }

  .val {
    color: #1e293b;
    word-break: break-word;
  }
</style>
