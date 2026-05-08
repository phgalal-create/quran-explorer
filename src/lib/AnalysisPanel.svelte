<script>
  import { get, post, patch, del } from './supabase.js';

  let { tokenId } = $props();

  let morphemes = $state([]);
  let selectedMorpheme = $state(null);
  let analyses = $state([]);
  let selectedAnalysisIdx = $state(0);
  let isNewAnalysis = $state(false);
  let posData = $state([]);
  let rootList = $state([]);
  let rootCache = {};
  let rootStatus = $state('');
  let statusMsg = $state('');
  let statusType = $state('');
  let loading = $state(false);
  let editMode = $state(false);

  // Form fields
  let fMtype = $state(''), fPos = $state(''), fCert = $state(1), fRootId = $state(''), fRootText = $state('');
  let fPerson = $state(''), fGender = $state(''), fNumber = $state(''), fCase = $state(''), fDef = $state('');
  let fVform = $state(''), fF1type = $state(''), fAspect = $state(''), fMood = $state(''), fVoice = $state('');
  let fNtype = $state(''), fNotes = $state(''), fSp = $state('');
  let lemmaRows = $state([]);
  let patternRows = $state([]);

  // Derived POS info
  let selectedPos = $derived(posData.find(p => p.code === fPos));
  let posGroup = $derived(selectedPos?.pos_group || '');
  let isVerbal = $derived(posGroup === 'Verbal');
  let isNominal = $derived(posGroup === 'Nominal');
  let isNounOrPN = $derived(['N','PN'].includes(fPos));

  let posGroups = $derived(posData.reduce((acc, p) => {
    if (!acc[p.pos_group]) acc[p.pos_group] = [];
    acc[p.pos_group].push(p);
    return acc;
  }, {}));

  $effect(() => { loadPos(); loadRoots(); });
  $effect(() => { if (tokenId) { editMode = false; loadMorphemes(); } });

  async function loadPos() {
    posData = await get('pos', { select: 'code,arabic,meaning,pos_group', order: 'pos_group,code' });
  }

  async function loadRoots() {
    rootList = await get('root', { select: 'id,root_text,root_type', order: 'root_text.asc', limit: 10000 });
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
    editMode = false;
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
    if (analyses.length > 0) { await fillForm(analyses[0]); }
    else { isNewAnalysis = true; editMode = true; clearForm(); }
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
      fRootId = a.root_id;
      const roots = await get('root', { select: 'root_text', id: `eq.${a.root_id}` });
      fRootText = roots[0]?.root_text || '';
    } else {
      fRootId = '';
      fRootText = '';
    }

    const als = await get('analysis_lemma', { select: 'id,rank,certainty,lemma(arabic_text)', analysis_id: `eq.${a.id}`, order: 'rank.asc' });
    lemmaRows = (als || []).map(al => ({ text: al.lemma?.arabic_text || '', certainty: al.certainty }));
    const aps = await get('analysis_pattern', { select: 'id,rank,certainty,pattern(arabic_text)', analysis_id: `eq.${a.id}`, order: 'rank.asc' });
    patternRows = (aps || []).map(ap => ({ text: ap.pattern?.arabic_text || '', certainty: ap.certainty }));
  }

  function clearForm() {
    fMtype=''; fPos=''; fCert=1; fRootId=''; fRootText=''; rootStatus='';
    fPerson=''; fGender=''; fNumber=''; fCase=''; fDef=''; fSp='';
    fVform=''; fF1type=''; fAspect=''; fMood=''; fVoice='';
    fNtype=''; fNotes='';
    lemmaRows=[]; patternRows=[];
  }

  function onRootSelect(e) {
    fRootId = e.target.value;
    const root = rootList.find(r => r.id == fRootId);
    fRootText = root?.root_text || '';
  }

  async function saveAnalysis() {
    showStatus('Saving...', 'info');
    const data = {
      morpheme_id: selectedMorpheme.id,
      morpheme_type: fMtype||null, pos_code: fPos||null,
      root_id: fRootId ? parseInt(fRootId) : null,
      person: parseInt(fPerson)||null, gender: fGender||null, number: fNumber||null,
      grammatical_case: fCase||null, definiteness: fDef||null, sp: fSp||null,
      v_form: parseInt(fVform)||null, v_aspect: fAspect||null, v_mood: fMood||null,
      v_voice: fVoice||null, f1_type: fF1type||null, n_type: fNtype||null,
      certainty: parseInt(fCert)||1, is_primary: selectedAnalysisIdx===0, notes: fNotes||null
    };
    let analysisId;
    if (isNewAnalysis || analyses.length === 0) {
      const res = await post('analysis', data);
      if (res.error) { showStatus('Error: '+res.error.message, 'error'); return; }
      analysisId = res[0].id;
    } else {
      analysisId = analyses[selectedAnalysisIdx].id;
      const res = await patch('analysis', analysisId, data);
      if (res.error) { showStatus('Error: '+res.error.message, 'error'); return; }
    }
    await saveLemmas(analysisId);
    await savePatterns(analysisId);
    showStatus('Saved ✓', 'success');
    editMode = false;
    await loadAnalyses(selectedMorpheme.id);
    setTimeout(() => statusMsg='', 3000);
  }

  const SB_URL = "https://xcbjhkpotvphupvcvmxd.supabase.co";
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjYmpoa3BvdHZwaHVwdmN2bXhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5NjQzNDQsImV4cCI6MjA5MzU0MDM0NH0.zNwsSBbD-2SkhqIRceBdiUFRcKzLftMLA1XclZ1Vnak";

  async function saveLemmas(analysisId) {
    await fetch(`${SB_URL}/rest/v1/analysis_lemma?analysis_id=eq.${analysisId}`, { method:'DELETE', headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`} });
    for (let i=0; i<lemmaRows.length; i++) {
      const text = lemmaRows[i].text.trim(); if (!text) continue;
      let lemmaId; const ex = await get('lemma', { select:'id', arabic_text:`eq.${text}` });
      if (ex?.length>0) { lemmaId=ex[0].id; } else { const cr=await post('lemma',{arabic_text:text}); lemmaId=cr[0]?.id; }
      if (lemmaId) await post('analysis_lemma', { analysis_id:analysisId, lemma_id:lemmaId, rank:i+1, certainty:parseInt(lemmaRows[i].certainty) });
    }
  }

  async function savePatterns(analysisId) {
    await fetch(`${SB_URL}/rest/v1/analysis_pattern?analysis_id=eq.${analysisId}`, { method:'DELETE', headers:{apikey:SB_KEY,Authorization:`Bearer ${SB_KEY}`} });
    for (let i=0; i<patternRows.length; i++) {
      const text = patternRows[i].text.trim(); if (!text) continue;
      let patternId; const ex = await get('pattern', { select:'id', arabic_text:`eq.${text}` });
      if (ex?.length>0) { patternId=ex[0].id; } else { const cr=await post('pattern',{arabic_text:text}); patternId=cr[0]?.id; }
      if (patternId) await post('analysis_pattern', { analysis_id:analysisId, pattern_id:patternId, rank:i+1, certainty:parseInt(patternRows[i].certainty) });
    }
  }

  async function deleteAnalysis() {
    if (!analyses[selectedAnalysisIdx]) return;
    if (!confirm('Delete this analysis?')) return;
    await del('analysis', analyses[selectedAnalysisIdx].id);
    await loadAnalyses(selectedMorpheme.id);
    showStatus('Deleted.', 'info');
  }

  function addNewAnalysis() { isNewAnalysis=true; selectedAnalysisIdx=analyses.length; editMode=true; clearForm(); }
  function showStatus(msg, type) { statusMsg=msg; statusType=type; }
  function removeLemma(i) { lemmaRows=lemmaRows.filter((_,j)=>j!==i); }
  function removePattern(i) { patternRows=patternRows.filter((_,j)=>j!==i); }

  // Read-only display helpers
  function certLabel(c) { return c==1?'Confirmed':c==2?'Probable':'Uncertain'; }
  function rootTypeLabel(id) { return rootList.find(r=>r.id==id)?.root_type||''; }
</script>

<div class="panel">
  {#if !tokenId}
    <div class="empty">انقر على كلمة<br><span>Click a word to analyze</span></div>
  {:else if loading}
    <div class="empty">جاري التحميل...</div>
  {:else}

    <!-- Morpheme tabs -->
    <div class="morpheme-tabs">
      {#each morphemes as m}
        <button class="m-tab" class:active={selectedMorpheme?.id===m.id} onclick={()=>selectMorpheme(m)}>
          {m.morpheme_u}
        </button>
      {/each}
    </div>

    {#if selectedMorpheme}
      <!-- Morpheme info -->
      <div class="m-info">
        <div class="m-arabic">{selectedMorpheme.morpheme_u}</div>
        <div class="m-meta">{selectedMorpheme.morpheme_s||'—'} &nbsp;|&nbsp; Morpheme #{selectedMorpheme.morpheme_pos} &nbsp;|&nbsp; ID: {selectedMorpheme.id}</div>
      </div>

      <!-- Analysis tabs -->
      <div class="a-tabs">
        {#each analyses as a, i}
          <button class="a-tab" class:active={i===selectedAnalysisIdx&&!isNewAnalysis}
            onclick={async()=>{ selectedAnalysisIdx=i; isNewAnalysis=false; editMode=false; await fillForm(a); }}>
            {i+1} · {certLabel(a.certainty)} · {a.pos_code||'?'}
          </button>
        {/each}
        <button class="a-tab new" onclick={addNewAnalysis}>+ New</button>
      </div>

      <!-- Edit toggle bar -->
      {#if !isNewAnalysis}
      <div class="edit-bar">
        {#if !editMode}
          <button class="btn-edit" onclick={()=>editMode=true}>✏️ Edit</button>
        {:else}
          <button class="btn-save" onclick={saveAnalysis}>💾 Save</button>
          <button class="btn-cancel" onclick={()=>{editMode=false; fillForm(analyses[selectedAnalysisIdx]);}}>✕ Cancel</button>
          <button class="btn-del" onclick={deleteAnalysis}>🗑 Delete</button>
        {/if}
      </div>
      {/if}

      {#if isNewAnalysis}
      <div class="edit-bar">
        <button class="btn-save" onclick={saveAnalysis}>💾 Save</button>
        <button class="btn-cancel" onclick={()=>{isNewAnalysis=false; editMode=false; if(analyses.length>0) fillForm(analyses[0]);}}>✕ Cancel</button>
      </div>
      {/if}

      <!-- Form / Display -->
      <div class="form-scroll">

        <!-- Morphological Class -->
        <div class="section-block">
          <div class="field-inline">
            <span class="field-label">Morphological Class</span>
            {#if editMode}
              <select bind:value={fMtype} class="input-sm">
                <option value="">--</option>
                <option>Prefix</option><option>Stem</option><option>Suffix</option>
              </select>
            {:else}
              <span class="field-value">{fMtype||'—'}</span>
            {/if}
          </div>
        </div>

        <div class="sep"></div>

        <!-- Root section -->
        <div class="section-block">
          <div class="section-title">Root</div>
          <div class="field-inline">
            <span class="field-label">Root</span>
            {#if editMode}
              <select class="input-arabic input-grow" value={fRootId} onchange={onRootSelect}>
                <option value="">-- Select Root --</option>
                {#each rootList as r}
                  <option value={r.id}>{r.root_text}{r.root_type ? ' ('+r.root_type+')' : ''}</option>
                {/each}
              </select>
            {:else}
              <span class="field-value arabic">{fRootText||'—'}</span>
            {/if}
          </div>
          {#if fRootId && !editMode}
          <div class="field-inline">
            <span class="field-label">Root Type</span>
            <span class="field-value">{rootTypeLabel(fRootId)||'—'}</span>
          </div>
          {/if}
        </div>

        <div class="sep"></div>

        <!-- Lemmas section -->
        <div class="section-block">
          <div class="section-title">Lemma</div>
          {#each lemmaRows as row, i}
            <div class="sub-row">
              <span class="sub-rank">#{i+1}</span>
              {#if editMode}
                <input class="arabic input-grow" bind:value={row.text} placeholder="لَمَّا">
                <select bind:value={row.certainty} class="input-cert">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
                <button class="btn-remove" onclick={()=>removeLemma(i)}>✕</button>
              {:else}
                <span class="field-value arabic">{row.text||'—'}</span>
                <span class="cert-badge">{certLabel(row.certainty)}</span>
              {/if}
            </div>
          {/each}
          {#if lemmaRows.length === 0 && !editMode}
            <span class="field-value muted">None</span>
          {/if}
          {#if editMode}
            <button class="btn-add" onclick={()=>lemmaRows=[...lemmaRows,{text:'',certainty:1}]}>+ Lemma</button>
          {/if}
        </div>

        <div class="sep"></div>

        <!-- Patterns section -->
        <div class="section-block">
          <div class="section-title">Pattern</div>
          {#each patternRows as row, i}
            <div class="sub-row">
              <span class="sub-rank">#{i+1}</span>
              {#if editMode}
                <input class="arabic input-grow" bind:value={row.text} placeholder="فَعَلَ">
                <select bind:value={row.certainty} class="input-cert">
                  <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
                </select>
                <button class="btn-remove" onclick={()=>removePattern(i)}>✕</button>
              {:else}
                <span class="field-value arabic">{row.text||'—'}</span>
                <span class="cert-badge">{certLabel(row.certainty)}</span>
              {/if}
            </div>
          {/each}
          {#if patternRows.length === 0 && !editMode}
            <span class="field-value muted">None</span>
          {/if}
          {#if editMode}
            <button class="btn-add" onclick={()=>patternRows=[...patternRows,{text:'',certainty:1}]}>+ Pattern</button>
          {/if}
        </div>

        <div class="sep"></div>

        <!-- Part of Speech section -->
        <div class="section-block">
          <div class="section-title">Part of Speech</div>

          <!-- POS selector -->
          <div class="field-inline">
            <span class="field-label">POS</span>
            {#if editMode}
              <select bind:value={fPos} class="input-grow">
                <option value="">-- POS --</option>
                {#each Object.entries(posGroups) as [group, items]}
                  <optgroup label={group}>
                    {#each items as p}
                      <option value={p.code}>{p.code} — {p.arabic}</option>
                    {/each}
                  </optgroup>
                {/each}
              </select>
            {:else}
              <span class="field-value">
                {#if selectedPos}
                  <strong>{selectedPos.code}</strong> — <span class="arabic">{selectedPos.arabic}</span>
                  {#if selectedPos.meaning}<em class="muted">({selectedPos.meaning})</em>{/if}
                {:else}—{/if}
              </span>
            {/if}
          </div>

          <!-- VERBAL fields -->
          {#if isVerbal}
            <div class="field-row-group">
              <div class="field-inline">
                <span class="field-label">Verb Form</span>
                {#if editMode}
                  <select bind:value={fVform} class="input-sm">
                    <option value="">--</option>
                    {#each [1,2,3,4,5,6,7,8,9,10,11,12] as n}<option value={n}>Form {n}</option>{/each}
                  </select>
                {:else}
                  <span class="field-value">{fVform ? 'Form '+fVform : '—'}</span>
                {/if}
              </div>
              {#if fVform==1}
              <div class="field-inline">
                <span class="field-label">F1 Type</span>
                {#if editMode}
                  <select bind:value={fF1type} class="input-sm">
                    <option value="">--</option>
                    {#each ['aa','ai','au','ia','ii','iu','ua','ui','uu','??'] as t}<option value={t}>{t}</option>{/each}
                  </select>
                {:else}
                  <span class="field-value">{fF1type||'—'}</span>
                {/if}
              </div>
              {/if}
              <div class="field-inline">
                <span class="field-label">Aspect</span>
                {#if editMode}
                  <select bind:value={fAspect} class="input-sm">
                    <option value="">--</option>
                    <option value="PERF">PERF</option><option value="IMPF">IMPF</option>
                  </select>
                {:else}
                  <span class="field-value">{fAspect||'—'}</span>
                {/if}
              </div>
              {#if fAspect==='IMPF'}
              <div class="field-inline">
                <span class="field-label">Mood</span>
                {#if editMode}
                  <select bind:value={fMood} class="input-sm">
                    <option value="">--</option>
                    <option value="IND">IND</option><option value="SUBJ">SUBJ</option>
                    <option value="JUS">JUS</option><option value="IMPV">IMPV</option><option value="ENRG">ENRG</option>
                  </select>
                {:else}
                  <span class="field-value">{fMood||'—'}</span>
                {/if}
              </div>
              {/if}
              <div class="field-inline">
                <span class="field-label">Voice</span>
                {#if editMode}
                  <select bind:value={fVoice} class="input-sm">
                    <option value="">--</option>
                    <option value="ACT">ACT</option><option value="PASS">PASS</option>
                  </select>
                {:else}
                  <span class="field-value">{fVoice||'—'}</span>
                {/if}
              </div>
            </div>
          {/if}

          <!-- NOMINAL: Noun or PN -->
          {#if isNominal && isNounOrPN}
            <div class="field-row-group">
              <div class="field-inline">
                <span class="field-label">Noun Type</span>
                {#if editMode}
                  <select bind:value={fNtype} class="input-sm">
                    <option value="">--</option>
                    <option value="VN">VN</option><option value="AP">AP</option><option value="PP">PP</option>
                  </select>
                {:else}
                  <span class="field-value">{fNtype||'—'}</span>
                {/if}
              </div>
              <div class="field-inline">
                <span class="field-label">Verb Form</span>
                {#if editMode}
                  <select bind:value={fVform} class="input-sm">
                    <option value="">--</option>
                    {#each [1,2,3,4,5,6,7,8,9,10,11,12] as n}<option value={n}>Form {n}</option>{/each}
                  </select>
                {:else}
                  <span class="field-value">{fVform ? 'Form '+fVform : '—'}</span>
                {/if}
              </div>
              <div class="field-inline">
                <span class="field-label">Definiteness</span>
                {#if editMode}
                  <select bind:value={fDef} class="input-sm">
                    <option value="">--</option>
                    <option value="DEF">DEF</option><option value="INDEF">INDEF</option>
                  </select>
                {:else}
                  <span class="field-value">{fDef||'—'}</span>
                {/if}
              </div>
              <div class="field-inline">
                <span class="field-label">Case</span>
                {#if editMode}
                  <select bind:value={fCase} class="input-sm">
                    <option value="">--</option>
                    <option value="NOM">NOM</option><option value="ACC">ACC</option><option value="GEN">GEN</option>
                  </select>
                {:else}
                  <span class="field-value">{fCase||'—'}</span>
                {/if}
              </div>
            </div>
          {/if}

          <!-- NOMINAL: other (not Noun/PN) — just Case -->
          {#if isNominal && !isNounOrPN}
            <div class="field-row-group">
              <div class="field-inline">
                <span class="field-label">Case</span>
                {#if editMode}
                  <select bind:value={fCase} class="input-sm">
                    <option value="">--</option>
                    <option value="NOM">NOM</option><option value="ACC">ACC</option><option value="GEN">GEN</option>
                  </select>
                {:else}
                  <span class="field-value">{fCase||'—'}</span>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Person / Gender / Number — for Verbal and Nominal -->
          {#if isVerbal || isNominal}
            <div class="field-row-3">
              <div class="field-inline">
                <span class="field-label">Person</span>
                {#if editMode}
                  <select bind:value={fPerson} class="input-sm">
                    <option value="">--</option>
                    <option value={1}>1st</option><option value={2}>2nd</option><option value={3}>3rd</option>
                  </select>
                {:else}
                  <span class="field-value">{fPerson ? fPerson+'P' : '—'}</span>
                {/if}
              </div>
              <div class="field-inline">
                <span class="field-label">Gender</span>
                {#if editMode}
                  <select bind:value={fGender} class="input-sm">
                    <option value="">--</option>
                    <option value="M">M</option><option value="F">F</option>
                  </select>
                {:else}
                  <span class="field-value">{fGender||'—'}</span>
                {/if}
              </div>
              <div class="field-inline">
                <span class="field-label">Number</span>
                {#if editMode}
                  <select bind:value={fNumber} class="input-sm">
                    <option value="">--</option>
                    <option value="S">S</option><option value="D">D</option><option value="P">P</option>
                  </select>
                {:else}
                  <span class="field-value">{fNumber||'—'}</span>
                {/if}
              </div>
            </div>
          {/if}
        </div>

        <!-- Notes -->
        {#if editMode}
        <div class="sep"></div>
        <div class="section-block">
          <div class="section-title">Notes</div>
          <textarea bind:value={fNotes} rows="2" class="textarea-notes"></textarea>
        </div>
        {:else if fNotes}
        <div class="sep"></div>
        <div class="section-block">
          <div class="section-title">Notes</div>
          <span class="field-value">{fNotes}</span>
        </div>
        {/if}

      </div><!-- end form-scroll -->

      {#if isNewAnalysis}
        <div class="edit-bar bottom">
          <button class="btn-save" onclick={saveAnalysis}>💾 Save</button>
          <button class="btn-cancel" onclick={()=>{isNewAnalysis=false; editMode=false; if(analyses.length>0) fillForm(analyses[0]);}}>✕ Cancel</button>
        </div>
      {:else if editMode}
        <div class="edit-bar bottom">
          <button class="btn-save" onclick={saveAnalysis}>💾 Save</button>
          <button class="btn-cancel" onclick={()=>{editMode=false; fillForm(analyses[selectedAnalysisIdx]);}}>✕ Cancel</button>
          <button class="btn-del" onclick={deleteAnalysis}>🗑 Delete</button>
        </div>
      {/if}

      {#if statusMsg}
        <div class="status {statusType}">{statusMsg}</div>
      {/if}
    {/if}
  {/if}
</div>

<style>
.panel{display:flex;flex-direction:column;height:100%;background:white;border-left:1px solid #ddd;overflow:hidden;}
.empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#bbb;font-size:16px;text-align:center;gap:8px;font-family:'Traditional Arabic',Arial,sans-serif;}
.empty span{font-size:13px;font-family:Arial;}

/* Morpheme tabs */
.morpheme-tabs{display:flex;border-bottom:1px solid #eee;overflow-x:auto;flex-shrink:0;}
.m-tab{padding:10px 16px;border:none;background:none;cursor:pointer;font-size:20px;font-family:'Traditional Arabic',Arial,sans-serif;border-bottom:3px solid transparent;color:#555;direction:rtl;white-space:nowrap;}
.m-tab:hover{background:#f5f5f5;}.m-tab.active{border-bottom-color:#1a472a;color:#1a472a;}

/* Morpheme info */
.m-info{padding:10px 14px;background:#f9f9f9;border-bottom:1px solid #eee;flex-shrink:0;}
.m-arabic{font-size:26px;font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;color:#1a472a;}
.m-meta{font-size:12px;color:#888;margin-top:2px;direction:ltr;}

/* Analysis tabs */
.a-tabs{display:flex;gap:4px;padding:8px 12px;border-bottom:1px solid #eee;flex-wrap:wrap;flex-shrink:0;}
.a-tab{padding:4px 10px;border:1px solid #ddd;border-radius:4px;background:white;cursor:pointer;font-size:12px;}
.a-tab.active{background:#1a472a;color:white;border-color:#1a472a;}
.a-tab.new{background:#2980b9;color:white;border-color:#2980b9;}

/* Edit bar */
.edit-bar{display:flex;gap:8px;padding:8px 12px;background:#f9f9f9;border-bottom:1px solid #eee;flex-shrink:0;align-items:center;}
.edit-bar.bottom{border-top:1px solid #eee;border-bottom:none;margin-top:auto;}
.btn-edit{background:#1a472a;color:white;border:none;border-radius:4px;padding:6px 16px;cursor:pointer;font-size:13px;}
.btn-save{background:#1a472a;color:white;border:none;border-radius:4px;padding:6px 16px;cursor:pointer;font-size:13px;font-weight:bold;}
.btn-cancel{background:#888;color:white;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:13px;}
.btn-del{background:#e74c3c;color:white;border:none;border-radius:4px;padding:6px 12px;cursor:pointer;font-size:13px;margin-left:auto;}

/* Form scroll area */
.form-scroll{flex:1;overflow-y:auto;padding:0;}

/* Section blocks */
.section-block{padding:10px 14px;}
.section-title{font-size:11px;font-weight:bold;color:#1a472a;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;}
.sep{height:1px;background:#eee;margin:0;}

/* Field inline (label + value/input) */
.field-inline{display:flex;align-items:center;gap:8px;margin-bottom:6px;}
.field-label{font-size:11px;color:#888;min-width:90px;flex-shrink:0;}
.field-value{font-size:14px;color:#222;}
.field-value.arabic{font-family:'Traditional Arabic',Arial,sans-serif;font-size:18px;direction:rtl;}
.muted{color:#aaa;font-size:12px;}

/* Row groups */
.field-row-group{display:flex;flex-direction:column;gap:4px;}
.field-row-3{display:flex;gap:8px;margin-top:4px;}
.field-row-3 .field-inline{flex:1;flex-direction:column;align-items:flex-start;gap:2px;}
.field-row-3 .field-label{min-width:unset;}

/* Inputs */
.input-sm{border:1px solid #ddd;border-radius:4px;padding:4px 6px;font-size:13px;font-family:Arial,sans-serif;}
.input-grow{flex:1;border:1px solid #ddd;border-radius:4px;padding:4px 6px;font-size:13px;font-family:Arial,sans-serif;}
.input-arabic{font-family:'Traditional Arabic',Arial,sans-serif;font-size:16px;direction:rtl;}
.input-cert{width:45px;border:1px solid #ddd;border-radius:4px;padding:4px 4px;font-size:12px;}
.textarea-notes{width:100%;border:1px solid #ddd;border-radius:4px;padding:6px;font-size:13px;direction:rtl;resize:vertical;}

/* Sub rows (lemma/pattern) */
.sub-row{display:flex;align-items:center;gap:6px;margin-bottom:5px;padding:5px 8px;background:#f9f9f9;border:1px solid #eee;border-radius:4px;}
.sub-rank{font-size:11px;color:#aaa;min-width:20px;}
.cert-badge{font-size:11px;color:#888;background:#eee;padding:2px 6px;border-radius:10px;}
.btn-remove{background:#e74c3c;color:white;border:none;border-radius:3px;padding:2px 6px;cursor:pointer;font-size:11px;}
.btn-add{background:#2980b9;color:white;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:12px;margin-top:4px;}

/* Arabic class */
.arabic{font-family:'Traditional Arabic',Arial,sans-serif;direction:rtl;}

/* Status */
.status{padding:8px 14px;font-size:12px;flex-shrink:0;}
.status.success{background:#d4edda;color:#155724;}
.status.error{background:#f8d7da;color:#721c24;}
.status.info{background:#d1ecf1;color:#0c5460;}
</style>
