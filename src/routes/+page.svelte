<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import AnalysisPanel from '$lib/AnalysisPanel.svelte';

  // Surah data: [number, arabic name, english name, verse count]
  const surahs = [
    [1,'الفاتحة','Al-Fatihah',7],[2,'البقرة','Al-Baqarah',286],[3,'آل عمران','Ali \'Imran',200],
    [4,'النساء','An-Nisa',176],[5,'المائدة','Al-Ma\'idah',120],[6,'الأنعام','Al-An\'am',165],
    [7,'الأعراف','Al-A\'raf',206],[8,'الأنفال','Al-Anfal',75],[9,'التوبة','At-Tawbah',129],
    [10,'يونس','Yunus',109],[11,'هود','Hud',123],[12,'يوسف','Yusuf',111],
    [13,'الرعد','Ar-Ra\'d',43],[14,'إبراهيم','Ibrahim',52],[15,'الحجر','Al-Hijr',99],
    [16,'النحل','An-Nahl',128],[17,'الإسراء','Al-Isra',111],[18,'الكهف','Al-Kahf',110],
    [19,'مريم','Maryam',98],[20,'طه','Ta-Ha',135],[21,'الأنبياء','Al-Anbiya',112],
    [22,'الحج','Al-Hajj',78],[23,'المؤمنون','Al-Mu\'minun',118],[24,'النور','An-Nur',64],
    [25,'الفرقان','Al-Furqan',77],[26,'الشعراء','Ash-Shu\'ara',227],[27,'النمل','An-Naml',93],
    [28,'القصص','Al-Qasas',88],[29,'العنكبوت','Al-\'Ankabut',69],[30,'الروم','Ar-Rum',60],
    [31,'لقمان','Luqman',34],[32,'السجدة','As-Sajdah',30],[33,'الأحزاب','Al-Ahzab',73],
    [34,'سبأ','Saba\'',54],[35,'فاطر','Fatir',45],[36,'يس','Ya-Sin',83],
    [37,'الصافات','As-Saffat',182],[38,'ص','Sad',88],[39,'الزمر','Az-Zumar',75],
    [40,'غافر','Ghafir',85],[41,'فصلت','Fussilat',54],[42,'الشورى','Ash-Shura',53],
    [43,'الزخرف','Az-Zukhruf',89],[44,'الدخان','Ad-Dukhan',59],[45,'الجاثية','Al-Jathiyah',37],
    [46,'الأحقاف','Al-Ahqaf',35],[47,'محمد','Muhammad',38],[48,'الفتح','Al-Fath',29],
    [49,'الحجرات','Al-Hujurat',18],[50,'ق','Qaf',45],[51,'الذاريات','Adh-Dhariyat',60],
    [52,'الطور','At-Tur',49],[53,'النجم','An-Najm',62],[54,'القمر','Al-Qamar',55],
    [55,'الرحمن','Ar-Rahman',78],[56,'الواقعة','Al-Waqi\'ah',96],[57,'الحديد','Al-Hadid',29],
    [58,'المجادلة','Al-Mujadila',22],[59,'الحشر','Al-Hashr',24],[60,'الممتحنة','Al-Mumtahanah',13],
    [61,'الصف','As-Saf',14],[62,'الجمعة','Al-Jumu\'ah',11],[63,'المنافقون','Al-Munafiqun',11],
    [64,'التغابن','At-Taghabun',18],[65,'الطلاق','At-Talaq',12],[66,'التحريم','At-Tahrim',12],
    [67,'الملك','Al-Mulk',30],[68,'القلم','Al-Qalam',52],[69,'الحاقة','Al-Haqqah',52],
    [70,'المعارج','Al-Ma\'arij',44],[71,'نوح','Nuh',28],[72,'الجن','Al-Jinn',28],
    [73,'المزمل','Al-Muzzammil',20],[74,'المدثر','Al-Muddaththir',56],[75,'القيامة','Al-Qiyamah',40],
    [76,'الإنسان','Al-Insan',31],[77,'المرسلات','Al-Mursalat',50],[78,'النبأ','An-Naba\'',40],
    [79,'النازعات','An-Nazi\'at',46],[80,'عبس','Abasa',42],[81,'التكوير','At-Takwir',29],
    [82,'الانفطار','Al-Infitar',19],[83,'المطففين','Al-Mutaffifin',36],[84,'الانشقاق','Al-Inshiqaq',25],
    [85,'البروج','Al-Buruj',22],[86,'الطارق','At-Tariq',17],[87,'الأعلى','Al-A\'la',19],
    [88,'الغاشية','Al-Ghashiyah',26],[89,'الفجر','Al-Fajr',30],[90,'البلد','Al-Balad',20],
    [91,'الشمس','Ash-Shams',15],[92,'الليل','Al-Layl',21],[93,'الضحى','Ad-Duha',11],
    [94,'الشرح','Ash-Sharh',8],[95,'التين','At-Tin',8],[96,'العلق','Al-\'Alaq',19],
    [97,'القدر','Al-Qadr',5],[98,'البينة','Al-Bayyinah',8],[99,'الزلزلة','Az-Zalzalah',8],
    [100,'العاديات','Al-\'Adiyat',11],[101,'القارعة','Al-Qari\'ah',11],[102,'التكاثر','At-Takathur',8],
    [103,'العصر','Al-\'Asr',3],[104,'الهمزة','Al-Humazah',9],[105,'الفيل','Al-Fil',5],
    [106,'قريش','Quraysh',4],[107,'الماعون','Al-Ma\'un',7],[108,'الكوثر','Al-Kawthar',3],
    [109,'الكافرون','Al-Kafirun',6],[110,'النصر','An-Nasr',3],[111,'المسد','Al-Masad',5],
    [112,'الإخلاص','Al-Ikhlas',4],[113,'الفلق','Al-Falaq',5],[114,'الناس','An-Nas',6]
  ];

  let selectedSurah = 1;
  let selectedAya = 1;
  let verses = [];
  let loading = false;
  let selectedMorpheme = null;
  let tokens = [];

  $: ayaCount = surahs.find(s => s[0] === selectedSurah)?.[3] ?? 7;
  $: ayaOptions = Array.from({length: ayaCount}, (_, i) => i + 1);
  $: if (selectedAya > ayaCount) selectedAya = 1;

  onMount(() => loadSurah());

  async function loadSurah() {
    loading = true;
    selectedMorpheme = null;
    tokens = [];

    const { data, error } = await supabase
      .from('morpheme')
      .select('*')
      .eq('surah', selectedSurah)
      .order('verse').order('token').order('morpheme_pos');

    loading = false;
    if (error) { console.error(error); return; }

    // Group into verses
    const verseMap = {};
    for (const m of data) {
      if (!verseMap[m.verse]) verseMap[m.verse] = {};
      if (!verseMap[m.verse][m.token]) verseMap[m.verse][m.token] = [];
      verseMap[m.verse][m.token].push(m);
    }

    verses = Object.entries(verseMap)
      .sort((a,b) => +a[0] - +b[0])
      .map(([v, toks]) => ({
        verse: +v,
        tokens: Object.entries(toks)
          .sort((a,b) => +a[0] - +b[0])
          .map(([t, morphemes]) => ({ token: +t, morphemes }))
      }));
  }

  function onSurahChange() {
    selectedAya = 1;
    loadSurah();
  }

  function scrollToAya(aya) {
    selectedAya = aya;
    const el = document.getElementById(`verse-${aya}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function selectMorpheme(m) {
    selectedMorpheme = m;
    tokens = verses.find(v => v.verse === m.verse)?.tokens ?? [];
  }

  const surahName = (n) => {
    const s = surahs.find(x => x[0] === n);
    return s ? `${n}. ${s[1]} — ${s[2]}` : '';
  };
</script>

<div class="page">
  <!-- Left: Analysis Panel -->
  <div class="panel-left">
    <div class="panel-header">التحليل الصرفي</div>
    {#if selectedMorpheme}
      <AnalysisPanel morpheme={selectedMorpheme} {tokens} />
    {:else}
      <div class="empty-hint">انقر على كلمة — Click a word to analyze</div>
    {/if}
  </div>

  <!-- Right: Quran Text -->
  <div class="panel-right">
    <!-- Nav bar -->
    <div class="nav-bar">
      <div class="nav-controls">
        <label>
          سورة
          <select bind:value={selectedSurah} on:change={onSurahChange}>
            {#each surahs as s}
              <option value={s[0]}>{s[0]}. {s[1]} — {s[2]}</option>
            {/each}
          </select>
        </label>
        <label>
          آية
          <select bind:value={selectedAya} on:change={() => scrollToAya(selectedAya)}>
            {#each ayaOptions as a}
              <option value={a}>{a}</option>
            {/each}
          </select>
        </label>
      </div>
      <div class="surah-title">القرآن الكريم</div>
    </div>

    <!-- Verses -->
    <div class="quran-content">
      {#if loading}
        <div class="loading">جار التحميل...</div>
      {:else}
        {#each verses as v}
          <div class="verse" id="verse-{v.verse}">
            <div class="verse-text">
              {#each v.tokens as tok}
                <span class="token">
                  {#each tok.morphemes as m}
                    <span
                      class="morpheme"
                      class:selected={selectedMorpheme?.id === m.id}
                      on:click={() => selectMorpheme(m)}
                      role="button"
                      tabindex="0"
                      on:keydown={(e) => e.key === 'Enter' && selectMorpheme(m)}
                    >{m.morpheme_u}</span>
                  {/each}
                </span>
              {/each}
              <span class="verse-num">﴿{v.verse}﴾</span>
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .page {
    display: flex;
    height: calc(100vh - 48px);
    overflow: hidden;
  }

  .panel-left {
    width: 340px;
    min-width: 280px;
    border-left: 1px solid #ddd;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    order: 1;
  }

  .panel-header {
    background: #1a472a;
    color: white;
    padding: 10px 16px;
    font-size: 14px;
    text-align: right;
    direction: rtl;
  }

  .empty-hint {
    padding: 40px 20px;
    text-align: center;
    color: #aaa;
    font-size: 14px;
  }

  .panel-right {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    order: 2;
  }

  .nav-bar {
    background: white;
    border-bottom: 1px solid #ddd;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    direction: rtl;
    gap: 12px;
    flex-wrap: wrap;
  }

  .nav-controls {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .nav-controls label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #555;
    direction: rtl;
  }

  .nav-controls select {
    border: 1px solid #ccc;
    border-radius: 4px;
    padding: 5px 8px;
    font-size: 14px;
    direction: rtl;
  }

  .nav-controls select:first-of-type {
    width: 220px;
  }

  .nav-controls select:last-of-type {
    width: 70px;
  }

  .surah-title {
    font-size: 16px;
    color: #c9a84c;
    font-weight: bold;
  }

  .quran-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    direction: rtl;
    text-align: right;
  }

  .verse {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
  }

  .verse-text {
    font-size: 22px;
    line-height: 2.2;
    direction: rtl;
    font-family: 'Traditional Arabic', 'Scheherazade New', 'Amiri', serif;
  }

  .token {
    display: inline;
    margin: 0 1px;
  }

  .morpheme {
    cursor: pointer;
    padding: 2px 1px;
    border-radius: 3px;
    transition: background 0.15s;
  }

  .morpheme:hover {
    background: #e8f5e9;
  }

  .morpheme.selected {
    background: #1a472a;
    color: white;
  }

  .verse-num {
    font-size: 16px;
    color: #1a472a;
    margin-right: 6px;
    font-family: 'Traditional Arabic', serif;
  }

  .loading {
    padding: 40px;
    text-align: center;
    color: #888;
    font-size: 18px;
  }
</style>
