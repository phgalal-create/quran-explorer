<script>
  import { get, post, patch, del } from '$lib/supabase.js';

  let { tokenId } = $props();

  // ── Data ─────────────────────────────────────────────────────────────────────
  let morphemes        = $state([]);
  let selectedMorpheme = $state(null);
  let analyses         = $state([]);
  let selIdx           = $state(0);
  let posData          = $state([]);
  let rootCache        = {};

  // ── UI ───────────────────────────────────────────────────────────────────────
  let mode       = $state('view');
  let loading    = $state(false);
  let statusMsg  = $state('');
  let statusType = $state('');
  let rootStatus = $state('');

  // ── Form fields ───────────────────────────────────────────────────────────────
  let fMtype     = $state('');
  let fPos       = $state('');
  let fCert      = $state(1);
  let fIsPrimary = $state(true);
  let fRoot      = $state('');
  let fRootType  = $state('');
  let fPerson    = $state('');
  let fGender    = $state('');
  let fNumber    = $state('');
  let fCase      = $state('');
  let fDef       = $state('');
  let fVform     = $state('');
  let fF1type    = $state('');
  let fAspect    = $state('');
  let fMood      = $state('');
  let fVoice     = $state('');
  let fNtype     = $state('');
  let fNotes     = $state('');
  let fSp        = $state('');

  // lemmaRows: { alId, text, lemmaType, certainty, rank }
  // patternRows: { apId, text, patternType, certainty, rank }
  let lemmaRows   = $state([]);
  let patternRows = $state([]);

  // ── Inline add state (view mode) ──────────────────────────────────────────────
  let addingLemma   = $state(false);
  let newLemmaText  = $state('');
  let newLemmaCert  = $state(1);
  let addingPattern = $state(false);
  let newPatText    = $state('');
  let newPatCert    = $state(1);

  // ── Derived ───────────────────────────────────────────────────────────────────
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

  // ── Effects ───────────────────────────────────────────────────────────────────
  $effect(() => { loadPos(); });
  $effect(() => { if (tokenId) loadMorphemes(); });

  // ── Loaders ───────────────────────────────────────────────────────────────────
  async function loadPos() {
    posData = await get('pos', { select: 'code,arabic,meaning,pos_group', order: 'pos_group,code' });
  }

  async function loadMorphemes() {
    if (!tokenId) return;
    morphemes = await get('morpheme', {
      select: 'id,morpheme_pos,morpheme_u,morpheme_s',
      token_id: `eq.${tokenId}`, order: 'morpheme_pos.asc'
    });
    if (morphemes.length > 0) await selectMorpheme(morphemes[0]);
  }

  async function selectMorpheme(m) {
    selectedMorpheme = m; loading = true;
    await loadAnalyses(m.id);
    loading = false;
  }

  async function loadAnalyses(mId) {
    analyses = await get('analysis', {
      select: '*', morpheme_id: `eq.${mId}`, order: 'is_primary.desc,id.asc'
    }) || [];
    selIdx = 0;
    if (analyses.length > 0) { await fillForm(analyses[0]); mode = 'view'; }
    else { clearForm(); mode = 'edit'; }
  }

  async function fillForm(a) {
    fMtype     = a.morpheme_type    || '';
    fPos       = a.pos_code         || '';
    fCert      = a.certainty        || 1;
    fIsPrimary = a.is_primary       ?? true;
    fPerson    = a.person           || '';
    fGender    = a.gender           || '';
    fNumber    = a.number           || '';
    fCase      = a.grammatical_case || '';
    fDef       = a.definiteness     || '';
    fSp        = a.sp               || '';
    fVform     = a.v_form           || '';
    fF1type    = a.f1_type          || '';
    fAspect    = a.v_aspect         || '';
    fMood      = a.v_mood           || '';
    fVoice     = a.v_voice          || '';
    fNtype     = a.n_type           || '';
    fNotes     = a.notes            || '';
    fRootType  = '';

    if (a.root_id) {
      const rows = await get('root', { select: 'root_text,root_type', id: `eq.${a.root_id}` });
      fRoot     = rows[0]?.root_text || '';
      fRootType = rows[0]?.root_type || '';
      if (fRoot) rootCache[fRoot] = a.root_id;
      rootStatus = `✓ ID: ${a.root_id}`;
    } else { fRoot = ''; fRootType = ''; rootStatus = ''; }

    await reloadLemmas(a.id);
    await reloadPatterns(a.id);
  }

  async function reloadLemmas(analysisId) {
    const als = await get('analysis_lemma', {
      select: 'id,rank,certainty,lemma(arabic_text,lemma_type(name))',
      analysis_id: `eq.${analysisId}`, order: 'rank.asc'
    });
    lemmaRows = (als || []).map(al => ({
      alId: al.id,
      text: al.lemma?.arabic_text || '',
      lemmaType: al.lemma?.lemma_type?.name || '',
      certainty: al.certainty,
      rank: al.rank
    }));
  }

  async function reloadPatterns(analysisId) {
    const aps = await get('analysis_pattern', {
      select: 'id,rank,certainty,pattern(arabic_text,pattern_type(name))',
      analysis_id: `eq.${analysisId}`, order: 'rank.asc'
    });
    patternRows = (aps || []).map(ap => ({
      apId: ap.id,
      text: ap.pattern?.arabic_text || '',
      patternType: ap.pattern?.pattern_type?.name || '',
      certainty: ap.certainty,
      rank: ap.rank
    }));
  }

  function clearForm() {
    fMtype=''; fPos=''; fCert=1; fIsPrimary=(analyses.length===0);
    fRoot=''; fRootType=''; rootStatus='';
    fPerson=''; fGender=''; fNumber=''; fCase=''; fDef='';
    fSp=''; fVform=''; fF1type=''; fAspect=''; fMood=''; fVoice='';
    fNtype=''; fNotes=''; lemmaRows=[]; patternRows=[];
    addingLemma=false; newLemmaText=''; newLemmaCert=1;
    addingPattern=false; newPatText=''; newPatCert=1;
  }

  // ── Mode transitions ──────────────────────────────────────────────────────────
  function startEdit() { mode = 'edit'; }

  async function cancelEdit() {
    if (analyses.length > 0) {
      await fillForm(analyses[selIdx < analyses.length ? selIdx : 0]);
      mode = 'view';
    }
  }

  function startNew() { clearForm(); selIdx = analyses.length; mode = 'edit'; }

  async function switchAnalysis(idx) {
    selIdx = idx; await fillForm(analyses[idx]); mode = 'view';
  }

  // ── Inline lemma actions (view mode) ──────────────────────────────────────────
  async function viewDeleteLemma(alId) {
    await del('analysis_lemma', alId);
    lemmaRows = lemmaRows.filter(r => r.alId !== alId);
  }

  async function viewAddLemma() {
    const text = newLemmaText.trim();
    if (!text || !analyses[selIdx]) return;
    const analysisId = analyses[selIdx].id;
    let lemmaId;
    const ex = await get('lemma', { select: 'id', arabic_text: `eq.${text}` });
    if (ex?.length > 0) { lemmaId = ex[0].id; }
    else { const cr = await post('lemma', { arabic_text: text }); lemmaId = cr[0]?.id; }
    if (lemmaId) await post('analysis_lemma', { analysis_id: analysisId, lemma_id: lemmaId, rank: lemmaRows.length + 1, certainty: parseInt(newLemmaCert) });
    await reloadLemmas(analysisId);
    addingLemma = false; newLemmaText = ''; newLemmaCert = 1;
  }

  // ── Inline pattern actions (view mode) ────────────────────────────────────────
  async function viewDeletePattern(apId) {
    await del('analysis_pattern', apId);
    patternRows = patternRows.filter(r => r.apId !== apId);
  }

  async function viewAddPattern() {
    const text = newPatText.trim();
    if (!text || !analyses[selIdx]) return;
    const analysisId = analyses[selIdx].id;
    let patternId;
    const ex = await get('pattern', { select: 'id', arabic_text: `eq.${text}` });
    if (ex?.length > 0) { patternId = ex[0].id; }
    else { const cr = await post('pattern', { arabic_text: text }); patternId = cr[0]?.id; }
    if (patternId) await post('analysis_pattern', { analysis_id: analysisId, pattern_id: patternId, rank: patternRows.length + 1, certainty: parseInt(newPatCert) });
    await reloadPatterns(analysisId);
    addingPattern = false; newPatText = ''; newPatCert = 1;
  }

  // ── Root lookup ───────────────────────────────────────────────────────────────
  async function onRootInput() {
    const text = fRoot.trim();
    if (!text) { rootStatus = ''; fRootType = ''; return; }
    if (rootCache[text]) { rootStatus = `✓ ID: ${rootCache[text]}`; return; }
    const data = await get('root', { select: 'id,root_type', root_text: `eq.${text}` });
    if (data?.length > 0) {
      rootCache[text] = data[0].id; fRootType = data[0].root_type || '';
      rootStatus = `✓ ID: ${data[0].id}`;
    } else { fRootType = ''; rootStatus = '⚠ New root'; }
  }

  // ── Save / Delete ─────────────────────────────────────────────────────────────
  const SB_URL = "https://xcbjhkpotvphupvcvmxd.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYmpoa3BvdHZwaHVwdmN2bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzNDQsImV4cCI6MjA5MzU0MDM0NH0.zNwsSBbD-2SkhqIRceBdiUFRcKzLftMLA1XclZ1Vnak";

  async function saveAnalysis() {
    showStatus('Saving…', 'info');
    let rootId = null;
    const rootText = fRoot.trim();
    if (rootText) {
      if (rootCache[rootText]) { rootId = rootCache[rootText]; }
      else {
        const ex = await get('root', { select: 'id', root_text: `eq.${rootText}` });
        if (ex?.length > 0) { rootId = ex[0].id; }
        else { const cr = await post('root', { root_text: rootText }); rootId = cr[0]?.id; }
        rootCache[rootText] = rootId;
      }
    }
    const payload = {
      morpheme_id: selectedMorpheme.id,
      morpheme_type: fMtype||null, pos_code: fPos||null, root_id: rootId,
      person: parseInt(fPerson)||null, gender: fGender||null, number: fNumber||null,
      grammatical_case: fCase||null, definiteness: fDef||null, sp: fSp||null,
      v_form: parseInt(fVform)||null, v_aspect: fAspect||null, v_mood: fMood||null,
      v_voice: fVoice||null, f1_type: fF1type||null, n_type: fNtype||null,
      certainty: parseInt(fCert)||1, is_primary: fIsPrimary, notes: fNotes||null
    };
    let analysisId;
    const isNew = selIdx >= analyses.length;
    if (isNew) {
      const res = await post('analysis', payload);
      if (res.error) { showStatus('Error: '+res.error.message,'error'); return; }
      analysisId = res[0].id;
    } else {
      analysisId = analyses[selIdx].id;
      const res = await patch('analysis', analysisId, payload);
      if (res.error) { showStatus('Error: '+res.error.message,'error'); return; }
    }
    await saveEditLemmas(analysisId);
    await saveEditPatterns(analysisId);
    showStatus('Saved ✓','success');
    await loadAnalyses(selectedMorpheme.id);
    setTimeout(() => statusMsg='', 3000);
  }

  // edit-mode lemma/pattern save (replaces all)
  async function saveEditLemmas(analysisId) {
    await fetch(`${SB_URL}/rest/v1/analysis_lemma?analysis_id=eq.${analysisId}`,
      { method:'DELETE', headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`} });
    for (let i=0; i<lemmaRows.length; i++) {
      const text=lemmaRows[i].text.trim(); if(!text) continue;
      let lemmaId;
      const ex=await get('lemma',{select:'id',arabic_text:`eq.${text}`});
      if(ex?.length>0){lemmaId=ex[0].id;}
      else{const cr=await post('lemma',{arabic_text:text});lemmaId=cr[0]?.id;}
      if(lemmaId) await post('analysis_lemma',{analysis_id:analysisId,lemma_id:lemmaId,rank:i+1,certainty:parseInt(lemmaRows[i].certainty)});
    }
  }

  async function saveEditPatterns(analysisId) {
    await fetch(`${SB_URL}/rest/v1/analysis_pattern?analysis_id=eq.${analysisId}`,
      { method:'DELETE', headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`} });
    for (let i=0; i<patternRows.length; i++) {
      const text=patternRows[i].text.trim(); if(!text) continue;
      let patternId;
      const ex=await get('pattern',{select:'id',arabic_text:`eq.${text}`});
      if(ex?.length>0){patternId=ex[0].id;}
      else{const cr=await post('pattern',{arabic_text:text});patternId=cr[0]?.id;}
      if(patternId) await post('analysis_pattern',{analysis_id:analysisId,pattern_id:patternId,rank:i+1,certainty:parseInt(patternRows[i].certainty)});
    }
  }

  async function deleteAnalysis() {
    if (!analyses[selIdx]) return;
    if (!confirm('Delete this analysis?')) return;
    await del('analysis', analyses[selIdx].id);
    showStatus('Deleted.','info');
    await loadAnalyses(selectedMorpheme.id);
  }

  function showStatus(msg,type) { statusMsg=msg; statusType=type; }
  function removeLemmaEdit(i)   { lemmaRows   = lemmaRows.filter((_,j)=>j!==i); }
  function removePatternEdit(i) { patternRows = patternRows.filter((_,j)=>j!==i); }

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const d          = v => v || '—';
  const personLbl  = p => ({1:'1st',2:'2nd',3:'3rd'}[p] || '—');
  const certLbl    = c => ({1:'Confirmed',2:'Probable',3:'Uncertain'}[c] || '—');
  const certClass  = c => ({1:'cert-confirmed',2:'cert-probable',3:'cert-uncertain'}[c] || '');
  const vformLbl   = v => v ? `Form ${v}` : '—';
</script>

<!-- ════════════════════════════════════════════════════════════════════════════ -->
<div class="panel">

  {#if !tokenId}
    <div class="splash">
      <div class="splash-ar">انقر على كلمة</div>
      <div class="splash-en">Click a word to analyse</div>
    </div>

  {:else if loading}
    <div class="splash"><div class="splash-en">Loading…</div></div>

  {:else}

    <!-- ── Morpheme tabs ─────────────────────────────────────────────────────── -->
    <div class="morpheme-tabs">
      {#each morphemes as m}
        <button class="m-tab" class:active={selectedMorpheme?.id===m.id}
          onclick={()=>selectMorpheme(m)}>{m.morpheme_u}</button>
      {/each}
    </div>

    {#if selectedMorpheme}

      <!-- ── Action bar ────────────────────────────────────────────────────────── -->
      <div class="action-bar">
        <div class="action-left">
          {#if mode==='view'}
            <button class="abtn danger" onclick={deleteAnalysis}>Delete</button>
            <button class="abtn edit"   onclick={startEdit}>Edit</button>
          {:else}
            <button class="abtn save"   onclick={saveAnalysis}>Save</button>
            <button class="abtn cancel" onclick={cancelEdit}>Cancel</button>
          {/if}
        </div>

        <div class="a-pills-wrap">
          {#if mode==='view'}
            <button class="new-pill-icon" onclick={startNew} title="New analysis">+</button>
          {/if}
          {#each analyses as a, i}
            <button class="a-pill"
              class:pill-c1={a.certainty===1}
              class:pill-c2={a.certainty===2}
              class:pill-c3={a.certainty===3}
              class:pill-active={i===selIdx}
              onclick={()=>switchAnalysis(i)}>
              {i+1}{a.is_primary?'*':''}
            </button>
          {/each}
        </div>
      </div>

      <!-- ── Body ─────────────────────────────────────────────────────────────── -->
      <div class="body-scroll">

        <!-- ══════════ VIEW MODE ══════════ -->
        {#if mode==='view' && analyses.length>0}

          <!-- Morphological class (top-level row) -->
          <div class="top-row">
            <span class="top-lbl">Morphological class</span>
            <span class="top-val">{d(fMtype)}</span>
          </div>

          <!-- POS -->
          <div class="top-row">
            <span class="top-lbl">Part of Speech</span>
            <span class="top-val">
              {#if currentPOS}
                {currentPOS.meaning} — <span class="ar-inline">{currentPOS.arabic}</span>
              {:else}—{/if}
            </span>
          </div>

          <!-- ROOT & DERIVATION -->
          {#if showVN}
            <div class="sec">
              <div class="sec-hd">
                <span>Root &amp; Derivation</span>
                <span class="sec-hd-ar">الجذر والاشتقاق</span>
              </div>

              <div class="kv">
                <span class="kv-lbl">Root جذر</span>
                <span class="kv-ar linkable" data-type="root">{d(fRoot)}</span>
              </div>

              <div class="kv">
                <span class="kv-lbl">Root Type</span>
                {#if fRootType}
                  <span class="kv-sub">{fRootType}</span>
                {:else}
                  <span class="kv-val">—</span>
                {/if}
              </div>

              <div class="kv">
                <span class="kv-lbl">Verb Form</span>
                <span class="kv-val">{vformLbl(fVform)}</span>
              </div>

              {#if showVerbal && fVform==1}
                <div class="kv">
                  <span class="kv-lbl">F1 Vowel</span>
                  <span class="kv-val mono">{d(fF1type)}</span>
                </div>
              {/if}

              {#if showNominal}
                <div class="kv">
                  <span class="kv-lbl">Noun Type</span>
                  <span class="kv-val">{d(fNtype)}</span>
                </div>
              {/if}
            </div>
          {/if}

          <!-- LEMMA (separate section) -->
          <div class="sec">
            <div class="sec-hd">
              <span>Lemma</span>
            </div>

            {#each lemmaRows as row}
              <div class="list-row">
                <span class="list-rank">{row.rank}</span>
                <span class="list-ar linkable" data-type="lemma">{row.text||'—'}</span>
                {#if row.lemmaType}<span class="list-type">{row.lemmaType}</span>{/if}
                <span class="cert-dot {certClass(row.certainty)}" title={certLbl(row.certainty)}></span>
                <button class="list-del" onclick={()=>viewDeleteLemma(row.alId)} title="Remove">✕</button>
              </div>
            {/each}

            {#if addingLemma}
              <div class="add-inline">
                <input class="add-ar-input" bind:value={newLemmaText}
                  placeholder="عَالِم" dir="rtl" autofocus>
                <select bind:value={newLemmaCert} class="add-cert">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
                <button class="add-ok"  onclick={viewAddLemma}>✓</button>
                <button class="add-cancel" onclick={()=>{addingLemma=false;newLemmaText=''}}>✕</button>
              </div>
            {:else}
              <div class="list-add-row">
                <button class="list-add-icon" onclick={()=>addingLemma=true} title="Add Lemma">+</button>
              </div>
            {/if}
          </div>

          <!-- PATTERN (separate section) -->
          {#if showVN}
            <div class="sec">
              <div class="sec-hd">
                <span>Pattern</span>
                <span class="sec-hd-ar">وزن</span>
              </div>

              {#each patternRows as row}
                <div class="list-row">
                  <span class="list-rank">{row.rank}</span>
                  <span class="list-ar linkable" data-type="pattern">{row.text||'—'}</span>
                  {#if row.patternType}<span class="list-type">{row.patternType}</span>{/if}
                  <span class="cert-dot {certClass(row.certainty)}" title={certLbl(row.certainty)}></span>
                  <button class="list-del" onclick={()=>viewDeletePattern(row.apId)} title="Remove">✕</button>
                </div>
              {/each}

              {#if addingPattern}
                <div class="add-inline">
                  <input class="add-ar-input" bind:value={newPatText}
                    placeholder="فَعَلَ" dir="rtl" autofocus>
                  <select bind:value={newPatCert} class="add-cert">
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                  </select>
                  <button class="add-ok"  onclick={viewAddPattern}>✓</button>
                  <button class="add-cancel" onclick={()=>{addingPattern=false;newPatText=''}}>✕</button>
                </div>
              {:else}
                <div class="list-add-row">
                  <button class="list-add-icon" onclick={()=>addingPattern=true} title="Add Pattern">+</button>
                </div>
              {/if}
            </div>
          {/if}

          <!-- GRAMMATICAL FEATURES -->
          {#if showVN || fSp}
            <div class="sec">
              <div class="sec-hd">
                <span>Grammatical Features</span>
                <span class="sec-hd-ar">الخصائص النحوية</span>
              </div>

              {#if showVN}
                <div class="feat-grid">
                  <div class="feat-cell"><div class="feat-lbl">Person</div><div class="feat-val">{personLbl(fPerson)}</div></div>
                  <div class="feat-cell"><div class="feat-lbl">Gender</div><div class="feat-val">{d(fGender)}</div></div>
                  <div class="feat-cell"><div class="feat-lbl">Number</div><div class="feat-val">{d(fNumber)}</div></div>
                </div>
              {/if}

              {#if showVerbal}
                <div class="feat-grid">
                  <div class="feat-cell"><div class="feat-lbl">Aspect</div><div class="feat-val">{d(fAspect)}</div></div>
                  <div class="feat-cell"><div class="feat-lbl">Mood</div><div class="feat-val">{d(fMood)}</div></div>
                  <div class="feat-cell"><div class="feat-lbl">Voice</div><div class="feat-val">{d(fVoice)}</div></div>
                </div>
              {/if}

              {#if showNominal}
                <div class="feat-grid">
                  <div class="feat-cell"><div class="feat-lbl">Case</div><div class="feat-val">{d(fCase)}</div></div>
                  <div class="feat-cell"><div class="feat-lbl">Definiteness</div><div class="feat-val">{d(fDef)}</div></div>
                </div>
              {/if}

              {#if fSp}
                <div class="feat-grid">
                  <div class="feat-cell"><div class="feat-lbl">Sister-verb (SP)</div><div class="feat-val ar">{fSp}</div></div>
                </div>
              {/if}
            </div>
          {/if}

          <!-- NOTES -->
          {#if fNotes}
            <div class="sec">
              <div class="sec-hd"><span>Notes</span><span class="sec-hd-ar">ملاحظات</span></div>
              <div class="notes-text">{fNotes}</div>
            </div>
          {/if}

        <!-- ══════════ EDIT MODE ══════════ -->
        {:else}

          <div class="esec">
            <div class="efield-row">
              <div class="efield">
                <label>Morphological Type</label>
                <select bind:value={fMtype}>
                  <option value="">--</option>
                  <option>Prefix</option><option>Stem</option><option>Suffix</option>
                </select>
              </div>
              <div class="efield">
                <label>Certainty</label>
                <select bind:value={fCert}>
                  <option value={1}>1 — Confirmed</option>
                  <option value={2}>2 — Probable</option>
                  <option value={3}>3 — Uncertain</option>
                </select>
              </div>
            </div>
            <label class="primary-toggle">
              <input type="checkbox" bind:checked={fIsPrimary}>
              Set as primary / default analysis ★
            </label>
          </div>

          <div class="esec">
            <div class="esec-hd">Part of Speech</div>
            <div class="efield">
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

          {#if showVN}
            <div class="esec">
              <div class="esec-hd">Root &amp; Derivation</div>
              <div class="efield-row">
                <div class="efield">
                  <label>Root جذر</label>
                  <input class="ar-input" bind:value={fRoot} oninput={onRootInput} placeholder="كتب" dir="rtl">
                </div>
                <div class="efield" style="justify-content:flex-end;">
                  <small class="root-hint">{rootStatus}</small>
                </div>
              </div>
              <div class="efield-row">
                <div class="efield">
                  <label>Verb Form</label>
                  <select bind:value={fVform}>
                    <option value="">--</option>
                    {#each [1,2,3,4,5,6,7,8,9,10,11,12] as n}<option value={n}>Form {n}</option>{/each}
                  </select>
                </div>
                {#if showVerbal && fVform==1}
                  <div class="efield">
                    <label>F1 Vowel</label>
                    <select bind:value={fF1type}>
                      <option value="">--</option>
                      {#each ['aa','ai','au','ia','ii','iu','ua','ui','uu','??'] as t}<option value={t}>{t}</option>{/each}
                    </select>
                  </div>
                {/if}
                {#if showNominal}
                  <div class="efield">
                    <label>Noun Type</label>
                    <select bind:value={fNtype}>
                      <option value="">--</option>
                      <option value="VN">VN</option><option value="AP">AP</option><option value="PP">PP</option>
                    </select>
                  </div>
                {/if}
              </div>
            </div>
          {/if}

          <div class="esec">
            <div class="esec-hd">Lemma</div>
            {#each lemmaRows as row, i}
              <div class="sub-row">
                <span class="sub-rank">{i+1}.</span>
                <input class="ar-input sub-inp" bind:value={row.text} placeholder="عَالِم" dir="rtl">
                <select bind:value={row.certainty} class="cert-sel">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
                <button class="btn-x" onclick={()=>removeLemmaEdit(i)}>✕</button>
              </div>
            {/each}
            <button class="btn-add" onclick={()=>lemmaRows=[...lemmaRows,{text:'',certainty:1,rank:lemmaRows.length+1}]}>+ Lemma</button>
          </div>

          {#if showVN}
            <div class="esec">
              <div class="esec-hd">Pattern وزن</div>
              {#each patternRows as row, i}
                <div class="sub-row">
                  <span class="sub-rank">{i+1}.</span>
                  <input class="ar-input sub-inp" bind:value={row.text} placeholder="فَعَلَ" dir="rtl">
                  <select bind:value={row.certainty} class="cert-sel">
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                  </select>
                  <button class="btn-x" onclick={()=>removePatternEdit(i)}>✕</button>
                </div>
              {/each}
              <button class="btn-add" onclick={()=>patternRows=[...patternRows,{text:'',certainty:1,rank:patternRows.length+1}]}>+ Pattern</button>
            </div>
          {/if}

          <div class="esec">
            <div class="esec-hd">Grammatical Features</div>
            {#if showVN}
              <div class="efield-row">
                <div class="efield"><label>Person</label>
                  <select bind:value={fPerson}>
                    <option value="">--</option>
                    <option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option>
                  </select>
                </div>
                <div class="efield"><label>Gender</label>
                  <select bind:value={fGender}>
                    <option value="">--</option><option value="M">M</option><option value="F">F</option>
                  </select>
                </div>
                <div class="efield"><label>Number</label>
                  <select bind:value={fNumber}>
                    <option value="">--</option>
                    <option value="S">S</option><option value="D">D</option><option value="P">P</option>
                  </select>
                </div>
              </div>
            {/if}
            {#if showVerbal}
              <div class="efield-row">
                <div class="efield"><label>Aspect</label>
                  <select bind:value={fAspect}>
                    <option value="">--</option><option value="PERF">PERF</option><option value="IMPF">IMPF</option>
                  </select>
                </div>
                <div class="efield"><label>Mood</label>
                  <select bind:value={fMood}>
                    <option value="">--</option>
                    <option value="IND">IND</option><option value="SUBJ">SUBJ</option>
                    <option value="JUS">JUS</option><option value="IMPV">IMPV</option><option value="ENRG">ENRG</option>
                  </select>
                </div>
                <div class="efield"><label>Voice</label>
                  <select bind:value={fVoice}>
                    <option value="">--</option><option value="ACT">ACT</option><option value="PASS">PASS</option>
                  </select>
                </div>
              </div>
            {/if}
            {#if showNominal}
              <div class="efield-row">
                <div class="efield"><label>Case</label>
                  <select bind:value={fCase}>
                    <option value="">--</option>
                    <option value="NOM">NOM</option><option value="ACC">ACC</option><option value="GEN">GEN</option>
                  </select>
                </div>
                <div class="efield"><label>Definiteness</label>
                  <select bind:value={fDef}>
                    <option value="">--</option><option value="DEF">DEF</option><option value="INDEF">INDEF</option>
                  </select>
                </div>
              </div>
            {/if}
            <div class="efield-row">
              <div class="efield"><label>SP</label>
                <select bind:value={fSp}>
                  <option value="">--</option>
                  <option value="كَان">كَان</option><option value="إِنّ">إِنّ</option><option value="لَيْسَ">لَيْسَ</option>
                </select>
              </div>
            </div>
          </div>

          <div class="esec">
            <div class="esec-hd">Notes</div>
            <textarea class="notes-input" bind:value={fNotes} rows="3" dir="rtl" placeholder="ملاحظات..."></textarea>
          </div>

        {/if}
      </div><!-- /body-scroll -->

      {#if statusMsg}
        <div class="status-bar status-{statusType}">{statusMsg}</div>
      {/if}

    {/if}
  {/if}
</div>

<!-- ════════════════════════════════════════════════════════════════════════════ -->
<style>
/* Shell */
.panel{display:flex;flex-direction:column;height:100%;background:white;border-left:1px solid #ddd;overflow:hidden;}
.splash{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#ccc;}
.splash-ar{font-size:22px;font-family:'Traditional Arabic',Arial,sans-serif;}
.splash-en{font-size:13px;}

/* Morpheme tabs */
.morpheme-tabs{display:flex;border-bottom:2px solid #eee;overflow-x:auto;flex-shrink:0;direction:rtl;}
.m-tab{padding:10px 18px;border:none;background:none;cursor:pointer;font-size:22px;font-family:'Traditional Arabic',Arial,sans-serif;border-bottom:3px solid transparent;color:#555;white-space:nowrap;transition:background 0.12s;}
.m-tab:hover{background:#f5f5f5;}
.m-tab.active{border-bottom-color:#1a472a;color:#1a472a;font-weight:bold;}

/* Action bar */
.action-bar{display:flex;align-items:center;justify-content:space-between;direction:ltr;padding:8px 12px;border-bottom:1px solid #e8e8e8;flex-shrink:0;background:white;gap:8px;}
.action-left{display:flex;gap:6px;flex-shrink:0;}
.abtn{border:none;border-radius:6px;padding:5px 14px;cursor:pointer;font-size:12px;font-weight:600;letter-spacing:0.2px;transition:opacity 0.15s;}
.abtn.edit  {background:#1a472a;color:white;}
.abtn.danger{background:#e53935;color:white;}
.abtn.save  {background:#1a472a;color:white;}
.abtn.cancel{background:#ccc;color:#555;}
.abtn:hover{opacity:0.88;}

/* Analysis pills row */
.a-pills-wrap{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.new-pill-icon{background:#f5f5f5;border:none;color:#aaa;border-radius:6px;width:28px;height:28px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:19px;line-height:1;padding:0;flex-shrink:0;transition:all 0.15s;}
.new-pill-icon:hover{background:#e8f5e9;color:#1a472a;}
.a-pill{display:flex;align-items:center;justify-content:center;min-width:32px;height:28px;padding:0 10px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;color:white;letter-spacing:0.3px;box-shadow:0 1px 4px rgba(0,0,0,0.15);transition:all 0.15s;}
.a-pill.pill-c1{background:#43a047;}
.a-pill.pill-c2{background:#fb8c00;}
.a-pill.pill-c3{background:#e53935;}
.a-pill:hover{filter:brightness(1.1);transform:translateY(-1px);}
.a-pill.pill-active{box-shadow:0 0 0 2px white,0 0 0 4px #1a472a;}

/* Body */
.body-scroll{flex:1;overflow-y:auto;direction:ltr;background:#f5f5f5;padding:10px;}

/* ── VIEW MODE ── */
/* Top rows (Morphological class, POS) */
.top-row{display:flex;align-items:baseline;justify-content:space-between;padding:8px 12px;background:white;border-radius:8px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.07);}
.top-lbl{font-size:11px;font-weight:700;color:#1a472a;text-transform:uppercase;letter-spacing:0.5px;}
.top-val{font-size:14px;color:#222;font-weight:500;}
.ar-inline{font-family:'Traditional Arabic',Arial,sans-serif;font-size:18px;direction:rtl;}

/* Sections */
.sec{background:white;border-radius:8px;padding:12px 14px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.07);}
.sec-hd{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
.sec-hd span:first-child{font-size:11px;font-weight:700;color:#1a472a;text-transform:uppercase;letter-spacing:0.6px;opacity:0.8;}
.sec-hd-ar{font-size:11px;font-family:'Traditional Arabic',Arial,sans-serif;color:#1a472a;direction:rtl;font-weight:700;letter-spacing:0.4px;opacity:0.8;}

/* Key-value rows */
.kv{display:flex;align-items:center;justify-content:space-between;padding:4px 0;min-height:28px;}
.kv-lbl{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.4px;flex-shrink:0;}
.kv-right{display:flex;align-items:center;gap:6px;direction:rtl;}
.kv-val{font-size:14px;color:#222;}
.kv-ar{font-size:21px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;color:#222;}
.kv-sub{font-size:11px;padding:2px 7px;background:#f0f7f0;color:#2e7d32;border:1px solid #c8e6c9;border-radius:8px;}
.mono{font-family:monospace;background:#f5f5f5;padding:1px 6px;border-radius:3px;font-size:13px;}
.linkable{cursor:default;}

/* List rows (pattern / lemma in view mode) */
.list-row{display:flex;align-items:center;gap:8px;padding:5px 4px;border-bottom:1px solid #f8f8f8;}
.list-row:last-of-type{border-bottom:none;}
.list-rank{font-size:11px;color:#bbb;min-width:16px;flex-shrink:0;}
.list-ar{font-size:20px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;flex:1;text-align:right;color:#222;}
.list-type{font-size:11px;color:#888;flex-shrink:0;max-width:80px;text-align:left;}
.list-del{background:none;border:none;color:#ddd;cursor:pointer;font-size:13px;padding:2px 4px;flex-shrink:0;transition:color 0.1s;}
.list-del:hover{color:#e74c3c;}

/* Inline add form */
.add-inline{display:flex;align-items:center;gap:5px;padding:5px 4px;margin-top:4px;}
.add-ar-input{flex:1;border:1px solid #1a472a;border-radius:4px;padding:5px 8px;font-size:18px;font-family:'Traditional Arabic',Arial,sans-serif;outline:none;}
.add-cert{width:44px;border:1px solid #ddd;border-radius:4px;padding:4px;font-size:12px;}
.add-ok{background:#1a472a;color:white;border:none;border-radius:4px;padding:5px 10px;cursor:pointer;font-size:13px;}
.add-cancel{background:none;border:1px solid #ddd;border-radius:4px;padding:5px 8px;cursor:pointer;font-size:13px;color:#888;}
.list-add-row{display:flex;justify-content:flex-end;padding:2px 4px;}
.list-add-icon{background:none;border:1px dashed #2980b9;color:#2980b9;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:16px;line-height:1;padding:0;transition:all 0.15s;}
.list-add-icon:hover{background:#2980b9;color:white;}

/* Cert dots */
.cert-dot{display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;}
.cert-confirmed{background:#43a047;}
.cert-probable {background:#fb8c00;}
.cert-uncertain{background:#e53935;}

/* Feature grids */
.feat-grid{display:flex;border:1px solid #f0f0f0;border-radius:6px;overflow:hidden;margin-bottom:6px;}
.feat-cell{flex:1;padding:7px 10px;border-right:1px solid #f0f0f0;}
.feat-cell:last-child{border-right:none;}
.feat-lbl{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:3px;}
.feat-val{font-size:14px;color:#222;font-weight:500;}
.feat-val.ar{font-size:18px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;}

.notes-text{font-size:13px;color:#555;direction:rtl;line-height:1.7;padding:6px 8px;background:#fafafa;border-radius:4px;border:1px solid #eee;}

/* ── EDIT MODE ── */
.esec{background:white;border-radius:8px;padding:12px 14px;margin-bottom:6px;box-shadow:0 1px 3px rgba(0,0,0,0.07);}
.esec-hd{font-size:11px;font-weight:700;color:#1a472a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;opacity:0.8;}
.efield-row{display:flex;gap:8px;margin-bottom:8px;}
.efield{display:flex;flex-direction:column;gap:3px;flex:1;}
.efield label{font-size:11px;color:#888;}
.efield select,.efield input,.efield textarea{border:1px solid #ddd;border-radius:4px;padding:5px 8px;font-size:13px;width:100%;background:white;}
.efield select:focus,.efield input:focus,.efield textarea:focus{outline:none;border-color:#1a472a;}
.ar-input{font-family:'Traditional Arabic',Arial,sans-serif !important;font-size:18px !important;}
.sub-row{display:flex;gap:6px;align-items:center;margin-bottom:5px;padding:5px 8px;background:#f9f9f9;border:1px solid #eee;border-radius:4px;}
.sub-rank{font-size:12px;color:#bbb;min-width:16px;flex-shrink:0;}
.sub-inp{flex:1;border:1px solid #ddd;border-radius:4px;padding:4px 8px;font-size:18px;font-family:'Traditional Arabic',Arial,sans-serif;}
.cert-sel{width:46px;border:1px solid #ddd;border-radius:4px;padding:4px;flex-shrink:0;}
.btn-x{background:#e74c3c;color:white;border:none;border-radius:3px;padding:3px 7px;cursor:pointer;font-size:11px;flex-shrink:0;}
.btn-add{background:none;color:#2980b9;border:1px dashed #2980b9;border-radius:4px;padding:4px 12px;cursor:pointer;font-size:12px;margin-top:3px;}
.btn-add:hover{background:#ebf5fb;}
.root-hint{font-size:12px;color:#888;align-self:flex-end;padding-bottom:3px;}
.primary-toggle{display:flex;align-items:center;gap:7px;font-size:12px;color:#555;cursor:pointer;margin-top:6px;padding:6px 8px;background:#fffde7;border-radius:4px;border:1px solid #fff9c4;}
.primary-toggle input{accent-color:#1a472a;width:14px;height:14px;}
.notes-input{resize:vertical;font-size:13px !important;direction:rtl;line-height:1.6;}

/* Status */
.status-bar{padding:8px 14px;font-size:12px;flex-shrink:0;}
.status-success{background:#d4edda;color:#155724;}
.status-error  {background:#f8d7da;color:#721c24;}
.status-info   {background:#d1ecf1;color:#0c5460;}
</style>
