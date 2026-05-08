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

  let surah = $derived(SURAHS.find(s => s.id === surahId));
  let verseCount = $derived(SURAHS.find(s => s.id === surahId)?.v || 1);
  let verseOptions = $derived(Array.from({ length: verseCount }, (_, i) => i + 1));

  async function loadVerse() {
    loading = true;
    error = null;
    selectedMorpheme = null;
    tokens = [];
    verseData = null;

    try {
      const { data: verse, error: vErr } = await supabase
        .from('verse')
        .select('id, verse, text_uthmani')
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
            root ( root_text, root_type ),
            lemmas:analysis_lemma ( rank, lemma ( arabic_text ) ),
            patterns:analysis_pattern ( rank, pattern ( arabic_text ) )
          )
        `)
        .in('token_id', tokenIds)
        .order('morpheme_pos');

      if (mErr) throw mErr;

      const morphByToken = {};
      morphemes.forEach(m => {
        if (!morphByToken[m.token_id]) morphByToken[m.token_id] = [];
        morphByToken[m.token_id].push(m);
      });

      tokens = toks.map(t => ({ ...t, morphemes: morphByToken[t.id] || [] }));

    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  function onSurahChange() {
    verseNum = 1;
    loadVerse();
  }

  function prevVerse() { if (verseNum > 1) { verseNum--; loadVerse(); } }
  function nextVerse() { if (verseNum < verseCount) { verseNum++; loadVerse(); } }

  function selectMorpheme(m) {
    selectedMorpheme = selectedMorpheme?.id === m.id ? null : m;
  }

  function getDetailRows(m) {
    const a = m.analysis?.[0];
    if (!a) return [];
    const lemmas = a.lemmas?.map(l => l.lemma?.arabic_text).filter(Boolean).join(' / ') || null;
    const patterns = a.patterns?.map(p => p.pattern?.arabic_text).filter(Boolean).join(' / ') || null;
    return [
      ['Type', a.morpheme_type],
      ['POS', a.pos_code],
      ['Root', a.root?.root_text, true],
      ['Lemma', lemmas, true],
      ['Pattern', patterns, true],
      ['Person', a.person],
      ['Gender', a.gender],
      ['Number', a.number],
      ['Case', a.grammatical_case],
      ['Definiteness', a.definiteness],
      ['Aspect', a.v_aspect],
      ['Mood', a.v_mood],
      ['Voice', a.v_voice],
      ['Verb Form', a.v_form ? `Form ${a.v_form}` : null],
      ['Noun Type', a.n_type],
      ['F1 Type', a.f1_type],
    ].filter(([, val]) => val != null && val !== '');
  }

  loadVerse();
</script>

<div class="page">
  <div class="topbar">
    <div class="topbar-left">
      <label class="ctrl-label">
        <span class="arabic">السورة</span>
        <select bind:value={surahId} onchange={onSurahChange}>
          {#each SURAHS as s}
            <option value={s.id}>{s.id}. {s.ar} — {s.en}</option>
          {/each}
        </select>
      </label>
      <label class="ctrl-label">
        <span class="arabic">الآية</span>
        <select bind:value={verseNum} onchange={loadVerse}>
          {#each verseOptions as n}
            <option value={n}>{n}</option>
          {/each}
        </select>
      </label>
      <div class="nav-btns">
        <button onclick={prevVerse} disabled={verseNum <= 1}>◀</button>
        <button onclick={nextVerse} disabled={verseNum >= verseCount}>▶</button>
      </div>
    </div>
    {#if surah}
      <div class="surah-title">
        <span class="arabic surah-name">{surah.ar}</span>
        <span class="surah-en">{surah.en} : {verseNum}</span>
      </div>
    {/if}
  </div>

  <div class="main-layout">
    <div class="analysis-panel">
      {#if selectedMorpheme}
        <div class="panel-header">
          <div class="panel-word arabic">{selectedMorpheme.morpheme_u}</div>
          {#if selectedMorpheme.morpheme_s && selectedMorpheme.morpheme_s !== selectedMorpheme.morpheme_u}
            <div class="panel-word-s arabic">{selectedMorpheme.morpheme_s}</div>
          {/if}
          <div class="panel-pos">{selectedMorpheme.analysis?.[0]?.pos_code || '—'}</div>
        </div>
        <table class="analysis-table">
          <tbody>
            {#each getDetailRows(selectedMorpheme) as [label, val, isAr]}
              <tr>
                <td class="al">{label}</td>
                <td class="av" class:arabic={isAr}>{val}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else}
        <div class="panel-empty">
          <p class="arabic">اضغط على أي مورفيم</p>
          <p>Click any morpheme<br>to see its analysis</p>
        </div>
      {/if}
    </div>

    <div class="verses-area">
      {#if loading}
        <div class="loading">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>
      {:else if error}
        <div class="error">Error: {error}</div>
      {:else if verseData}
        <div class="verse-banner">
          <p class="arabic verse-full">{verseData.text_uthmani}</p>
        </div>
        <div class="tokens-area">
          <div class="tokens-row">
            {#each tokens as token}
              <div class="token-group">
                {#each token.morphemes as morpheme}
                  <button
                    class="morpheme-btn"
                    class:active={selectedMorpheme?.id === morpheme.id}
                    onclick={() => selectMorpheme(morpheme)}
                  >
                    <span class="arabic morph-text">{morpheme.morpheme_u}</span>
                    {#if morpheme.analysis?.[0]?.pos_code}
                      <span class="morph-pos">{morpheme.analysis[0].pos_code}</span>
                    {/if}
                  </button>
                {/each}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 64px);
    overflow: hidden;
  }
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 1.5rem;
    background: var(--ink);
    border-bottom: 1px solid rgba(200,146,42,0.4);
    direction: ltr;
    flex-shrink: 0;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .topbar-left { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .ctrl-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--gold-light);
    font-family: 'Scheherazade New', serif;
    font-size: 1rem;
  }
  .ctrl-label select {
    padding: 0.28rem 0.55rem;
    background: rgba(255,255,255,0.08);
    border: 1px solid var(--gold-muted);
    border-radius: 4px;
    color: var(--parchment);
    font-family: 'EB Garamond', serif;
    font-size: 0.88rem;
    max-width: 280px;
  }
  .ctrl-label select option { background: var(--ink); }
  .nav-btns { display: flex; gap: 0.3rem; }
  .nav-btns button {
    padding: 0.28rem 0.65rem;
    background: transparent;
    border: 1px solid var(--gold-muted);
    border-radius: 4px;
    color: var(--gold);
    cursor: pointer;
    transition: background 0.15s;
    font-size: 0.85rem;
  }
  .nav-btns button:hover:not(:disabled) { background: rgba(200,146,42,0.15); }
  .nav-btns button:disabled { opacity: 0.3; cursor: not-allowed; }
  .surah-title { display: flex; flex-direction: column; align-items: flex-end; }
  .surah-name { font-size: 1.3rem; color: var(--gold-light); }
  .surah-en { font-size: 0.7rem; color: var(--gold-muted); letter-spacing: 0.06em; }
  .main-layout { display: flex; flex: 1; overflow: hidden; }
  .analysis-panel {
    width: 270px;
    min-width: 220px;
    flex-shrink: 0;
    background: white;
    border-right: 2px solid var(--divider);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
  }
  .panel-header {
    background: var(--ink);
    padding: 1rem;
    text-align: center;
    border-bottom: 1px solid var(--gold-muted);
  }
  .panel-word { font-size: 2.2rem; color: var(--gold-light); line-height: 1.8; }
  .panel-word-s { font-size: 1rem; color: #999; }
  .panel-pos { font-size: 0.78rem; color: var(--gold); letter-spacing: 0.1em; margin-top: 0.2rem; }
  .panel-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.6rem;
    color: var(--text-muted);
    font-style: italic;
    padding: 2rem;
    text-align: center;
  }
  .panel-empty p { font-size: 0.88rem; line-height: 1.5; }
  .panel-empty .arabic { font-size: 1.2rem; font-style: normal; }
  .analysis-table { width: 100%; border-collapse: collapse; font-size: 0.86rem; }
  .analysis-table tr:nth-child(even) { background: var(--parchment); }
  .al { padding: 0.38rem 0.75rem; color: var(--text-muted); font-style: italic; width: 42%; vertical-align: top; }
  .av { padding: 0.38rem 0.5rem; color: var(--ink); font-weight: 500; }
  .verses-area {
    flex: 1;
    overflow-y: auto;
    background: var(--parchment);
    display: flex;
    flex-direction: column;
  }
  .verse-banner {
    background: linear-gradient(135deg, var(--ink) 0%, #2a1f0a 100%);
    padding: 1.5rem 2rem;
    text-align: center;
    border-bottom: 2px solid var(--gold-muted);
    flex-shrink: 0;
  }
  .verse-full { font-size: 1.8rem; line-height: 2.2; color: var(--parchment); }
  .tokens-area { padding: 1.5rem 2rem; overflow-y: auto; }
  .tokens-row {
    display: flex;
    flex-direction: row-reverse;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: flex-start;
  }
  .token-group { display: flex; flex-direction: row-reverse; gap: 0.2rem; }
  .morpheme-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.12rem;
    padding: 0.35rem 0.45rem;
    background: white;
    border: 1px solid var(--divider);
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.12s;
    box-shadow: 0 1px 4px var(--shadow);
  }
  .morpheme-btn:hover { border-color: var(--gold-muted); background: var(--parchment-dark); }
  .morpheme-btn.active {
    border-color: var(--gold);
    background: rgba(200,146,42,0.15);
    box-shadow: 0 0 0 2px rgba(200,146,42,0.3);
  }
  .morph-text { font-size: 1.3rem; line-height: 1.7; }
  .morph-pos { font-size: 0.52rem; color: var(--text-muted); font-family: 'EB Garamond', serif; }
  .loading {
    display: flex; align-items: center; gap: 1rem;
    justify-content: center; padding: 5rem;
    color: var(--text-muted); font-style: italic;
  }
  .spinner {
    width: 26px; height: 26px;
    border: 2px solid var(--divider);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error { padding: 2rem; color: var(--rust); }
</style>
