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
