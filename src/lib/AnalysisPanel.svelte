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
  let mode       = $state('view');   // 'view' | 'edit'
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
  let lemmaRows   = $state([]);
  let patternRows = $state([]);

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
    selectedMorpheme = m;
    loading = true;
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

    const als = await get('analysis_lemma', {
      select: 'rank,certainty,lemma(arabic_text)', analysis_id: `eq.${a.id}`, order: 'rank.asc'
    });
    lemmaRows = (als || []).map(al => ({ text: al.lemma?.arabic_text || '', certainty: al.certainty }));

    const aps = await get('analysis_pattern', {
      select: 'rank,certainty,pattern(arabic_text)', analysis_id: `eq.${a.id}`, order: 'rank.asc'
    });
    patternRows = (aps || []).map(ap => ({ text: ap.pattern?.arabic_text || '', certainty: ap.certainty }));
  }

  function clearForm() {
    fMtype=''; fPos=''; fCert=1; fIsPrimary=(analyses.length===0);
    fRoot=''; fRootType=''; rootStatus='';
    fPerson=''; fGender=''; fNumber=''; fCase=''; fDef='';
    fSp=''; fVform=''; fF1type=''; fAspect=''; fMood=''; fVoice='';
    fNtype=''; fNotes=''; lemmaRows=[]; patternRows=[];
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
    await saveLemmas(analysisId);
    await savePatterns(analysisId);
    showStatus('Saved ✓','success');
    await loadAnalyses(selectedMorpheme.id);
    setTimeout(() => statusMsg='', 3000);
  }

  async function saveLemmas(analysisId) {
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

  async function savePatterns(analysisId) {
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
  function removeLemma(i)   { lemmaRows   = lemmaRows.filter((_,j)=>j!==i); }
  function removePattern(i) { patternRows = patternRows.filter((_,j)=>j!==i); }

  // ── Display helpers ───────────────────────────────────────────────────────────
  const d = v => v || '—';
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

      <!-- ── Analysis header ──────────────────────────────────────────────────── -->
      <div class="a-header">

        <!-- Row 1: tabs + action buttons -->
        <div class="a-top">
          <div class="a-tabs">
            {#each analyses as a, i}
              <button class="a-tab" class:active={i===selIdx && mode==='view'}
                onclick={()=>switchAnalysis(i)}>
                {i+1}{a.is_primary?' ★':''}
              </button>
            {/each}
            <button class="a-tab-new" onclick={startNew}>+ New</button>
          </div>
          <div class="a-btns">
            {#if mode==='view'}
              <button class="abtn edit"   onclick={startEdit}>Edit</button>
              <button class="abtn danger" onclick={deleteAnalysis}>Delete</button>
            {:else}
              <button class="abtn save"   onclick={saveAnalysis}>Save</button>
              <button class="abtn cancel" onclick={cancelEdit}>Cancel</button>
            {/if}
          </div>
        </div>

        <!-- Row 2: POS summary + certainty (view mode) -->
        {#if mode==='view' && analyses.length>0}
          <div class="a-summary">
            <div class="a-pos-info">
              {#if fPos}<span class="pos-code">{fPos}</span>{/if}
              {#if posGroup}<span class="pos-group">{posGroup}</span>{/if}
              {#if currentPOS?.arabic}<span class="pos-ar">{currentPOS.arabic}</span>{/if}
              {#if currentPOS?.meaning}<span class="pos-meaning">— {currentPOS.meaning}</span>{/if}
            </div>
            <span class="cert-pill {certClass(fCert)}">{certLbl(fCert)}</span>
          </div>
        {/if}
      </div>

      <!-- ── Scrollable body ───────────────────────────────────────────────────── -->
      <div class="body-scroll">

        <!-- ══════════════ VIEW MODE ══════════════ -->
        {#if mode==='view' && analyses.length>0}

          <!-- 1. MORPHEME TYPE -->
          <div class="sec">
            <div class="sec-hd">Morpheme</div>
            <div class="kv">
              <span class="kv-lbl">Type</span>
              <span class="kv-val mtype">{d(fMtype)}</span>
            </div>
          </div>

          <!-- 2. ROOT & DERIVATION (Verbal / Nominal) -->
          {#if showVN}
            <div class="sec">
              <div class="sec-hd">Root &amp; Derivation — الجذر والاشتقاق</div>

              <div class="kv">
                <span class="kv-lbl">Root جذر</span>
                <span class="kv-val ar linkable" data-type="root">
                  {d(fRoot)}
                  {#if fRootType}<span class="mini-chip">{fRootType}</span>{/if}
                </span>
              </div>

              <div class="kv">
                <span class="kv-lbl">Verb Form</span>
                <span class="kv-val">{vformLbl(fVform)}</span>
              </div>

              {#if showVerbal && fVform==1}
                <div class="kv">
                  <span class="kv-lbl">F1 Vowel Pattern</span>
                  <span class="kv-val mono">{d(fF1type)}</span>
                </div>
              {/if}

              {#if showNominal}
                <div class="kv">
                  <span class="kv-lbl">Noun Type</span>
                  <span class="kv-val">{d(fNtype)}</span>
                </div>
              {/if}

              <!-- Patterns -->
              {#if patternRows.length>0}
                {#each patternRows as row, i}
                  <div class="kv">
                    <span class="kv-lbl">{i===0?'Pattern وزن':''}</span>
                    <span class="kv-val ar linkable" data-type="pattern">
                      {row.text||'—'}
                      <span class="cert-dot {certClass(row.certainty)}" title={certLbl(row.certainty)}></span>
                    </span>
                  </div>
                {/each}
              {:else}
                <div class="kv">
                  <span class="kv-lbl">Pattern وزن</span>
                  <span class="kv-val">—</span>
                </div>
              {/if}
            </div>
          {/if}

          <!-- 3. LEXEME (Lemma — always) -->
          <div class="sec">
            <div class="sec-hd">Lexeme — المعجم</div>
            {#if lemmaRows.length>0}
              {#each lemmaRows as row, i}
                <div class="kv">
                  <span class="kv-lbl">{i===0?'Lemma':''}</span>
                  <span class="kv-val ar linkable" data-type="lemma">
                    {row.text||'—'}
                    <span class="cert-dot {certClass(row.certainty)}" title={certLbl(row.certainty)}></span>
                  </span>
                </div>
              {/each}
            {:else}
              <div class="kv">
                <span class="kv-lbl">Lemma</span>
                <span class="kv-val">—</span>
              </div>
            {/if}
          </div>

          <!-- 4. GRAMMATICAL FEATURES -->
          {#if showVN || fSp}
            <div class="sec">
              <div class="sec-hd">Grammatical Features — الخصائص النحوية</div>

              {#if showVN}
                <div class="feat-grid3">
                  <div class="feat-cell">
                    <div class="feat-lbl">Person</div>
                    <div class="feat-val">{personLbl(fPerson)}</div>
                  </div>
                  <div class="feat-cell">
                    <div class="feat-lbl">Gender</div>
                    <div class="feat-val">{d(fGender)}</div>
                  </div>
                  <div class="feat-cell">
                    <div class="feat-lbl">Number</div>
                    <div class="feat-val">{d(fNumber)}</div>
                  </div>
                </div>
              {/if}

              {#if showVerbal}
                <div class="feat-grid3">
                  <div class="feat-cell">
                    <div class="feat-lbl">Aspect</div>
                    <div class="feat-val">{d(fAspect)}</div>
                  </div>
                  <div class="feat-cell">
                    <div class="feat-lbl">Mood</div>
                    <div class="feat-val">{d(fMood)}</div>
                  </div>
                  <div class="feat-cell">
                    <div class="feat-lbl">Voice</div>
                    <div class="feat-val">{d(fVoice)}</div>
                  </div>
                </div>
              {/if}

              {#if showNominal}
                <div class="feat-grid2">
                  <div class="feat-cell">
                    <div class="feat-lbl">Case</div>
                    <div class="feat-val">{d(fCase)}</div>
                  </div>
                  <div class="feat-cell">
                    <div class="feat-lbl">Definiteness</div>
                    <div class="feat-val">{d(fDef)}</div>
                  </div>
                </div>
              {/if}

              {#if fSp}
                <div class="feat-grid1">
                  <div class="feat-cell">
                    <div class="feat-lbl">Sister-verb (SP)</div>
                    <div class="feat-val ar">{fSp}</div>
                  </div>
                </div>
              {/if}
            </div>
          {/if}

          <!-- 5. NOTES -->
          {#if fNotes}
            <div class="sec">
              <div class="sec-hd">Notes — ملاحظات</div>
              <div class="notes-text">{fNotes}</div>
            </div>
          {/if}

        <!-- ══════════════ EDIT MODE ══════════════ -->
        {:else}

          <!-- Type + Certainty + Primary -->
          <div class="esec">
            <div class="efield-row">
              <div class="efield">
                <label>Morpheme Type</label>
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

          <!-- POS -->
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

          <!-- Root & Derivation (Verbal / Nominal) -->
          {#if showVN}
            <div class="esec">
              <div class="esec-hd">Root &amp; Derivation — الجذر والاشتقاق</div>

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
                    {#each [1,2,3,4,5,6,7,8,9,10,11,12] as n}
                      <option value={n}>Form {n}</option>
                    {/each}
                  </select>
                </div>
                {#if showVerbal && fVform==1}
                  <div class="efield">
                    <label>F1 Vowel Pattern</label>
                    <select bind:value={fF1type}>
                      <option value="">--</option>
                      {#each ['aa','ai','au','ia','ii','iu','ua','ui','uu','??'] as t}
                        <option value={t}>{t}</option>
                      {/each}
                    </select>
                  </div>
                {/if}
                {#if showNominal}
                  <div class="efield">
                    <label>Noun Type</label>
                    <select bind:value={fNtype}>
                      <option value="">--</option>
                      <option value="VN">VN — Verbal Noun</option>
                      <option value="AP">AP — Active Participle</option>
                      <option value="PP">PP — Passive Participle</option>
                    </select>
                  </div>
                {/if}
              </div>

              <!-- Patterns -->
              <div class="sub-label">Pattern وزن</div>
              {#each patternRows as row, i}
                <div class="sub-row">
                  <span class="sub-rank">{i+1}.</span>
                  <input class="ar-input sub-inp" bind:value={row.text} placeholder="فَعَلَ" dir="rtl">
                  <select bind:value={row.certainty} class="cert-sel">
                    <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                  </select>
                  <button class="btn-x" onclick={()=>removePattern(i)}>✕</button>
                </div>
              {/each}
              <button class="btn-add" onclick={()=>patternRows=[...patternRows,{text:'',certainty:1}]}>+ Pattern</button>
            </div>
          {/if}

          <!-- Lexeme -->
          <div class="esec">
            <div class="esec-hd">Lexeme — المعجم</div>
            <div class="sub-label">Lemma</div>
            {#each lemmaRows as row, i}
              <div class="sub-row">
                <span class="sub-rank">{i+1}.</span>
                <input class="ar-input sub-inp" bind:value={row.text} placeholder="عَالِم" dir="rtl">
                <select bind:value={row.certainty} class="cert-sel">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
                <button class="btn-x" onclick={()=>removeLemma(i)}>✕</button>
              </div>
            {/each}
            <button class="btn-add" onclick={()=>lemmaRows=[...lemmaRows,{text:'',certainty:1}]}>+ Lemma</button>
          </div>

          <!-- Grammatical Features -->
          <div class="esec">
            <div class="esec-hd">Grammatical Features — الخصائص النحوية</div>

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
                    <option value="">--</option><option value="M">M — Masculine</option><option value="F">F — Feminine</option>
                  </select>
                </div>
                <div class="efield"><label>Number</label>
                  <select bind:value={fNumber}>
                    <option value="">--</option>
                    <option value="S">S — Singular</option><option value="D">D — Dual</option><option value="P">P — Plural</option>
                  </select>
                </div>
              </div>
            {/if}

            {#if showVerbal}
              <div class="efield-row">
                <div class="efield"><label>Aspect</label>
                  <select bind:value={fAspect}>
                    <option value="">--</option><option value="PERF">PERF — Perfect</option><option value="IMPF">IMPF — Imperfect</option>
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
                    <option value="">--</option><option value="ACT">ACT — Active</option><option value="PASS">PASS — Passive</option>
                  </select>
                </div>
              </div>
            {/if}

            {#if showNominal}
              <div class="efield-row">
                <div class="efield"><label>Case</label>
                  <select bind:value={fCase}>
                    <option value="">--</option>
                    <option value="NOM">NOM — Nominative</option>
                    <option value="ACC">ACC — Accusative</option>
                    <option value="GEN">GEN — Genitive</option>
                  </select>
                </div>
                <div class="efield"><label>Definiteness</label>
                  <select bind:value={fDef}>
                    <option value="">--</option><option value="DEF">DEF — Definite</option><option value="INDEF">INDEF — Indefinite</option>
                  </select>
                </div>
              </div>
            {/if}

            <div class="efield-row">
              <div class="efield"><label>Sister-verb (SP)</label>
                <select bind:value={fSp}>
                  <option value="">--</option>
                  <option value="كَان">كَان</option>
                  <option value="إِنّ">إِنّ</option>
                  <option value="لَيْسَ">لَيْسَ</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="esec">
            <div class="esec-hd">Notes — ملاحظات</div>
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
/* ── Shell ─────────────────────────────────────────────────────────────────── */
.panel{display:flex;flex-direction:column;height:100%;background:white;border-left:1px solid #ddd;overflow:hidden;}
.splash{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:#ccc;}
.splash-ar{font-size:22px;font-family:'Traditional Arabic',Arial,sans-serif;}
.splash-en{font-size:13px;}

/* ── Morpheme tabs ─────────────────────────────────────────────────────────── */
.morpheme-tabs{display:flex;border-bottom:2px solid #eee;overflow-x:auto;flex-shrink:0;direction:rtl;}
.m-tab{padding:10px 18px;border:none;background:none;cursor:pointer;font-size:22px;font-family:'Traditional Arabic',Arial,sans-serif;border-bottom:3px solid transparent;color:#555;white-space:nowrap;transition:background 0.12s;}
.m-tab:hover{background:#f5f5f5;}
.m-tab.active{border-bottom-color:#1a472a;color:#1a472a;font-weight:bold;}

/* ── Analysis header ────────────────────────────────────────────────────────── */
.a-header{flex-shrink:0;border-bottom:1px solid #e0e0e0;background:#fafafa;}
.a-top{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;gap:8px;}
.a-tabs{display:flex;gap:4px;flex-wrap:wrap;}
.a-tab{padding:4px 11px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:12px;transition:background 0.1s;}
.a-tab:hover{background:#f0f0f0;}
.a-tab.active{background:#1a472a;color:white;border-color:#1a472a;}
.a-tab-new{padding:4px 11px;border:1px solid #2980b9;border-radius:4px;background:white;color:#2980b9;cursor:pointer;font-size:12px;}
.a-tab-new:hover{background:#ebf5fb;}
.a-btns{display:flex;gap:5px;flex-shrink:0;}
.abtn{border:none;border-radius:4px;padding:5px 13px;cursor:pointer;font-size:12px;font-weight:500;}
.abtn.edit  {background:#1a472a;color:white;}
.abtn.danger{background:#e74c3c;color:white;}
.abtn.save  {background:#1a472a;color:white;}
.abtn.cancel{background:#95a5a6;color:white;}

/* Analysis summary bar (view mode) */
.a-summary{display:flex;align-items:center;justify-content:space-between;padding:5px 12px;border-top:1px solid #eee;flex-wrap:wrap;gap:6px;}
.a-pos-info{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
.pos-code{font-family:monospace;font-size:13px;background:#f0f0f0;padding:2px 7px;border-radius:4px;color:#333;}
.pos-group{font-size:12px;padding:2px 8px;border-radius:10px;background:#e8f5e9;color:#2e7d32;}
.pos-ar{font-size:17px;font-family:'Traditional Arabic',Arial,sans-serif;color:#333;}
.pos-meaning{font-size:12px;color:#888;font-style:italic;}

/* Certainty pills */
.cert-pill{font-size:11px;padding:3px 10px;border-radius:10px;white-space:nowrap;font-weight:500;}
.cert-confirmed{background:#e8f5e9;color:#1b5e20;}
.cert-probable {background:#fff8e1;color:#e65100;}
.cert-uncertain{background:#fce4ec;color:#b71c1c;}

/* Certainty dots (in lists) */
.cert-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:4px;vertical-align:middle;}
.cert-dot.cert-confirmed{background:#43a047;}
.cert-dot.cert-probable {background:#fb8c00;}
.cert-dot.cert-uncertain{background:#e53935;}

/* ── Scrollable body ────────────────────────────────────────────────────────── */
.body-scroll{flex:1;overflow-y:auto;direction:ltr;}

/* ── VIEW MODE ──────────────────────────────────────────────────────────────── */
.sec{padding:10px 14px;border-bottom:1px solid #f0f0f0;}
.sec-hd{font-size:10px;font-weight:700;color:#1a472a;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:8px;opacity:0.7;}

/* Key-value rows: label left (EN), value right (AR or plain) */
.kv{display:flex;align-items:center;justify-content:space-between;padding:3px 0;min-height:26px;}
.kv-lbl{font-size:11px;color:#aaa;text-transform:uppercase;letter-spacing:0.4px;flex-shrink:0;min-width:90px;}
.kv-val{font-size:14px;color:#222;text-align:left;}
.kv-val.ar{font-size:21px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;text-align:right;}
.kv-val.mono{font-family:monospace;background:#f5f5f5;padding:1px 6px;border-radius:3px;font-size:13px;}
.kv-val.mtype{font-weight:600;color:#1a472a;}
.mini-chip{font-size:10px;padding:1px 6px;border-radius:8px;background:#f0f7f0;color:#2e7d32;margin-right:6px;border:1px solid #c8e6c9;vertical-align:middle;}
.linkable{cursor:default;}

/* Feature grids */
.feat-grid3,.feat-grid2,.feat-grid1{display:flex;gap:0;margin-bottom:4px;border:1px solid #f0f0f0;border-radius:6px;overflow:hidden;}
.feat-cell{flex:1;padding:7px 10px;border-right:1px solid #f0f0f0;}
.feat-cell:last-child{border-right:none;}
.feat-lbl{font-size:10px;color:#aaa;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:3px;}
.feat-val{font-size:14px;color:#222;font-weight:500;}
.feat-val.ar{font-size:18px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;}

.notes-text{font-size:13px;color:#555;direction:rtl;line-height:1.7;padding:6px 8px;background:#fafafa;border-radius:4px;border:1px solid #eee;}

/* ── EDIT MODE ──────────────────────────────────────────────────────────────── */
.esec{padding:10px 14px;border-bottom:1px solid #f0f0f0;}
.esec-hd{font-size:10px;font-weight:700;color:#1a472a;text-transform:uppercase;letter-spacing:0.7px;margin-bottom:8px;opacity:0.7;}
.efield-row{display:flex;gap:8px;margin-bottom:8px;}
.efield{display:flex;flex-direction:column;gap:3px;flex:1;}
.efield label{font-size:11px;color:#888;}
.efield select,.efield input,.efield textarea{border:1px solid #ddd;border-radius:4px;padding:5px 8px;font-size:13px;width:100%;background:white;}
.efield select:focus,.efield input:focus,.efield textarea:focus{outline:none;border-color:#1a472a;}
.ar-input{font-family:'Traditional Arabic',Arial,sans-serif !important;font-size:18px !important;}
.sub-label{font-size:11px;color:#888;margin-bottom:5px;font-weight:500;}
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

/* ── Status bar ─────────────────────────────────────────────────────────────── */
.status-bar{padding:8px 14px;font-size:12px;flex-shrink:0;}
.status-success{background:#d4edda;color:#155724;}
.status-error  {background:#f8d7da;color:#721c24;}
.status-info   {background:#d1ecf1;color:#0c5460;}
</style>
