<script>
  import { fetchAll } from '$lib/supabase.js';

  let searchQuery  = $state('');
  let allRoots     = $state([]);
  let selectedRoot = $state(null);
  let stats        = $state(null);
  let loadingList  = $state(false);
  let loadingStats = $state(false);

  // Filter client-side so switching roots feels instant
  let filteredRoots = $derived(
    searchQuery.trim()
      ? allRoots.filter(r => r.root_text.includes(searchQuery.trim()))
      : allRoots
  );

  $effect(() => { loadAllRoots(); });

  async function loadAllRoots() {
    loadingList = true;
    allRoots = await fetchAll('root', {
      select: 'id,root_text,r1,r2,r3,r4,root_type',
      order: 'root_text.asc'
    });
    loadingList = false;
  }

  async function selectRoot(root) {
    selectedRoot = root;
    stats = null;
    loadingStats = true;

    // Fetch all analyses for this root with embedded lemmas + patterns
    const analyses = await fetchAll('analysis', {
      select: 'id,pos_code,analysis_lemma(lemma(arabic_text)),analysis_pattern(pattern(arabic_text))',
      root_id: `eq.${root.id}`
    });

    const lemmaSet   = new Set();
    const patternSet = new Set();
    const posCounts  = {};

    (analyses || []).forEach(a => {
      if (a.pos_code) posCounts[a.pos_code] = (posCounts[a.pos_code] || 0) + 1;
      (a.analysis_lemma   || []).forEach(al => { if (al.lemma?.arabic_text)   lemmaSet.add(al.lemma.arabic_text); });
      (a.analysis_pattern || []).forEach(ap => { if (ap.pattern?.arabic_text) patternSet.add(ap.pattern.arabic_text); });
    });

    stats = {
      total:    analyses.length,
      lemmas:   [...lemmaSet],
      patterns: [...patternSet],
      pos:      Object.entries(posCounts).sort((a, b) => b[1] - a[1])
    };

    loadingStats = false;
  }

  function lexiconUrl(root) {
    return `https://arabiclexicon.hawramani.com/?q=${encodeURIComponent(root.root_text)}`;
  }

  const ROOT_TYPE_LABELS = {
    sound:         'Sound صحيح',
    doubled:       'Doubled مضاعف',
    hollow:        'Hollow أجوف',
    defective:     'Defective ناقص',
    quadrilateral: 'Quadrilateral رباعي'
  };
</script>

<div class="page">

  <!-- ── LEFT: root list ── -->
  <div class="sidebar">
    <div class="search-wrap">
      <input
        class="search-input"
        bind:value={searchQuery}
        placeholder="ابحث... Search"
        dir="rtl"
      />
      <span class="root-count">{filteredRoots.length}</span>
    </div>

    {#if loadingList}
      <div class="msg">Loading roots…</div>
    {:else}
      <div class="root-list">
        {#each filteredRoots as r}
          <button
            class="root-item"
            class:active={selectedRoot?.id === r.id}
            onclick={() => selectRoot(r)}
          >
            <span class="root-arabic">{r.root_text}</span>
            {#if r.root_type}
              <span class="chip {r.root_type}">{r.root_type}</span>
            {/if}
          </button>
        {/each}
        {#if filteredRoots.length === 0}
          <div class="msg">No roots found</div>
        {/if}
      </div>
    {/if}
  </div>

  <!-- ── RIGHT: detail ── -->
  <div class="detail">
    {#if !selectedRoot}
      <div class="splash">
        <div class="splash-arabic">جذر</div>
        <div class="splash-hint">Select a root from the list</div>
      </div>

    {:else}
      <!-- Header card -->
      <div class="header-card">
        <div class="root-display">{selectedRoot.root_text}</div>

        <div class="letters-row">
          {#each [selectedRoot.r1, selectedRoot.r2, selectedRoot.r3, selectedRoot.r4].filter(Boolean) as letter, i}
            <div class="letter-box">
              <span class="letter-ar">{letter}</span>
              <span class="letter-lbl">ر{i + 1}</span>
            </div>
          {/each}
        </div>

        <div class="header-actions">
          {#if selectedRoot.root_type}
            <span class="chip {selectedRoot.root_type} lg">
              {ROOT_TYPE_LABELS[selectedRoot.root_type] || selectedRoot.root_type}
            </span>
          {/if}
          <a href={lexiconUrl(selectedRoot)} target="_blank" rel="noreferrer" class="lexicon-btn">
            Arabic Lexicon ↗
          </a>
        </div>
      </div>

      {#if loadingStats}
        <div class="msg" style="margin-top:24px;">Loading stats…</div>

      {:else if stats}
        <!-- Stat cards -->
        <div class="stats-row">
          {#each [
            { n: stats.total,            lbl: 'Analyses'  },
            { n: stats.lemmas.length,    lbl: 'Lemmas'    },
            { n: stats.patterns.length,  lbl: 'Patterns'  },
            { n: stats.pos.length,       lbl: 'POS types' }
          ] as s}
            <div class="stat-card">
              <div class="stat-num">{s.n}</div>
              <div class="stat-lbl">{s.lbl}</div>
            </div>
          {/each}
        </div>

        {#if stats.lemmas.length > 0}
          <div class="section">
            <div class="sec-title">Lemmas</div>
            <div class="tags">
              {#each stats.lemmas as l}<span class="tag">{l}</span>{/each}
            </div>
          </div>
        {/if}

        {#if stats.patterns.length > 0}
          <div class="section">
            <div class="sec-title">Patterns</div>
            <div class="tags">
              {#each stats.patterns as p}<span class="tag">{p}</span>{/each}
            </div>
          </div>
        {/if}

        {#if stats.pos.length > 0}
          <div class="section">
            <div class="sec-title">POS Distribution</div>
            <table class="pos-table">
              <thead><tr><th>POS</th><th>Count</th></tr></thead>
              <tbody>
                {#each stats.pos as [code, count]}
                  <tr>
                    <td><code>{code}</code></td>
                    <td>
                      <span class="bar-wrap">
                        <span class="bar" style="width:{Math.round((count / stats.total) * 100)}%"></span>
                        {count}
                      </span>
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}

        {#if stats.total === 0}
          <div class="msg" style="margin-top:24px;">No analyses recorded for this root yet.</div>
        {/if}
      {/if}
    {/if}
  </div>
</div>

<style>
/* Layout */
.page{display:flex;height:100%;overflow:hidden;background:#f5f5f5;}

/* Sidebar */
.sidebar{width:260px;flex-shrink:0;display:flex;flex-direction:column;background:white;border-left:1px solid #e0e0e0;overflow:hidden;}
.search-wrap{display:flex;align-items:center;gap:6px;padding:10px 12px;border-bottom:1px solid #eee;flex-shrink:0;}
.search-input{flex:1;border:1px solid #ddd;border-radius:6px;padding:7px 10px;font-size:17px;font-family:'Traditional Arabic',Arial,sans-serif;outline:none;direction:rtl;}
.search-input:focus{border-color:#1a472a;}
.root-count{font-size:11px;color:#bbb;white-space:nowrap;}
.root-list{flex:1;overflow-y:auto;}
.root-item{display:flex;justify-content:space-between;align-items:center;width:100%;padding:9px 14px;border:none;border-bottom:1px solid #f5f5f5;background:none;cursor:pointer;}
.root-item:hover{background:#f1f8f1;}
.root-item.active{background:#1a472a;}
.root-item.active .root-arabic{color:white;}
.root-arabic{font-size:20px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;color:#222;}
.msg{padding:20px;color:#bbb;text-align:center;font-size:14px;}

/* Type chips */
.chip{font-size:10px;padding:2px 7px;border-radius:10px;font-family:Arial;white-space:nowrap;}
.chip.sound        {background:#e8f5e9;color:#2e7d32;}
.chip.doubled      {background:#fff8e1;color:#f57f17;}
.chip.hollow       {background:#e3f2fd;color:#1565c0;}
.chip.defective    {background:#fce4ec;color:#c62828;}
.chip.quadrilateral{background:#f3e5f5;color:#6a1b9a;}
.chip.lg           {font-size:13px;padding:4px 12px;}
.root-item.active .chip{opacity:0.9;}

/* Detail panel */
.detail{flex:1;overflow-y:auto;padding:20px 24px;}
.splash{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ccc;}
.splash-arabic{font-size:90px;font-family:'Traditional Arabic',Arial,sans-serif;line-height:1;}
.splash-hint{font-size:14px;margin-top:8px;}

/* Header card */
.header-card{background:white;border-radius:10px;padding:20px 24px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);}
.root-display{font-size:60px;font-family:'Traditional Arabic',Arial,sans-serif;color:#1a472a;direction:rtl;line-height:1.2;margin-bottom:14px;}
.letters-row{display:flex;gap:8px;flex-direction:row-reverse;margin-bottom:14px;}
.letter-box{display:flex;flex-direction:column;align-items:center;background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:8px 14px;min-width:52px;}
.letter-ar{font-size:24px;font-family:'Traditional Arabic',Arial,sans-serif;color:#1a472a;}
.letter-lbl{font-size:10px;color:#aaa;margin-top:2px;}
.header-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.lexicon-btn{padding:7px 16px;background:#1a472a;color:white;border-radius:6px;text-decoration:none;font-size:13px;transition:background 0.15s;}
.lexicon-btn:hover{background:#2d6a4f;}

/* Stat cards */
.stats-row{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;}
.stat-card{flex:1;min-width:90px;background:white;border-radius:8px;padding:14px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.07);}
.stat-num{font-size:30px;font-weight:700;color:#1a472a;}
.stat-lbl{font-size:11px;color:#999;margin-top:2px;text-transform:uppercase;letter-spacing:0.4px;}

/* Sections */
.section{background:white;border-radius:8px;padding:16px 20px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.07);}
.sec-title{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px;}
.tags{display:flex;flex-wrap:wrap;gap:6px;direction:rtl;}
.tag{padding:5px 12px;background:#f0f7f0;border:1px solid #c8e6c9;border-radius:16px;font-size:19px;font-family:'Traditional Arabic',Arial,sans-serif;color:#1a472a;}

/* POS table */
.pos-table{width:100%;border-collapse:collapse;font-size:13px;}
.pos-table th{text-align:left;padding:7px 10px;background:#f9f9f9;border-bottom:2px solid #eee;color:#666;font-weight:600;}
.pos-table td{padding:7px 10px;border-bottom:1px solid #f5f5f5;vertical-align:middle;}
.pos-table tr:last-child td{border-bottom:none;}
.pos-table code{background:#f0f0f0;padding:2px 7px;border-radius:3px;font-size:12px;}
.bar-wrap{display:flex;align-items:center;gap:8px;}
.bar{display:inline-block;height:10px;background:#a5d6a7;border-radius:4px;min-width:3px;}
</style>
