<script>
  import { supabase } from '$lib/supabase.js';
  import { SURAHS } from '$lib/surahs.js';

  let surahId = $state(1);
  let verseNum = $state(1);
  let verseData = $state(null);
  let tokens = $state([]);
  let loading = $state(false);
  let error = $state(null);
  let selectedMorpheme = $state(null);

  $derived.by(() => {
    const s = SURAHS.find(s => s.id === surahId);
    return s?.v || 1;
  });

  let verseCount = $derived(SURAHS.find(s => s.id === surahId)?.v || 1);
  let surah = $derived(SURAHS.find(s => s.id === surahId));
  let verseOptions = $derived(Array.from({ length: verseCount }, (_, i) => i + 1));

  async function loadVerse() {
    loading = true;
    error = null;
    selectedMorpheme = null;
    tokens = [];

    try {
      const { data: verse, error: vErr } = await supabase
        .from('verse')
        .select('id, text_uthmani')
        .eq('surah', surahId)
        .eq('verse', verseNum)
        .single();

      if (vErr) throw vErr;
      verseData = verse;

      const { data: toks, error: tErr } = await supabase
        .from('token')
        .select('id, token_pos, text_uthmani')
        .eq('verse_id', verse.id)
        .order('token_pos');

      if (tErr) throw tErr;

      const tokenIds = toks.map(t => t.id);

      const { data: morphemes, error: mErr } = await supabase
        .from('morpheme')
        .select(`
          id, morpheme_pos, morpheme_u, morpheme_s, token_id,
          analysis (
            id, morpheme_type, pos_code, f1_type, n_type,
            person, gender, number, grammatical_case, definiteness,
            v_aspect, v_mood, v_voice, v_form, sp,
            pos ( code, arabic, meaning, pos_group ),
            root ( root_text, r1, r2, r3, r4, root_type ),
            lemmas:analysis_lemma ( rank, lemma ( arabic_text ) ),
            patterns:analysis_pattern ( rank, pattern ( arabic_text ) )
          )
        `)
        .in('token_id', tokenIds)
        .order('morpheme_pos');

      if (mErr) throw mErr;

      const byToken = {};
      morphemes.forEach(m => {
        if (!byToken[m.token_id]) byToken[m.token_id] = [];
        byToken[m.token_id].push(m);
      });

      tokens = toks.map(t => ({ ...t, morphemes: byToken[t.id] || [] }));
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function onSurahChange(e) {
    surahId = Number(e.target.value);
    verseNum = 1;
    loadVerse();
  }

  function onVerseChange(e) {
    verseNum = Number(e.target.value);
    loadVerse();
  }

  function prevVerse() { if (verseNum > 1) { verseNum--; loadVerse(); } }
  function nextVerse() { if (verseNum < verseCount) { verseNum++; loadVerse(); } }

  function selectMorpheme(m) {
    selectedMorpheme = selectedMorpheme?.id === m.id ? null : m;
  }

  function getPosGroup(m) {
    return m.analysis?.[0]?.pos?.pos_group || '';
  }

  function getPosCode(m) {
    return m.analysis?.[0]?.pos_code || '—';
  }

  function getDetailRows(m) {
    const a = m.analysis?.[0];
    const lemmas = a?.lemmas?.map(l => l.lemma?.arabic_text).filter(Boolean).join(' / ') || null;
    const patterns = a?.patterns?.map(p => p.pattern?.arabic_text).filter(Boolean).join(' / ') || null;
    return [
      ['Morpheme (Uthmani)', m.morpheme_u, true],
      ['Morpheme (Standard)', m.morpheme_s, true],
      ['Type', a?.morpheme_type, false],
      ['POS Code', a?.pos_code, false],
      ['POS (Arabic)', a?.pos?.arabic, true],
      ['Root', a?.root?.root_text, true],
      ['Lemma', lemmas, true],
      ['Pattern', patterns, true],
      ['Person', a?.person, false],
      ['Gender', a?.gender, false],
      ['Number', a?.number, false],
      ['Case', a?.grammatical_case, false],
      ['Definiteness', a?.definiteness, false],
      ['Verb Aspect', a?.v_aspect, false],
      ['Verb Mood', a?.v_mood, false],
      ['Verb Voice', a?.v_voice, false],
      ['Verb Form', a?.v_form ? `Form ${a.v_form}` : null, false],
      ['Noun Type', a?.n_type, false],
    ].filter(([, val]) => val != null && val !== '');
  }

  // Load initial verse
  loadVerse();
</script>

<!-- Controls -->
<div class="controls">
  <div class="control-group">
    <label>السورة</label>
    <select onchange={onSurahChange} value={surahId}>
      {#each SURAHS as s}
        <option value={s.id}>{s.id}. {s.ar} — {s.en}</option>
      {/each}
    </select>
  </div>

  <div class="control-group">
    <label>الآية</label>
    <select onchange={onVerseChange} value={verseNum}>
      {#each verseOptions as n}
        <option value={n}>{n}</option>
      {/each}
    </select>
  </div>

  <div class="verse-ref">
    <span class="arabic">{surah?.ar} : {verseNum}</span>
  </div>

  <div class="nav-btns">
    <button onclick={prevVerse} disabled={verseNum <= 1}>◀ Prev</button>
    <button onclick={nextVerse} disabled={verseNum >= verseCount}>Next ▶</button>
  </div>
</div>

<!-- Verse text -->
{#if verseData}
  <div class="verse-banner">
    <p class="arabic verse-text">{verseData.text_uthmani}</p>
  </div>
{/if}

<!-- Main -->
<div class="main">
  <div class="token-area">
    {#if loading}
      <div class="loading"><div class="spinner"></div> Loading...</div>
    {:else if error}
      <div class="error">Error: {error}</div>
    {:else}
      <div class="token-row">
        {#each tokens as token}
          <div class="token-card">
            <div class="arabic token-text">{token.text_uthmani}</div>
            <div class="morpheme-list">
              {#each token.morphemes as m}
                {@const posGroup = getPosGroup(m)}
                {@const posCode = getPosCode(m)}
                <button
                  class="morpheme-btn"
                  class:active={selectedMorpheme?.id === m.id}
                  onclick={() => selectMorpheme(m)}
                >
                  <span class="arabic morpheme-text">{m.morpheme_u}</span>
                  <span class="pos-tag"
                    class:verb={posGroup === 'Verbal'}
                    class:nominal={posGroup === 'Nominal'}
                    class:particle={posGroup === 'Particle'}
                  >{posCode}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Detail Panel -->
  {#if selectedMorpheme}
    <div class="detail-panel">
      <div class="detail-header">
        <span class="arabic detail-word">{selectedMorpheme.morpheme_u}</span>
        <button class="close-btn" onclick={() => selectedMorpheme = null}>✕</button>
      </div>
      <table class="detail-table">
        <tbody>
          {#each getDetailRows(selectedMorpheme) as [label, val, isAr]}
            <tr>
              <td class="detail-label">{label}</td>
              <td class="detail-value" class:arabic={isAr}>{val}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

<!-- Legend -->
<div class="legend">
  <span class="leg verb">Verb</span>
  <span class="leg nominal">Nominal</span>
  <span class="leg particle">Particle</span>
</div>

<style>
  .controls {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.9rem 2rem;
    background: var(--ink);
    border-bottom: 1px solid rgba(200,146,42,0.3);
    direction: ltr;
    flex-wrap: wrap;
  }

  .control-group { display: flex; align-items: center; gap: 0.5rem; }

  label {
    font-family: 'Scheherazade New', serif;
    color: var(--gold-light);
    font-size: 1.1rem;
  }

  select {
    padding: 0.35rem 0.7rem;
    background: rgba(255,255,255,0.07);
    border: 1px solid var(--gold-muted);
    border-radius: 4px;
    color: var(--parchment);
    font-family: 'EB Garamond', serif;
    font-size: 0.95rem;
    cursor: pointer;
    max-width: 280px;
  }

  select option { background: var(--ink); color: var(--parchment); }

  .verse-ref { margin-left: auto; font-size: 1.3rem; color: var(--gold); }

  .nav-btns { display: flex; gap: 0.4rem; }

  .nav-btns button {
    padding: 0.3rem 0.8rem;
    background: transparent;
    border: 1px solid var(--gold-muted);
    border-radius: 4px;
    color: var(--gold);
    font-family: 'EB Garamond', serif;
    cursor: pointer;
    transition: background 0.15s;
  }

  .nav-btns button:hover:not(:disabled) { background: rgba(200,146,42,0.15); }
  .nav-btns button:disabled { opacity: 0.3; cursor: not-allowed; }

  .verse-banner {
    background: linear-gradient(135deg, var(--ink) 0%, #2a1f0a 100%);
    padding: 1.5rem 2rem;
    text-align: center;
    border-bottom: 2px solid var(--gold-muted);
  }

  .verse-text { font-size: 1.85rem; line-height: 2.2; color: var(--parchment); }

  .main { display: flex; flex: 1; min-height: calc(100vh - 220px); }

  .token-area { flex: 1; padding: 2rem; overflow-y: auto; }

  .token-row {
    display: flex;
    flex-direction: row-reverse;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
  }

  .token-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    padding: 0.75rem;
    background: white;
    border: 1px solid var(--divider);
    border-radius: 8px;
    box-shadow: 0 2px 8px var(--shadow);
    min-width: 70px;
    transition: box-shadow 0.15s;
  }

  .token-card:hover { box-shadow: 0 4px 16px rgba(200,146,42,0.2); border-color: var(--gold-muted); }

  .token-text { font-size: 1.5rem; line-height: 1.6; }

  .morpheme-list {
    display: flex;
    flex-direction: row-reverse;
    flex-wrap: wrap;
    gap: 0.3rem;
    justify-content: center;
  }

  .morpheme-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.2rem;
    padding: 0.3rem 0.45rem;
    background: var(--parchment);
    border: 1px solid var(--divider);
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.12s;
  }

  .morpheme-btn:hover { border-color: var(--gold-muted); background: var(--parchment-dark); }
  .morpheme-btn.active { border-color: var(--gold); background: rgba(200,146,42,0.12); box-shadow: 0 0 0 2px rgba(200,146,42,0.3); }

  .morpheme-text { font-size: 1.05rem; }

  .pos-tag {
    font-size: 0.58rem;
    font-family: 'EB Garamond', serif;
    padding: 0.05rem 0.25rem;
    border-radius: 3px;
    font-weight: 600;
    background: var(--parchment-dark);
    color: var(--text-muted);
  }

  .pos-tag.verb     { background: #fde8d0; color: #7a3010; }
  .pos-tag.nominal  { background: #d8eaf5; color: #0e4c7a; }
  .pos-tag.particle { background: #ddf0e4; color: #1a5c35; }

  .detail-panel {
    width: 320px;
    min-width: 280px;
    background: white;
    border-left: 2px solid var(--divider);
    overflow-y: auto;
    max-height: calc(100vh - 180px);
    position: sticky;
    top: 64px;
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem 0.75rem;
    border-bottom: 1px solid var(--divider);
    background: var(--ink);
  }

  .detail-word { font-size: 2rem; color: var(--gold-light); }

  .close-btn { background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1rem; }
  .close-btn:hover { color: var(--rust); }

  .detail-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .detail-table tr:nth-child(even) { background: var(--parchment); }

  .detail-label { padding: 0.45rem 1rem; color: var(--text-muted); font-style: italic; width: 40%; }
  .detail-value { padding: 0.45rem 0.5rem; font-weight: 500; }

  .loading { display: flex; align-items: center; gap: 0.75rem; justify-content: center; padding: 4rem; color: var(--text-muted); }

  .spinner {
    width: 24px; height: 24px;
    border: 2px solid var(--divider);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .error { padding: 2rem; color: var(--rust); }

  .legend {
    display: flex;
    gap: 0.75rem;
    padding: 0.6rem 2rem;
    background: var(--parchment-dark);
    border-top: 1px solid var(--divider);
    direction: ltr;
  }

  .leg {
    font-size: 0.72rem;
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
    font-weight: 600;
  }

  .leg.verb     { background: #fde8d0; color: #7a3010; }
  .leg.nominal  { background: #d8eaf5; color: #0e4c7a; }
  .leg.particle { background: #ddf0e4; color: #1a5c35; }
</style>
