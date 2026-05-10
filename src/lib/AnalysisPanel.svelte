<script>
  import { get, post, patch, del } from '$lib/supabase.js';

  let { tokenId } = $props();

  // ── Data state ──────────────────────────────────────────────────────────────
  let morphemes        = $state([]);
  let selectedMorpheme = $state(null);
  let analyses         = $state([]);
  let selIdx           = $state(0);
  let posData          = $state([]);
  let rootCache        = {};

  // ── UI state ─────────────────────────────────────────────────────────────────
  let mode       = $state('view');   // 'view' | 'edit'
  let loading    = $state(false);
  let statusMsg  = $state('');
  let statusType = $state('');
  let rootStatus = $state('');

  // ── Form fields ──────────────────────────────────────────────────────────────
  let fMtype  = $state('');
  let fPos    = $state('');
  let fCert   = $state(1);
  let fRoot   = $state('');
  let fRootType = $state('');
  let fPerson = $state('');
  let fGender = $state('');
  let fNumber = $state('');
  let fCase   = $state('');
  let fDef    = $state('');
  let fVform  = $state('');
  let fF1type = $state('');
  let fAspect = $state('');
  let fMood   = $state('');
  let fVoice  = $state('');
  let fNtype  = $state('');
  let fNotes  = $state('');
  let fSp     = $state('');
  let lemmaRows   = $state([]);
  let patternRows = $state([]);

  // ── Derived visibility ───────────────────────────────────────────────────────
  let posGroups  = $derived(posData.reduce((acc, p) => {
    if (!acc[p.pos_group]) acc[p.pos_group] = [];
    acc[p.pos_group].push(p);
    return acc;
  }, {}));
  let currentPOS  = $derived(posData.find(p => p.code === fPos));
  let posGroup    = $derived(currentPOS?.pos_group || '');
  let showVerbal  = $derived(posGroup === 'Verbal');
  let showNominal = $derived(posGroup === 'Nominal');
  let showVN      = $derived(showVerbal || showNominal);

  // ── Effects ──────────────────────────────────────────────────────────────────
  $effect(() => { loadPos(); });
  $effect(() => { if (tokenId) loadMorphemes(); });

  // ── Data loading ─────────────────────────────────────────────────────────────
  async function loadPos() {
    posData = await get('pos', { select: 'code,arabic,meaning,pos_group', order: 'pos_group,code' });
  }

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
    selIdx = 0;
    if (analyses.length > 0) {
      await fillForm(analyses[0]);
      mode = 'view';
    } else {
      clearForm();
      mode = 'edit';  // no analysis yet — go straight to edit
    }
  }

  async function fillForm(a) {
    fMtype  = a.morpheme_type     || '';
    fPos    = a.pos_code          || '';
    fCert   = a.certainty         || 1;
    fPerson = a.person            || '';
    fGender = a.gender            || '';
    fNumber = a.number            || '';
    fCase   = a.grammatical_case  || '';
    fDef    = a.definiteness      || '';
    fSp     = a.sp                || '';
    fVform  = a.v_form            || '';
    fF1type = a.f1_type           || '';
    fAspect = a.v_aspect          || '';
    fMood   = a.v_mood            || '';
    fVoice  = a.v_voice           || '';
    fNtype  = a.n_type            || '';
    fNotes  = a.notes             || '';
    fRootType = '';

    if (a.root_id) {
      const rows = await get('root', { select: 'root_text,root_type', id: `eq.${a.root_id}` });
      fRoot     = rows[0]?.root_text  || '';
      fRootType = rows[0]?.root_type  || '';
      if (fRoot) rootCache[fRoot] = a.root_id;
      rootStatus = `✓ ID: ${a.root_id}`;
    } else {
      fRoot = ''; fRootType = ''; rootStatus = '';
    }

    const als = await get('analysis_lemma', {
      select: 'rank,certainty,lemma(arabic_text)',
      analysis_id: `eq.${a.id}`, order: 'rank.asc'
    });
    lemmaRows = (als || []).map(al => ({ text: al.lemma?.arabic_text || '', certainty: al.certainty }));

    const aps = await get('analysis_pattern', {
      select: 'rank,certainty,pattern(arabic_text)',
      analysis_id: `eq.${a.id}`, order: 'rank.asc'
    });
    patternRows = (aps || []).map(ap => ({ text: ap.pattern?.arabic_text || '', certainty: ap.certainty }));
  }

  function clearForm() {
    fMtype=''; fPos=''; fCert=1; fRoot=''; fRootType=''; rootStatus='';
    fPerson=''; fGender=''; fNumber=''; fCase=''; fDef='';
    fSp=''; fVform=''; fF1type=''; fAspect=''; fMood=''; fVoice='';
    fNtype=''; fNotes=''; lemmaRows=[]; patternRows=[];
  }

  // ── Mode actions ─────────────────────────────────────────────────────────────
  function startEdit() { mode = 'edit'; }

  async function cancelEdit() {
    if (analyses.length > 0) {
      await fillForm(analyses[selIdx < analyses.length ? selIdx : 0]);
      mode = 'view';
    } else {
      clearForm();
      // stay in edit — nothing to go back to
    }
  }

  function startNew() {
    clearForm();
    selIdx = analyses.length;   // past last = new slot
    mode = 'edit';
  }

  async function switchAnalysis(idx) {
    selIdx = idx;
    await fillForm(analyses[idx]);
    mode = 'view';
  }

  // ── Root lookup ───────────────────────────────────────────────────────────────
  async function onRootInput() {
    const text = fRoot.trim();
    if (!text) { rootStatus = ''; fRootType = ''; return; }
    if (rootCache[text]) { rootStatus = `✓ ID: ${rootCache[text]}`; return; }
    const data = await get('root', { select: 'id,root_type', root_text: `eq.${text}` });
    if (data?.length > 0) {
      rootCache[text] = data[0].id;
      fRootType = data[0].root_type || '';
      rootStatus = `✓ ID: ${data[0].id}`;
    } else {
      fRootType = '';
      rootStatus = '⚠ New root';
    }
  }

  // ── Save / Delete ─────────────────────────────────────────────────────────────
  const SB_URL = "https://xcbjhkpotvphupvcvmxd.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYmpoa3BvdHZwaHVwdmN2bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzNDQsImV4cCI6MjA5MzU0MDM0NH0.zNwsSBbD-2SkhqIRceBdiUFRcKzLftMLA1XclZ1Vnak";

  async function saveAnalysis() {
    showStatus('Saving…', 'info');
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
    const payload = {
      morpheme_id: selectedMorpheme.id,
      morpheme_type: fMtype || null, pos_code: fPos || null, root_id: rootId,
      person: parseInt(fPerson) || null, gender: fGender || null, number: fNumber || null,
      grammatical_case: fCase || null, definiteness: fDef || null, sp: fSp || null,
      v_form: parseInt(fVform) || null, v_aspect: fAspect || null, v_mood: fMood || null,
      v_voice: fVoice || null, f1_type: fF1type || null, n_type: fNtype || null,
      certainty: parseInt(fCert) || 1, is_primary: selIdx === 0, notes: fNotes || null
    };
    let analysisId;
    const isNew = selIdx >= analyses.length;
    if (isNew) {
      const res = await post('analysis', payload);
      if (res.error) { showStatus('Error: ' + res.error.message, 'error'); return; }
      analysisId = res[0].id;
    } else {
      analysisId = analyses[selIdx].id;
      const res = await patch('analysis', analysisId, payload);
      if (res.error) { showStatus('Error: ' + res.error.message, 'error'); return; }
    }
    await saveLemmas(analysisId);
    await savePatterns(analysisId);
    showStatus('Saved ✓', 'success');
    await loadAnalyses(selectedMorpheme.id);
    setTimeout(() => statusMsg = '', 3000);
  }

  async function saveLemmas(analysisId) {
    await fetch(`${SB_URL}/rest/v1/analysis_lemma?analysis_id=eq.${analysisId}`,
      { method: 'DELETE', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    for (let i = 0; i < lemmaRows.length; i++) {
      const text = lemmaRows[i].text.trim(); if (!text) continue;
      let lemmaId;
      const ex = await get('lemma', { select: 'id', arabic_text: `eq.${text}` });
      if (ex?.length > 0) { lemmaId = ex[0].id; }
      else { const cr = await post('lemma', { arabic_text: text }); lemmaId = cr[0]?.id; }
      if (lemmaId) await post('analysis_lemma', { analysis_id: analysisId, lemma_id: lemmaId, rank: i + 1, certainty: parseInt(lemmaRows[i].certainty) });
    }
  }

  async function savePatterns(analysisId) {
    await fetch(`${SB_URL}/rest/v1/analysis_pattern?analysis_id=eq.${analysisId}`,
      { method: 'DELETE', headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    for (let i = 0; i < patternRows.length; i++) {
      const text = patternRows[i].text.trim(); if (!text) continue;
      let patternId;
      const ex = await get('pattern', { select: 'id', arabic_text: `eq.${text}` });
      if (ex?.length > 0) { patternId = ex[0].id; }
      else { const cr = await post('pattern', { arabic_text: text }); patternId = cr[0]?.id; }
      if (patternId) await post('analysis_pattern', { analysis_id: analysisId, pattern_id: patternId, rank: i + 1, certainty: parseInt(patternRows[i].certainty) });
    }
  }

  async function deleteAnalysis() {
    if (!analyses[selIdx]) return;
    if (!confirm('Delete this analysis?')) return;
    await del('analysis', analyses[selIdx].id);
    showStatus('Deleted.', 'info');
    await loadAnalyses(selectedMorpheme.id);
  }

  function showStatus(msg, type) { statusMsg = msg; statusType = type; }
  function removeLemma(i)   { lemmaRows   = lemmaRows.filter((_, j) => j !== i); }
  function removePattern(i) { patternRows = patternRows.filter((_, j) => j !== i); }

  // ── View-mode helpers ─────────────────────────────────────────────────────────
  function d(val) { return val || '—'; }                        // dash if empty
  function personLabel(p) { return p == 1 ? '1st' : p == 2 ? '2nd' : p == 3 ? '3rd' : '—'; }
  function certLabel(c)   { return c == 1 ? 'Confirmed' : c == 2 ? 'Probable' : c == 3 ? 'Uncertain' : '—'; }
  function vformLabel(v)  { return v ? `Form ${v}` : '—'; }
</script>

<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<div class="panel">

  {#if !tokenId}
    <div class="empty">
      <span class="empty-ar">انقر على كلمة</span>
      <span class="empty-en">Click a word to analyze</span>
    </div>

  {:else if loading}
    <div class="empty"><span class="empty-en">جاري التحميل…</span></div>

  {:else}

    <!-- ── Morpheme tabs ───────────────────────────────────────────────────── -->
    <div class="morpheme-tabs">
      {#each morphemes as m}
        <button
          class="m-tab"
          class:active={selectedMorpheme?.id === m.id}
          onclick={() => selectMorpheme(m)}
        >{m.morpheme_u}</button>
      {/each}
    </div>

    {#if selectedMorpheme}

      <!-- ── Morpheme info ─────────────────────────────────────────────────── -->
      <div class="m-info">
        <span class="m-arabic">{selectedMorpheme.morpheme_u}</span>
        <span class="m-sep">|</span>
        <span class="m-meta">{selectedMorpheme.morpheme_s || '—'}</span>
        <span class="m-sep">|</span>
        <span class="m-meta">Morpheme #{selectedMorpheme.morpheme_pos} &nbsp; ID: {selectedMorpheme.id}</span>
      </div>

      <!-- ── Analysis tabs + action buttons ──────────────────────────────── -->
      <div class="a-row">
        <div class="a-tabs">
          {#each analyses as a, i}
            <button
              class="a-tab"
              class:active={i === selIdx && mode === 'view'}
              onclick={() => switchAnalysis(i)}
            >{i + 1}{a.is_primary ? ' ★' : ''} ({a.pos_code || '?'})</button>
          {/each}
        </div>
        <div class="a-actions">
          {#if mode === 'view'}
            <button class="btn-edit"   onclick={startEdit}>Edit</button>
            <button class="btn-new"    onclick={startNew}>+ New</button>
            <button class="btn-del"    onclick={deleteAnalysis}>Delete</button>
          {:else}
            <button class="btn-save"   onclick={saveAnalysis}>Save</button>
            <button class="btn-cancel" onclick={cancelEdit}>Cancel</button>
          {/if}
        </div>
      </div>

      <!-- ── Content (view / edit) ─────────────────────────────────────────── -->
      <div class="body-scroll">

        <!-- ════════════════ VIEW MODE ════════════════ -->
        {#if mode === 'view' && (analyses.length > 0)}

          <!-- Morphological Type -->
          <div class="vsection">
            <div class="vsec-title">Morphological Type</div>
            <div class="vrow">
              <span class="vval mtype-chip">{d(fMtype)}</span>
              <span class="vlbl-right">Certainty: {certLabel(fCert)}</span>
            </div>
          </div>

          <!-- Root (Verbal / Nominal only) -->
          {#if showVN}
            <div class="vsection">
              <div class="vsec-title">Root جذر</div>
              <div class="vrow">
                <!-- linkable in future: data-type="root" -->
                <span class="vval ar linkable" data-type="root">{d(fRoot)}</span>
                {#if fRootType}<span class="vchip">{fRootType}</span>{/if}
              </div>
            </div>
          {/if}

          <!-- Lemma (always) -->
          <div class="vsection">
            <div class="vsec-title">Lemma</div>
            {#if lemmaRows.length === 0}
              <span class="vval">—</span>
            {:else}
              {#each lemmaRows as row, i}
                <div class="vrow lemma-row">
                  <span class="rank-num">{i + 1}.</span>
                  <!-- linkable in future: data-type="lemma" -->
                  <span class="vval ar linkable" data-type="lemma">{row.text || '—'}</span>
                  <span class="cert-badge cert-{row.certainty}">{certLabel(row.certainty)}</span>
                </div>
              {/each}
            {/if}
          </div>

          <!-- Pattern (Verbal / Nominal only) -->
          {#if showVN}
            <div class="vsection">
              <div class="vsec-title">Pattern وزن</div>
              {#if patternRows.length === 0}
                <span class="vval">—</span>
              {:else}
                {#each patternRows as row, i}
                  <div class="vrow lemma-row">
                    <span class="rank-num">{i + 1}.</span>
                    <!-- linkable in future: data-type="pattern" -->
                    <span class="vval ar linkable" data-type="pattern">{row.text || '—'}</span>
                    <span class="cert-badge cert-{row.certainty}">{certLabel(row.certainty)}</span>
                  </div>
                {/each}
              {/if}
            </div>
          {/if}

          <!-- Part of Speech -->
          <div class="vsection">
            <div class="vsec-title">Part of Speech</div>
            <div class="vrow">
              <span class="vval mono">{d(fPos)}</span>
              {#if currentPOS}
                <span class="vchip">{currentPOS.pos_group}</span>
                <span class="vval ar" style="margin-right:6px;">{currentPOS.arabic}</span>
              {/if}
            </div>
            {#if currentPOS?.meaning}
              <div class="vrow" style="margin-top:2px;">
                <span class="vval meaning">{currentPOS.meaning}</span>
              </div>
            {/if}
          </div>

          <!-- POS Features -->
          {#if showVN || fSp || fNotes}
            <div class="vsection">
              <div class="vsec-title">Features</div>

              {#if showVN}
                <div class="feat-grid">
                  <div class="feat-item"><span class="feat-lbl">Person</span><span class="feat-val">{personLabel(fPerson)}</span></div>
                  <div class="feat-item"><span class="feat-lbl">Gender</span><span class="feat-val">{d(fGender)}</span></div>
                  <div class="feat-item"><span class="feat-lbl">Number</span><span class="feat-val">{d(fNumber)}</span></div>
                </div>
                <div class="feat-grid">
                  <div class="feat-item"><span class="feat-lbl">Verb Form</span><span class="feat-val">{vformLabel(fVform)}</span></div>
                  {#if showVerbal && fVform == 1}
                    <div class="feat-item"><span class="feat-lbl">F1 Type</span><span class="feat-val mono">{d(fF1type)}</span></div>
                  {/if}
                  {#if showNominal}
                    <div class="feat-item"><span class="feat-lbl">Noun Type</span><span class="feat-val">{d(fNtype)}</span></div>
                  {/if}
                </div>
              {/if}

              {#if showVerbal}
                <div class="feat-grid">
                  <div class="feat-item"><span class="feat-lbl">Aspect</span><span class="feat-val">{d(fAspect)}</span></div>
                  <div class="feat-item"><span class="feat-lbl">Mood</span><span class="feat-val">{d(fMood)}</span></div>
                  <div class="feat-item"><span class="feat-lbl">Voice</span><span class="feat-val">{d(fVoice)}</span></div>
                </div>
              {/if}

              {#if showNominal}
                <div class="feat-grid">
                  <div class="feat-item"><span class="feat-lbl">Case</span><span class="feat-val">{d(fCase)}</span></div>
                  <div class="feat-item"><span class="feat-lbl">Definiteness</span><span class="feat-val">{d(fDef)}</span></div>
                </div>
              {/if}

              {#if fSp}
                <div class="feat-grid">
                  <div class="feat-item"><span class="feat-lbl">SP</span><span class="feat-val ar">{fSp}</span></div>
                </div>
              {/if}

              {#if fNotes}
                <div class="notes-view">{fNotes}</div>
              {/if}
            </div>
          {/if}

        <!-- ════════════════ EDIT MODE ════════════════ -->
        {:else}

          <!-- Morphological Type + Certainty -->
          <div class="esection">
            <div class="field-row">
              <div class="field">
                <label>Morphological Type</label>
                <select bind:value={fMtype}>
                  <option value="">--</option>
                  <option>Prefix</option><option>Stem</option><option>Suffix</option>
                </select>
              </div>
              <div class="field">
                <label>Certainty</label>
                <select bind:value={fCert}>
                  <option value={1}>1 — Confirmed</option>
                  <option value={2}>2 — Probable</option>
                  <option value={3}>3 — Uncertain</option>
                </select>
              </div>
            </div>
          </div>

          <!-- POS -->
          <div class="esection">
            <div class="field">
              <label>Part of Speech (POS)</label>
              <select bind:value={fPos}>
                <option value="">-- Select POS --</option>
                {#each Object.entries(posGroups) as [group, items]}
                  <optgroup label={group}>
                    {#each items as p}
                      <option value={p.code}>{p.code} — {p.arabic} ({p.meaning})</option>
                    {/each}
                  </optgroup>
                {/each}
              </select>
            </div>
          </div>

          <!-- Root (Verbal / Nominal only) -->
          {#if showVN}
            <div class="esection">
              <div class="esec-title">Root جذر</div>
              <div class="field-row">
                <div class="field">
                  <label>Root letters</label>
                  <input class="arabic" bind:value={fRoot} oninput={onRootInput} placeholder="e.g. كتب" dir="rtl">
                </div>
                <div class="field" style="justify-content:flex-end;padding-bottom:4px;">
                  <small class="root-status">{rootStatus}</small>
                </div>
              </div>
            </div>
          {/if}

          <!-- Lemma (always) -->
          <div class="esection">
            <div class="esec-title">Lemma</div>
            {#each lemmaRows as row, i}
              <div class="sub-row">
                <span class="rank-num">{i + 1}.</span>
                <input class="arabic sub-input" bind:value={row.text} placeholder="لَمَّا" dir="rtl">
                <select bind:value={row.certainty} class="cert-sel">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
                <button class="btn-remove" onclick={() => removeLemma(i)}>✕</button>
              </div>
            {/each}
            <button class="btn-add" onclick={() => lemmaRows = [...lemmaRows, { text: '', certainty: 1 }]}>+ Add Lemma</button>
          </div>

          <!-- Pattern (Verbal / Nominal only) -->
          {#if showVN}
            <div class="esection">
              <div class="esec-title">Pattern وزن</div>
              {#each patternRows as row, i}
                <div class="sub-row">
                  <span class="rank-num">{i + 1}.</span>
                  <input class="arabic sub-input" bind:value={row.text} placeholder="فَعَلَ" dir="rtl">
                  <select bind:value={row.certainty} class="cert-sel">
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                  </select>
                  <button class="btn-remove" onclick={() => removePattern(i)}>✕</button>
                </div>
              {/each}
              <button class="btn-add" onclick={() => patternRows = [...patternRows, { text: '', certainty: 1 }]}>+ Add Pattern</button>
            </div>
          {/if}

          <!-- POS Features -->
          <div class="esection">
            <div class="esec-title">Features</div>

            <!-- Person / Gender / Number — Verbal & Nominal -->
            {#if showVN}
              <div class="field-row">
                <div class="field"><label>Person</label>
                  <select bind:value={fPerson}>
                    <option value="">--</option>
                    <option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option>
                  </select>
                </div>
                <div class="field"><label>Gender</label>
                  <select bind:value={fGender}>
                    <option value="">--</option><option value="M">M</option><option value="F">F</option>
                  </select>
                </div>
                <div class="field"><label>Number</label>
                  <select bind:value={fNumber}>
                    <option value="">--</option>
                    <option value="S">S</option><option value="D">D</option><option value="P">P</option>
                  </select>
                </div>
              </div>

              <!-- Verb Form — Verbal & Nominal -->
              <div class="field-row">
                <div class="field"><label>Verb Form</label>
                  <select bind:value={fVform}>
                    <option value="">--</option>
                    {#each [1,2,3,4,5,6,7,8,9,10,11,12] as n}
                      <option value={n}>Form {n}</option>
                    {/each}
                  </select>
                </div>
                <!-- F1 Type — Verbal + Form 1 only -->
                {#if showVerbal && fVform == 1}
                  <div class="field"><label>F1 Type</label>
                    <select bind:value={fF1type}>
                      <option value="">--</option>
                      {#each ['aa','ai','au','ia','ii','iu','ua','ui','uu','??'] as t}
                        <option value={t}>{t}</option>
                      {/each}
                    </select>
                  </div>
                {/if}
                <!-- Noun Type — Nominal only -->
                {#if showNominal}
                  <div class="field"><label>Noun Type</label>
                    <select bind:value={fNtype}>
                      <option value="">--</option>
                      <option value="VN">VN</option><option value="AP">AP</option><option value="PP">PP</option>
                    </select>
                  </div>
                {/if}
              </div>
            {/if}

            <!-- Aspect / Mood / Voice — Verbal only -->
            {#if showVerbal}
              <div class="field-row">
                <div class="field"><label>Aspect</label>
                  <select bind:value={fAspect}>
                    <option value="">--</option>
                    <option value="PERF">PERF</option><option value="IMPF">IMPF</option>
                  </select>
                </div>
                <div class="field"><label>Mood</label>
                  <select bind:value={fMood}>
                    <option value="">--</option>
                    <option value="IND">IND</option><option value="SUBJ">SUBJ</option>
                    <option value="JUS">JUS</option><option value="IMPV">IMPV</option><option value="ENRG">ENRG</option>
                  </select>
                </div>
                <div class="field"><label>Voice</label>
                  <select bind:value={fVoice}>
                    <option value="">--</option>
                    <option value="ACT">ACT</option><option value="PASS">PASS</option>
                  </select>
                </div>
              </div>
            {/if}

            <!-- Case / Definiteness — Nominal only -->
            {#if showNominal}
              <div class="field-row">
                <div class="field"><label>Case</label>
                  <select bind:value={fCase}>
                    <option value="">--</option>
                    <option value="NOM">NOM</option><option value="ACC">ACC</option><option value="GEN">GEN</option>
                  </select>
                </div>
                <div class="field"><label>Definiteness</label>
                  <select bind:value={fDef}>
                    <option value="">--</option>
                    <option value="DEF">DEF</option><option value="INDEF">INDEF</option>
                  </select>
                </div>
              </div>
            {/if}

            <!-- SP — always -->
            <div class="field-row">
              <div class="field"><label>SP</label>
                <select bind:value={fSp}>
                  <option value="">--</option>
                  <option value="كَان">كَان</option>
                  <option value="إِنّ">إِنّ</option>
                  <option value="لَيْسَ">لَيْسَ</option>
                </select>
              </div>
            </div>

            <!-- Notes — always -->
            <div class="field" style="margin-top:4px;">
              <label>Notes</label>
              <textarea bind:value={fNotes} rows="2" class="notes-input" dir="rtl"></textarea>
            </div>
          </div>

        {/if}
      </div><!-- /body-scroll -->

      <!-- Status bar -->
      {#if statusMsg}
        <div class="status-bar {statusType}">{statusMsg}</div>
      {/if}

    {/if}
  {/if}
</div>

<!-- ═══════════════════════════════════════════════════════════════════════════ -->
<style>
/* Panel shell */
.panel{display:flex;flex-direction:column;height:100%;background:white;border-left:1px solid #ddd;overflow:hidden;}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#bbb;}
.empty-ar{font-size:18px;font-family:'Traditional Arabic',Arial,sans-serif;}
.empty-en{font-size:13px;}

/* Morpheme tabs */
.morpheme-tabs{display:flex;border-bottom:2px solid #eee;overflow-x:auto;flex-shrink:0;direction:rtl;}
.m-tab{padding:10px 18px;border:none;background:none;cursor:pointer;font-size:21px;font-family:'Traditional Arabic',Arial,sans-serif;border-bottom:3px solid transparent;color:#555;white-space:nowrap;transition:background 0.1s;}
.m-tab:hover{background:#f5f5f5;}.m-tab.active{border-bottom-color:#1a472a;color:#1a472a;font-weight:bold;}

/* Morpheme info */
.m-info{display:flex;align-items:center;gap:8px;padding:8px 14px;background:#f8f8f8;border-bottom:1px solid #eee;flex-shrink:0;flex-wrap:wrap;direction:rtl;}
.m-arabic{font-size:24px;font-family:'Traditional Arabic',Arial,sans-serif;color:#1a472a;}
.m-sep{color:#ddd;font-size:14px;}
.m-meta{font-size:12px;color:#888;}

/* Analysis row */
.a-row{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #eee;flex-shrink:0;gap:6px;flex-wrap:wrap;}
.a-tabs{display:flex;gap:4px;flex-wrap:wrap;}
.a-tab{padding:4px 10px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:12px;transition:background 0.1s;}
.a-tab:hover{background:#f5f5f5;}.a-tab.active{background:#1a472a;color:white;border-color:#1a472a;}
.a-actions{display:flex;gap:6px;flex-shrink:0;}
.btn-edit  {background:#1a472a;color:white;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:12px;}
.btn-new   {background:#2980b9;color:white;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:12px;}
.btn-del   {background:#e74c3c;color:white;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:12px;}
.btn-save  {background:#1a472a;color:white;border:none;border-radius:4px;padding:5px 14px;cursor:pointer;font-size:12px;font-weight:bold;}
.btn-cancel{background:#888;color:white;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:12px;}

/* Scrollable body */
.body-scroll{flex:1;overflow-y:auto;direction:ltr;}

/* ── VIEW MODE ─────────────────────────────────────────────── */
.vsection{padding:10px 14px;border-bottom:1px solid #f0f0f0;}
.vsec-title{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;}
.vrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
.vval{font-size:14px;color:#222;}
.vval.ar{font-size:20px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;}
.vval.mono{font-family:monospace;font-size:13px;background:#f5f5f5;padding:2px 6px;border-radius:3px;}
.vval.meaning{font-size:13px;color:#666;font-style:italic;}
.vval-right{font-size:11px;color:#aaa;margin-right:auto;}
.vchip{font-size:11px;padding:2px 8px;border-radius:10px;background:#e8f5e9;color:#2e7d32;white-space:nowrap;}
.vlbl-right{font-size:11px;color:#aaa;margin-right:auto;}
.mtype-chip{font-weight:600;color:#1a472a;}
.linkable{cursor:default;}  /* future: cursor:pointer + hover underline */
.lemma-row{gap:8px;}
.rank-num{font-size:12px;color:#bbb;min-width:16px;}
.cert-badge{font-size:10px;padding:2px 7px;border-radius:10px;white-space:nowrap;}
.cert-badge.cert-1{background:#e8f5e9;color:#2e7d32;}
.cert-badge.cert-2{background:#fff8e1;color:#f57f17;}
.cert-badge.cert-3{background:#fce4ec;color:#c62828;}
.feat-grid{display:flex;gap:0;margin-bottom:4px;flex-wrap:wrap;}
.feat-item{flex:1;min-width:80px;padding:5px 8px;border-right:1px solid #f0f0f0;}
.feat-item:last-child{border-right:none;}
.feat-lbl{display:block;font-size:10px;color:#aaa;text-transform:uppercase;margin-bottom:2px;}
.feat-val{font-size:13px;color:#333;}
.feat-val.ar{font-size:17px;font-family:'Traditional Arabic',Arial,sans-serif;}
.notes-view{margin-top:8px;padding:8px 10px;background:#fafafa;border-radius:4px;font-size:13px;color:#555;direction:rtl;line-height:1.6;border:1px solid #eee;}

/* ── EDIT MODE ─────────────────────────────────────────────── */
.esection{padding:10px 14px;border-bottom:1px solid #f0f0f0;}
.esec-title{font-size:10px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;}
.field-row{display:flex;gap:8px;margin-bottom:8px;}
.field{display:flex;flex-direction:column;gap:3px;flex:1;}
.field label{font-size:11px;color:#888;}
.field select,.field input,.field textarea{border:1px solid #ddd;border-radius:4px;padding:5px 8px;font-size:13px;width:100%;background:white;}
.field select:focus,.field input:focus,.field textarea:focus{outline:none;border-color:#1a472a;}
.arabic{font-family:'Traditional Arabic',Arial,sans-serif !important;font-size:17px !important;}
.sub-row{display:flex;gap:6px;align-items:center;margin-bottom:5px;padding:5px 8px;background:#f9f9f9;border:1px solid #eee;border-radius:4px;}
.sub-input{flex:1;border:1px solid #ddd;border-radius:4px;padding:4px 8px;font-size:17px;font-family:'Traditional Arabic',Arial,sans-serif;}
.cert-sel{width:46px;border:1px solid #ddd;border-radius:4px;padding:4px;}
.btn-remove{background:#e74c3c;color:white;border:none;border-radius:3px;padding:3px 7px;cursor:pointer;font-size:11px;flex-shrink:0;}
.btn-add{background:#2980b9;color:white;border:none;border-radius:4px;padding:5px 12px;cursor:pointer;font-size:12px;margin-top:2px;}
.root-status{font-size:12px;color:#888;align-self:flex-end;padding-bottom:2px;}
.notes-input{resize:vertical;direction:rtl;font-size:13px !important;}

/* Status bar */
.status-bar{padding:8px 14px;font-size:12px;flex-shrink:0;}
.status-bar.success{background:#d4edda;color:#155724;}
.status-bar.error  {background:#f8d7da;color:#721c24;}
.status-bar.info   {background:#d1ecf1;color:#0c5460;}
</style>
