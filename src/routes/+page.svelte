Yes! That's the original. Now I can see exactly what to change. The only changes needed are:

Replace the <select> + <input> + <button> toolbar with two labeled dropdowns
Auto-load on surah change (already works via onchange={loadSurah})
Add Aya dropdown that scrolls
Everything else stays identical. Here is the file with ONLY the toolbar changed:

src/routes/+page.svelte
<script>
  import { get, fetchAll } from '$lib/supabase.js';
  import AnalysisPanel from '$lib/AnalysisPanel.svelte';

  let surahs = $state([]);
  let selectedSurah = $state('');
  let verses = $state([]);
  let tokensByVerse = $state({});
  let loadingVerses = $state(false);
  let selectedTokenId = $state(null);
  let activeTokenId = $state(null);
  let selectedAya = $state(1);

  let surahInfo = $derived(surahs.find(s => s.id == selectedSurah));
  let ayaCount = $derived(verses.length);
  let ayaOptions = $derived(Array.from({ length: ayaCount }, (_, i) => i + 1));

  $effect(() => { loadSurahs(); });

  async function loadSurahs() {
    surahs = await get('surah', { select: 'id,name_arabic,name_english', order: 'id.asc' });
  }

  async function loadSurah() {
    if (!selectedSurah) return;
    loadingVerses = true;
    selectedTokenId = null;
    activeTokenId = null;
    tokensByVerse = {};
    selectedAya = 1;
    verses = await fetchAll('verse', {
      select: 'id,verse,text_uthmani',
      surah: `eq.${selectedSurah}`,
      order: 'verse.asc'
    });
    const verseIds = verses.map(v => v.id).join(',');
    const tokens = await fetchAll('token', {
      select: 'id,verse_id,token_pos,text_uthmani',
      verse_id: `in.(${verseIds})`,
      order: 'verse_id.asc,token_pos.asc'
    });
    const byVerse = {};
    tokens.forEach(t => {
      if (!byVerse[t.verse_id]) byVerse[t.verse_id] = [];
      byVerse[t.verse_id].push(t);
    });
    tokensByVerse = byVerse;
    loadingVerses = false;
  }

  function selectToken(tokenId) {
    selectedTokenId = tokenId;
    activeTokenId = tokenId;
  }

  function jumpToAya(n) {
    selectedAya = n;
    const el = document.getElementById(`verse-${n}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

<div class="layout">
  <div class="reading-panel">

    <div class="toolbar">
      <label class="toolbar-label">
        سورة Surah
        <select bind:value={selectedSurah} onchange={loadSurah}>
          <option value="">-- Select Surah --</option>
          {#each surahs as s}
            <option value={s.id}>{s.id}. {s.name_arabic} — {s.name_english}</option>
          {/each}
        </select>
      </label>

      <label class="toolbar-label">
        آية Verse
        <select
          bind:value={selectedAya}
          onchange={() => jumpToAya(selectedAya)}
          disabled={ayaCount === 0}
        >
          {#each ayaOptions as n}
            <option value={n}>{n}</option>
          {/each}
        </select>
      </label>
    </div>

    <div class="content">
      {#if !selectedSurah}
        <div class="empty">اختر سورة — Select a surah</div>
      {:else if loadingVerses}
        <div class="empty">جاري التحميل...</div>
      {:else}
        <div class="surah-title">
          <div class="arabic-name">{surahInfo?.name_arabic}</div>
          <div class="english-name">{surahInfo?.name_english}</div>
        </div>
        {#if selectedSurah != 1 && selectedSurah != 9}
          <div class="bismillah">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
        {/if}
        {#each verses as v}
          <div class="verse-block" id="verse-{v.verse}">
            <div class="verse-num">{selectedSurah}:{v.verse}</div>
            <div class="verse-text">
              {#each (tokensByVerse[v.id] || []) as t}
                <button class="word-btn" class:active={activeTokenId===t.id} onclick={()=>selectToken(t.id)}>
                  {t.text_uthmani}
                </button>
              {/each}
              <span class="verse-marker">﴿{v.verse}﴾</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>

  <div class="analysis-panel">
    <div class="panel-header">التحليل الصرفي — Morphological Analysis</div>
    <AnalysisPanel tokenId={selectedTokenId} />
  </div>
</div>

<style>
.layout{display:flex;height:100%;overflow:hidden;}
.reading-panel{flex:1;display:flex;flex-direction:column;overflow:hidden;background:#fafafa;}
.toolbar{display:flex;gap:16px;align-items:center;padding:10px 16px;background:white;border-bottom:1px solid #ddd;flex-shrink:0;}
.toolbar-label{display:flex;align-items:center;gap:6px;font-size:13px;color:#555;font-weight:500;}
.toolbar-label select{border:1px solid #ddd;border-radius:4px;padding:6px 10px;font-size:14px;min-width:200px;cursor:pointer;}
.content{flex:1;overflow-y:auto;padding:20px;}
.empty{text-align:center;color:#bbb;margin-top:80px;font-size:18px;font-family:'Traditional Arabic',Arial,sans-serif;}
.surah-title{text-align:center;margin-bottom:20px;}
.arabic-name{font-size:28px;font-family:'Traditional Arabic',Arial,sans-serif;color:#1a472a;direction:rtl;}
.english-name{font-size:14px;color:#888;margin-top:4px;}
.bismillah{text-align:center;font-size:24px;font-family:'Traditional Arabic',Arial,sans-serif;color:#333;margin-bottom:16px;direction:rtl;}
.verse-block{background:white;border-radius:8px;padding:14px 18px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,0.07);}
.verse-num{font-size:11px;color:#aaa;margin-bottom:8px;direction:ltr;}
.verse-text{direction:rtl;line-height:2.6;font-size:24px;font-family:'Traditional Arabic',Arial,sans-serif;text-align:right;}
.word-btn{display:inline;background:none;border:none;cursor:pointer;padding:2px 4px;border-radius:4px;font-size:inherit;font-family:inherit;color:#222;transition:background 0.15s;}
.word-btn:hover{background:#e8f5e9;color:#1a472a;}.word-btn.active{background:#1a472a;color:white;}
.verse-marker{color:#1a472a;font-size:18px;margin-right:6px;}
.analysis-panel{width:400px;flex-shrink:0;display:flex;flex-direction:column;border-right:1px solid #ddd;overflow:hidden;}
.panel-header{background:#1a472a;color:white;padding:12px 16px;font-size:15px;font-family:'Traditional Arabic',Arial,sans-serif;flex-shrink:0;}
</style>
