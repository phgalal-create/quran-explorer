<script>
  import { get, post, patch, del } from './supabase.js';
  import { createEventDispatcher, onMount } from 'svelte';

  export let tokenId = null;

  const dispatch = createEventDispatcher();

  let morphemes = [];
  let selectedMorpheme = null;
  let analyses = [];
  let selectedAnalysisIdx = 0;
  let isNewAnalysis = false;
  let posData = [];
  let rootCache = {};
  let rootStatus = '';
  let statusMsg = '';
  let statusType = '';
  let loading = false;

  let fMtype = '', fPos = '', fCert = 1, fRoot = '';
  let fPerson = '', fGender = '', fNumber = '', fCase = '', fDef = '';
  let fVform = '', fF1type = '', fAspect = '', fMood = '', fVoice = '';
  let fNtype = '', fNotes = '', fSp = '';
  let lemmaRows = [];
  let patternRows = [];

  onMount(async () => {
    posData = await get('pos', { select: 'code,arabic,meaning,pos_group', order: 'pos_group,code' });
  });

  $: if (tokenId) loadMorphemes();

  async function loadMorphemes() {
    if (!tokenId) return;
    morphemes = await get('morpheme', {
      select: 'id,morpheme_pos,morpheme_u,morpheme_s',
      token_id: `eq.${tokenId}`,
      order: 'morpheme_pos.asc'
    });
    if (morphemes.length > 0) await selectMorpheme(morphemes[0]);
  }

  async function selectMorpheme(m) {
    selectedMorpheme = m;
    loading = true;
    await loadAnalyses(m.id);
    loading = false;
  }

  async function loadAnalyses(mId) {
    analyses = await get('analysis', {
      select: '*',
      morpheme_id: `eq.${mId}`,
      order: 'is_primary.desc,id.asc'
    }) || [];
    selectedAnalysisIdx = 0;
    isNewAnalysis = false;
    if (analyses.length > 0) {
      await fillForm(analyses[0]);
    } else {
      isNewAnalysis = true;
      clearForm();
    }
  }

  async function fillForm(a) {
    fMtype = a.morpheme_type || '';
    fPos = a.pos_code || '';
    fCert = a.certainty || 1;
    fPerson = a.person || '';
    fGender = a.gender || '';
    fNumber = a.number || '';
    fCase = a.grammatical_case || '';
    fDef = a.definiteness || '';
    fSp = a.sp || '';
    fVform = a.v_form || '';
    fF1type = a.f1_type || '';
    fAspect = a.v_aspect || '';
    fMood = a.v_mood || '';
    fVoice = a.v_voice || '';
    fNtype = a.n_type || '';
    fNotes = a.notes || '';

    if (a.root_id) {
      const roots = await get('root', { select: 'root_text', id: `eq.${a.root_id}` });
      fRoot = roots[0]?.root_text || '';
      if (fRoot) rootCache[fRoot] = a.root_id;
      rootStatus = `✓ ID: ${a.root_id}`;
    } else {
      fRoot = '';
      rootStatus = '';
    }

    const als = await get('analysis_lemma', {
      select: 'id,rank,certainty,lemma(arabic_text)',
      analysis_id: `eq.${a.id}`,
      order: 'rank.asc'
    });
    lemmaRows = (als || []).map(al => ({ text: al.lemma?.arabic_text || '', certainty: al.certainty }));

    const aps = await get('analysis_pattern', {
      select: 'id,rank,certainty,pattern(arabic_text)',
      analysis_id: `eq.${a.id}`,
      order: 'rank.asc'
    });
    patternRows = (aps || []).map(ap => ({ text: ap.pattern?.arabic_text || '', certainty: ap.certainty }));
  }

  function clearForm() {
    fMtype = ''; fPos = ''; fCert = 1; fRoot = ''; rootStatus = '';
    fPerson = ''; fGender = ''; fNumber = ''; fCase = ''; fDef = ''; fSp = '';
    fVform = ''; fF1type = ''; fAspect = ''; fMood = ''; fVoice = '';
    fNtype = ''; fNotes = '';
    lemmaRows = []; patternRows = [];
  }

  async function onRootInput() {
    const text = fRoot.trim();
    if (!text) { rootStatus = ''; return; }
    if (rootCache[text]) { rootStatus = `✓ ID: ${rootCache[text]}`; return; }
    const data = await get('root', { select: 'id', root_text: `eq.${text}` });
    if (data?.length > 0) {
      rootCache[text] = data[0].id;
      rootStatus = `✓ ID: ${data[0].id}`;
    } else {
      rootStatus = '⚠ New root';
    }
  }

  async function saveAnalysis() {
    showStatus('Saving...', 'info');
    let rootId = null;
    const rootText = fRoot.trim();
    if (rootText) {
      if (rootCache[rootText]) {
        rootId = rootCache[rootText];
      } else {
        const ex = await get('root', { select: 'id', root_text: `eq.${rootText}` });
        if (ex?.length > 0) { rootId = ex[0].id; }
        else { const cr = await post('root', { root_text: rootText }); rootId = cr[0]?.id; }
        rootCache[rootText] = rootId;
      }
    }

    const data = {
      morpheme_id: selectedMorpheme.id,
      morpheme_type: fMtype || null,
      pos_code: fPos || null,
      root_id: rootId,
      person: parseInt(fPerson) || null,
      gender: fGender || null,
      number: fNumber || null,
      grammatical_case: fCase || null,
      definiteness: fDef || null,
      sp: fSp || null,
      v_form: parseInt(fVform) || null,
      v_aspect: fAspect || null,
      v_mood: fMood || null,
      v_voice: fVoice || null,
      f1_type: fF1type || null,
      n_type: fNtype || null,
      certainty: parseInt(fCert) || 1,
      is_primary: selectedAnalysisIdx === 0,
      notes: fNotes || null
    };

    let analysisId;
    if (isNewAnalysis || analyses.length === 0) {
      const res = await post('analysis', data);
      if (res.error) { showStatus('Error: ' + res.error.message, 'error'); return; }
      analysisId = res[0].id;
    } else {
      analysisId = analyses[selectedAnalysisIdx].id;
      const res = await patch('analysis', analysisId, data);
      if (res.error) { showStatus('Error: ' + res.error.message, 'error'); return; }
    }

    await saveLemmas(analysisId);
    await savePatterns(analysisId);
    showStatus('Saved ✓', 'success');
    await loadAnalyses(selectedMorpheme.id);
    setTimeout(() => statusMsg = '', 3000);
  }

  async function saveLemmas(analysisId) {
    const SB_URL = "https://xcbjhkpotvphupvcvmxd.supabase.co";
    const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYmpoa3BvdHZwaHVwdmN2bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzNDQsImV4cCI6MjA5MzU0MDM0NH0.zNwsSBbD-2SkhqIRceBdiUFRcKzLftMLA1XclZ1Vnak";
    await fetch(`${SB_URL}/rest/v1/analysis_lemma?analysis_id=eq.${analysisId}`, {
      method: 'DELETE',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    for (let i = 0; i < lemmaRows.length; i++) {
      const text = lemmaRows[i].text.trim();
      if (!text) continue;
      let lemmaId;
      const ex = await get('lemma', { select: 'id', arabic_text: `eq.${text}` });
      if (ex?.length > 0) { lemmaId = ex[0].id; }
      else { const cr = await post('lemma', { arabic_text: text }); lemmaId = cr[0]?.id; }
      if (lemmaId) await post('analysis_lemma', { analysis_id: analysisId, lemma_id: lemmaId, rank: i + 1, certainty: parseInt(lemmaRows[i].certainty) });
    }
  }

  async function savePatterns(analysisId) {
    const SB_URL = "https://xcbjhkpotvphupvcvmxd.supabase.co";
    const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYmpoa3BvdHZwaHVwdmN2bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzNDQsImV4cCI6MjA5MzU0MDM0NH0.zNwsSBbD-2SkhqIRceBdiUFRcKzLftMLA1XclZ1Vnak";
    await fetch(`${SB_URL}/rest/v1/analysis_pattern?analysis_id=eq.${analysisId}`, {
      method: 'DELETE',
      headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` }
    });
    for (let i = 0; i < patternRows.length; i++) {
      const text = patternRows[i].text.trim();
      if (!text) continue;
      let patternId;
      const ex = await get('pattern', { select: 'id', arabic_text: `eq.${text}` });
      if (ex?.length > 0) { patternId = ex[0].id; }
      else { const cr = await post('pattern', { arabic_text: text }); patternId = cr[0]?.id; }
      if (patternId) await post('analysis_pattern', { analysis_id: analysisId, pattern_id: patternId, rank: i + 1, certainty: parseInt(patternRows[i].certainty) });
    }
  }

  async function deleteAnalysis() {
    if (!analyses[selectedAnalysisIdx]) return;
    if (!confirm('Delete this analysis?')) return;
    await del('analysis', analyses[selectedAnalysisIdx].id);
    await loadAnalyses(selectedMorpheme.id);
    showStatus('Deleted.', 'info');
  }

  function addNewAnalysis() {
    isNewAnalysis = true;
    selectedAnalysisIdx = analyses.length;
    clearForm();
  }

  function showStatus(msg, type) {
    statusMsg = msg;
    statusType = type;
  }

  $: posGroups = posData.reduce((acc, p) => {
    if (!acc[p.pos_group]) acc[p.pos_group] = [];
    acc[p.pos_group].push(p);
    return acc;
  }, {});

  $: showVerbal = posData.find(p => p.code === fPos)?.pos_group === 'Verbal';
  $: showNominal = posData.find(p => p.code === fPos)?.pos_group === 'Nominal';
</script>

<div class="panel">
  {#if !tokenId}
    <div class="empty">انقر على كلمة<br><span>Click a word to analyze</span></div>
  {:else if loading}
    <div class="empty">جاري التحميل...</div>
  {:else}
    <div class="morpheme-tabs">
      {#each morphemes as m}
        <button
          class="m-tab"
          class:active={selectedMorpheme?.id === m.id}
          on:click={() => selectMorpheme(m)}
        >
          {m.morpheme_u}
        </button>
      {/each}
    </div>

    {#if selectedMorpheme}
      <div class="m-info">
        <div class="m-arabic">{selectedMorpheme.morpheme_u}</div>
        <div class="m-meta">
          {selectedMorpheme.morpheme_s || '—'} &nbsp;|&nbsp;
          Morpheme #{selectedMorpheme.morpheme_pos} &nbsp;|&nbsp;
          ID: {selectedMorpheme.id}
        </div>
      </div>

      <div class="a-tabs">
        {#each analyses as a, i}
          <button
            class="a-tab"
            class:active={i === selectedAnalysisIdx && !isNewAnalysis}
            on:click={async () => { selectedAnalysisIdx = i; isNewAnalysis = false; await fillForm(a); }}
          >
            {i + 1}{a.is_primary ? ' ★' : ''} ({a.pos_code || '?'})
          </button>
        {/each}
        <button class="a-tab new" on:click={addNewAnalysis}>+ New</button>
      </div>

      <div class="form-scroll">
        <div class="field-row">
          <div class="field">
            <label>Type</label>
            <select bind:value={fMtype}>
              <option value="">--</option>
              <option>Prefix</option><option>Stem</option><option>Suffix</option>
            </select>
          </div>
          <div class="field">
            <label>Certainty</label>
            <select bind:value={fCert}>
              <option value={1}>1 Confirmed</option>
              <option value={2}>2 Probable</option>
              <option value={3}>3 Uncertain</option>
            </select>
          </div>
        </div>

        <div class="field">
          <label>POS</label>
          <select bind:value={fPos}>
            <option value="">-- POS --</option>
            {#each Object.entries(posGroups) as [group, items]}
              <optgroup label={group}>
                {#each items as p}
                  <option value={p.code}>{p.code} — {p.arabic}</option>
                {/each}
              </optgroup>
            {/each}
          </select>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Root جذر</label>
            <input class="arabic" bind:value={fRoot} on:input={onRootInput} placeholder="كتب">
          </div>
          <div class="field" style="justify-content:flex-end;padding-bottom:6px;">
            <small style="color:#888;">{rootStatus}</small>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Person</label>
            <select bind:value={fPerson}>
              <option value="">--</option>
              <option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option>
            </select>
          </div>
          <div class="field">
            <label>Gender</label>
            <select bind:value={fGender}>
              <option value="">--</option>
              <option value="M">M</option><option value="F">F</option>
            </select>
          </div>
          <div class="field">
            <label>Number</label>
            <select bind:value={fNumber}>
              <option value="">--</option>
              <option value="S">S</option><option value="D">D</option><option value="P">P</option>
            </select>
          </div>
        </div>

        <div class="field-row">
          <div class="field">
            <label>Case</label>
            <select bind:value={fCase}>
              <option value="">--</option>
              <option value="NOM">NOM</option><option value="ACC">ACC</option><option value="GEN">GEN</option>
            </select>
          </div>
          <div class="field">
            <label>Definiteness</label>
            <select bind:value={fDef}>
              <option value="">--</option>
              <option value="DEF">DEF</option><option value="INDEF">INDEF</option>
            </select>
          </div>
          {#if showNominal}
          <div class="field">
            <label>N Type</label>
            <select bind:value={fNtype}>
              <option value="">--</option>
              <option value="VN">VN</option><option value="AP">AP</option><option value="PP">PP</option>
            </select>
          </div>
          {/if}
        </div>

        {#if showVerbal || showNominal}
        <div class="field-row">
          <div class="field">
            <label>V Form</label>
            <select bind:value={fVform}>
              <option value="">--</option>
              {#each [1,2,3,4,5,6,7,8,9,10,11,12] as n}
                <option value={n}>Form {n}</option>
              {/each}
            </select>
          </div>
          {#if fVform == 1}
          <div class="field">
            <label>F1 Type</label>
            <select bind:value={fF1type}>
              <option value="">--</option>
              {#each ['aa','ai','au','ia','ii','iu','ua','ui','uu','??'] as t}
                <option value={t}>{t}</option>
              {/each}
            </select>
          </div>
          {/if}
        </div>
        {/if}

        {#if showVerbal}
        <div class="field-row">
          <div class="field">
            <label>Aspect</label>
            <select bind:value={fAspect}>
              <option value="">--</option>
              <option value="PERF">PERF</option><option value="IMPF">IMPF</option>
            </select>
          </div>
          {#if fAspect === 'IMPF'}
          <div class="field">
            <label>Mood</label>
            <select bind:value={fMood}>
              <option value="">--</option>
              <option value="IND">IND</option><option value="SUBJ">SUBJ</option>
              <option value="JUS">JUS</option><option value="IMPV">IMPV</option><option value="ENRG">ENRG</option>
            </select>
          </div>
          {/if}
          <div class="field">
            <label>Voice</label>
            <select bind:value={fVoice}>
              <option value="">--</option>
              <option value="ACT">ACT</option><option value="PASS">PASS</option>
            </select>
          </div>
        </div>
        {/if}

        <div class="section-label">Lemmas</div>
        {#each lemmaRows as row, i}
          <div class="sub-row">
            <input class="arabic" bind:value={row.text} placeholder="لَمَّا">
            <select bind:value={row.certainty} style="width:50px;">
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
            </select>
            <button class="btn-remove" on:click={() => lemmaRows = lemmaRows.filter((_,j) => j !== i)}>✕</button>
          </div>
        {/each}
        <button class="btn-add" on:click={() => lemmaRows = [...lemmaRows, {text:'', certainty:1}]}>+ Lemma</button>

        <div class="section-label" style="margin-top:10px;">Patterns</div>
        {#each patternRows as row, i}
          <div class="sub-row">
            <input class="arabic" bind:value={row.text} placeholder="فَعَلَ">
            <select bind:value={row.certainty} style="width:50px;">
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
            </select>
            <button class="btn-remove" on:click={() => patternRows = patternRows.filter((_,j) => j !== i)}>✕</button>
          </div>
        {/each}
        <button class="btn-add" on:click={() => patternRows = [...patternRows, {text:'', certainty:1}]}>+ Pattern</button>

        <div class="section-label" style="margin-top:10px;">Notes</div>
        <textarea bind:value={fNotes} rows="2" style="width:100%;border:1px solid #ddd;border-radius:4px;padding:6px;font-size:13px;direction:rtl;"></textarea>
      </div>

      <div class="save-bar">
        <button class="btn-save" on:click={saveAnalysis}>حفظ Save</button>
        <button class="btn-new" on:click={addNewAnalysis}>+ New</button>
        <button class="btn-del" on:click={deleteAnalysis}>Delete</button>
      </div>

      {#if statusMsg}
        <div class="status {statusType}">{statusMsg}</div>
      {/if}
    {/if}
  {/if}
</div>

<style>
.panel { display: flex; flex-direction: column; height: 100%; background: white; border-left: 1px solid #ddd; }
.empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #bbb; font-size: 16px; text-align: center; gap: 8px; font-family: 'Traditional Arabic', Arial, sans-serif; }
.empty span { font-size: 13px; font-family: Arial; }
.morpheme-tabs { display: flex; border-bottom: 1px solid #eee; overflow-x: auto; flex-shrink: 0; }
.m-tab { padding: 10px 16px; border: none; background: none; cursor: pointer; font-size: 20px; font-family: 'Traditional Arabic', Arial, sans-serif; border-bottom: 3px solid transparent; color: #555; direction: rtl; }
.m-tab:hover { background: #f5f5f5; }
.m-tab.active { border-bottom-color: #1a472a; color: #1a472a; }
.m-info { padding: 10px 14px; background: #f9f9f9; border-bottom: 1px solid #eee; flex-shrink: 0; }
.m-arabic { font-size: 26px; font-family: 'Traditional Arabic', Arial, sans-serif; direction: rtl; color: #1a472a; }
.m-meta { font-size: 12px; color: #888; margin-top: 2px; direction: ltr; }
.a-tabs { display: flex; gap: 4px; padding: 8px 12px; border-bottom: 1px solid #eee; flex-wrap: wrap; flex-shrink: 0; }
.a-tab { padding: 4px 10px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 12px; }
.a-tab.active { background: #1a472a; color: white; border-color: #1a472a; }
.a-tab.new { background: #2980b9; color: white; border-color: #2980b9; }
.form-scroll { flex: 1; overflow-y: auto; padding: 12px 14px; }
.field-row { display: flex; gap: 8px; margin-bottom: 8px; }
.field { display: flex; flex-direction: column; gap: 3px; flex: 1; }
.field label { font-size: 11px; color: #888; }
.field select, .field input { border: 1px solid #ddd; border-radius: 4px; padding: 5px 8px; font-size: 13px; font-family: Arial, sans-serif; width: 100%; }
.arabic { font-family: 'Traditional Arabic', Arial, sans-serif !important; font-size: 16px !important; direction: rtl; }
.section-label { font-size: 11px; font-weight: bold; color: #555; text-transform: uppercase; margin: 8px 0 4px; }
.sub-row { display: flex; gap: 6px; align-items: center; margin-bottom: 5px; background: #f9f9f9; padding: 5px 8px; border-radius: 4px; border: 1px solid #eee; }
.sub-row input { flex: 1; }
.btn-remove { background: #e74c3c; color: white; border: none; border-radius: 3px; padding: 3px 7px; cursor: pointer; font-size: 11px; }
.btn-add { background: #2980b9; color: white; border: none; border-radius: 4px; padding: 4px 10px; cursor: pointer; font-size: 12px; }
.save-bar { padding: 10px 14px; border-top: 1px solid #eee; display: flex; gap: 8px; flex-shrink: 0; }
.btn-save { background: #1a472a; color: white; border: none; border-radius: 4px; padding: 8px 18px; cursor: pointer; font-size: 14px; font-weight: bold; }
.btn-new { background: #2980b9; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
.btn-del { background: #e74c3c; color: white; border: none; border-radius: 4px; padding: 8px 12px; cursor: pointer; font-size: 13px; }
.status { padding: 8px 14px; font-size: 12px; flex-shrink: 0; }
.status.success { background: #d4edda; color: #155724; }
.status.error { background: #f8d7da; color: #721c24; }
.status.info { background: #d1ecf1; color: #0c5460; }
</style>
