<script>
  import { onMount } from 'svelte';
  import { fetchAll } from '$lib/supabase.js';
  import AnalysisPanel from '$lib/AnalysisPanel.svelte';

  const surahs = [
    { num: 1,   ar: 'الفاتحة',       en: 'The Opening',          verses: 7   },
    { num: 2,   ar: 'البقرة',        en: 'The Cow',              verses: 286 },
    { num: 3,   ar: 'آل عمران',      en: 'Family of Imran',      verses: 200 },
    { num: 4,   ar: 'النساء',        en: 'The Women',            verses: 176 },
    { num: 5,   ar: 'المائدة',       en: 'The Table',            verses: 120 },
    { num: 6,   ar: 'الأنعام',       en: 'The Cattle',           verses: 165 },
    { num: 7,   ar: 'الأعراف',       en: 'The Heights',          verses: 206 },
    { num: 8,   ar: 'الأنفال',       en: 'The Spoils',           verses: 75  },
    { num: 9,   ar: 'التوبة',        en: 'The Repentance',       verses: 129 },
    { num: 10,  ar: 'يونس',          en: 'Jonah',                verses: 109 },
    { num: 11,  ar: 'هود',           en: 'Hud',                  verses: 123 },
    { num: 12,  ar: 'يوسف',          en: 'Joseph',               verses: 111 },
    { num: 13,  ar: 'الرعد',         en: 'The Thunder',          verses: 43  },
    { num: 14,  ar: 'إبراهيم',       en: 'Abraham',              verses: 52  },
    { num: 15,  ar: 'الحجر',         en: 'The Rocky Tract',      verses: 99  },
    { num: 16,  ar: 'النحل',         en: 'The Bee',              verses: 128 },
    { num: 17,  ar: 'الإسراء',       en: 'The Night Journey',    verses: 111 },
    { num: 18,  ar: 'الكهف',         en: 'The Cave',             verses: 110 },
    { num: 19,  ar: 'مريم',          en: 'Mary',                 verses: 98  },
    { num: 20,  ar: 'طه',            en: 'Ta-Ha',                verses: 135 },
    { num: 21,  ar: 'الأنبياء',      en: 'The Prophets',         verses: 112 },
    { num: 22,  ar: 'الحج',          en: 'The Pilgrimage',       verses: 78  },
    { num: 23,  ar: 'المؤمنون',      en: 'The Believers',        verses: 118 },
    { num: 24,  ar: 'النور',         en: 'The Light',            verses: 64  },
    { num: 25,  ar: 'الفرقان',       en: 'The Criterion',        verses: 77  },
    { num: 26,  ar: 'الشعراء',       en: 'The Poets',            verses: 227 },
    { num: 27,  ar: 'النمل',         en: 'The Ant',              verses: 93  },
    { num: 28,  ar: 'القصص',         en: 'The Stories',          verses: 88  },
    { num: 29,  ar: 'العنكبوت',      en: 'The Spider',           verses: 69  },
    { num: 30,  ar: 'الروم',         en: 'The Romans',           verses: 60  },
    { num: 31,  ar: 'لقمان',         en: 'Luqman',               verses: 34  },
    { num: 32,  ar: 'السجدة',        en: 'The Prostration',      verses: 30  },
    { num: 33,  ar: 'الأحزاب',       en: 'The Confederates',     verses: 73  },
    { num: 34,  ar: 'سبأ',           en: 'Sheba',                verses: 54  },
    { num: 35,  ar: 'فاطر',          en: 'The Originator',       verses: 45  },
    { num: 36,  ar: 'يس',            en: 'Ya-Sin',               verses: 83  },
    { num: 37,  ar: 'الصافات',       en: 'Those Ranged in Ranks',verses: 182 },
    { num: 38,  ar: 'ص',             en: 'Sad',                  verses: 88  },
    { num: 39,  ar: 'الزمر',         en: 'The Groups',           verses: 75  },
    { num: 40,  ar: 'غافر',          en: 'The Forgiver',         verses: 85  },
    { num: 41,  ar: 'فصلت',          en: 'Explained in Detail',  verses: 54  },
    { num: 42,  ar: 'الشورى',        en: 'The Consultation',     verses: 53  },
    { num: 43,  ar: 'الزخرف',        en: 'The Gold Adornments',  verses: 89  },
    { num: 44,  ar: 'الدخان',        en: 'The Smoke',            verses: 59  },
    { num: 45,  ar: 'الجاثية',       en: 'The Crouching',        verses: 37  },
    { num: 46,  ar: 'الأحقاف',       en: 'The Wind-Curved Dunes',verses: 35  },
    { num: 47,  ar: 'محمد',          en: 'Muhammad',             verses: 38  },
    { num: 48,  ar: 'الفتح',         en: 'The Victory',          verses: 29  },
    { num: 49,  ar: 'الحجرات',       en: 'The Rooms',            verses: 18  },
    { num: 50,  ar: 'ق',             en: 'Qaf',                  verses: 45  },
    { num: 51,  ar: 'الذاريات',      en: 'The Winnowing Winds',  verses: 60  },
    { num: 52,  ar: 'الطور',         en: 'The Mount',            verses: 49  },
    { num: 53,  ar: 'النجم',         en: 'The Star',             verses: 62  },
    { num: 54,  ar: 'القمر',         en: 'The Moon',             verses: 55  },
    { num: 55,  ar: 'الرحمن',        en: 'The Beneficent',       verses: 78  },
    { num: 56,  ar: 'الواقعة',       en: 'The Inevitable',       verses: 96  },
    { num: 57,  ar: 'الحديد',        en: 'The Iron',             verses: 29  },
    { num: 58,  ar: 'المجادلة',      en: 'The Pleading Woman',   verses: 22  },
    { num: 59,  ar: 'الحشر',         en: 'The Exile',            verses: 24  },
    { num: 60,  ar: 'الممتحنة',      en: 'She that is Examined', verses: 13  },
    { num: 61,  ar: 'الصف',          en: 'The Ranks',            verses: 14  },
    { num: 62,  ar: 'الجمعة',        en: 'Friday',               verses: 11  },
    { num: 63,  ar: 'المنافقون',     en: 'The Hypocrites',       verses: 11  },
    { num: 64,  ar: 'التغابن',       en: 'Mutual Disillusion',   verses: 18  },
    { num: 65,  ar: 'الطلاق',        en: 'Divorce',              verses: 12  },
    { num: 66,  ar: 'التحريم',       en: 'The Prohibition',      verses: 12  },
    { num: 67,  ar: 'الملك',         en: 'The Sovereignty',      verses: 30  },
    { num: 68,  ar: 'القلم',         en: 'The Pen',              verses: 52  },
    { num: 69,  ar: 'الحاقة',        en: 'The Reality',          verses: 52  },
    { num: 70,  ar: 'المعارج',       en: 'The Ascending Stairways',verses: 44},
    { num: 71,  ar: 'نوح',           en: 'Noah',                 verses: 28  },
    { num: 72,  ar: 'الجن',          en: 'The Jinn',             verses: 28  },
    { num: 73,  ar: 'المزمل',        en: 'The Enshrouded One',   verses: 20  },
    { num: 74,  ar: 'المدثر',        en: 'The Cloaked One',      verses: 56  },
    { num: 75,  ar: 'القيامة',       en: 'The Resurrection',     verses: 40  },
    { num: 76,  ar: 'الإنسان',       en: 'Man',                  verses: 31  },
    { num: 77,  ar: 'المرسلات',      en: 'The Emissaries',       verses: 50  },
    { num: 78,  ar: 'النبأ',         en: 'The Tidings',          verses: 40  },
    { num: 79,  ar: 'النازعات',      en: 'Those Who Drag Forth', verses: 46  },
    { num: 80,  ar: 'عبس',           en: 'He Frowned',           verses: 42  },
    { num: 81,  ar: 'التكوير',       en: 'The Overthrowing',     verses: 29  },
    { num: 82,  ar: 'الانفطار',      en: 'The Cleaving',         verses: 19  },
    { num: 83,  ar: 'المطففين',      en: 'The Defrauding',       verses: 36  },
    { num: 84,  ar: 'الانشقاق',      en: 'The Sundering',        verses: 25  },
    { num: 85,  ar: 'البروج',        en: 'The Constellations',   verses: 22  },
    { num: 86,  ar: 'الطارق',        en: 'The Morning Star',     verses: 17  },
    { num: 87,  ar: 'الأعلى',        en: 'The Most High',        verses: 19  },
    { num: 88,  ar: 'الغاشية',       en: 'The Overwhelming',     verses: 26  },
    { num: 89,  ar: 'الفجر',         en: 'The Dawn',             verses: 30  },
    { num: 90,  ar: 'البلد',         en: 'The City',             verses: 20  },
    { num: 91,  ar: 'الشمس',         en: 'The Sun',              verses: 15  },
    { num: 92,  ar: 'الليل',         en: 'The Night',            verses: 21  },
    { num: 93,  ar: 'الضحى',         en: 'The Morning Hours',    verses: 11  },
    { num: 94,  ar: 'الشرح',         en: 'The Relief',           verses: 8   },
    { num: 95,  ar: 'التين',         en: 'The Fig',              verses: 8   },
    { num: 96,  ar: 'العلق',         en: 'The Clot',             verses: 19  },
    { num: 97,  ar: 'القدر',         en: 'The Power',            verses: 5   },
    { num: 98,  ar: 'البينة',        en: 'The Evidence',         verses: 8   },
    { num: 99,  ar: 'الزلزلة',       en: 'The Earthquake',       verses: 8   },
    { num: 100, ar: 'العاديات',      en: 'The Courser',          verses: 11  },
    { num: 101, ar: 'القارعة',       en: 'The Calamity',         verses: 11  },
    { num: 102, ar: 'التكاثر',       en: 'The Rivalry in Worldly Increase', verses: 8 },
    { num: 103, ar: 'العصر',         en: 'The Declining Day',    verses: 3   },
    { num: 104, ar: 'الهمزة',        en: 'The Traducer',         verses: 9   },
    { num: 105, ar: 'الفيل',         en: 'The Elephant',         verses: 5   },
    { num: 106, ar: 'قريش',          en: 'Quraysh',              verses: 4   },
    { num: 107, ar: 'الماعون',       en: 'The Small Kindnesses', verses: 7   },
    { num: 108, ar: 'الكوثر',        en: 'Abundance',            verses: 3   },
    { num: 109, ar: 'الكافرون',      en: 'The Disbelievers',     verses: 6   },
    { num: 110, ar: 'النصر',         en: 'The Divine Support',   verses: 3   },
    { num: 111, ar: 'المسد',         en: 'The Palm Fiber',       verses: 5   },
    { num: 112, ar: 'الإخلاص',       en: 'Sincerity',            verses: 4   },
    { num: 113, ar: 'الفلق',         en: 'The Daybreak',         verses: 5   },
    { num: 114, ar: 'الناس',         en: 'Mankind',              verses: 6   },
  ];

  let selectedSurah = 1;
  let selectedAya = 1;
  let verses = [];
  let loading = false;
  let error = null;
  let selectedMorpheme = null;

  $: ayaOptions = Array.from(
    { length: surahs.find(s => s.num === selectedSurah)?.verses ?? 7 },
    (_, i) => i + 1
  );

  $: if (selectedSurah) {
    selectedAya = 1;
    loadVerses();
  }

  async function loadVerses() {
    loading = true;
    error = null;
    selectedMorpheme = null;
    try {
      // Query verse table filtered by surah, join down to morphemes
      // verse → token → morpheme
      const data = await fetchAll('verse', {
        select: 'verse,token(token_pos,text_uthmani,morpheme(id,morpheme_pos,morpheme_u,morpheme_s,max_morphemes))',
        surah: `eq.${selectedSurah}`,
        order: 'verse'
      });
      verses = buildVerses(data);
    } catch (e) {
      error = e.message;
      console.error(e);
    } finally {
      loading = false;
    }
  }

  function buildVerses(data) {
    // data is array of verse rows, each with nested token array, each token with nested morpheme array
    return data.map(v => ({
      verse: v.verse,
      tokens: (v.token || [])
        .sort((a, b) => a.token_pos - b.token_pos)
        .map(t => ({
          token_pos: t.token_pos,
          text: t.text_uthmani,
          morphemes: (t.morpheme || []).sort((a, b) => a.morpheme_pos - b.morpheme_pos)
        }))
    }));
  }

  function selectMorpheme(m) {
    selectedMorpheme = m;
  }

  function scrollToAya(aya) {
    selectedAya = aya;
    const el = document.getElementById(`verse-${aya}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  onMount(() => {
    loadVerses();
  });
</script>

<div class="browse-container">
  <!-- Navigation Bar -->
  <div class="nav-bar">
    <div class="nav-selects">
      <label>
        Sura
        <select bind:value={selectedSurah}>
          {#each surahs as s}
            <option value={s.num}>{s.num}. {s.ar} — {s.en}</option>
          {/each}
        </select>
      </label>

      <label>
        Aya
        <select bind:value={selectedAya} on:change={() => scrollToAya(selectedAya)}>
          {#each ayaOptions as n}
            <option value={n}>{n}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>

  <!-- Main Content -->
  <div class="main-content">
    <!-- Analysis Panel -->
    <div class="panel-left">
      <AnalysisPanel morpheme={selectedMorpheme} />
    </div>

    <!-- Quran Text -->
    <div class="panel-right">
      {#if loading}
        <div class="loading">Loading…</div>
      {:else if error}
        <div class="error">Error: {error}</div>
      {:else}
        {#each verses as v}
          <div class="verse" id="verse-{v.verse}">
            <span class="verse-num">{v.verse}</span>
            <span class="verse-text" dir="rtl">
              {#each v.tokens as token}
                <span class="token">
                  {#each token.morphemes as morpheme}
                    <span
                      class="morpheme"
                      class:selected={selectedMorpheme?.id === morpheme.id}
                      on:click={() => selectMorpheme(morpheme)}
                      role="button"
                      tabindex="0"
                      on:keydown={e => e.key === 'Enter' && selectMorpheme(morpheme)}
                    >{morpheme.morpheme_u}</span>
                  {/each}
                </span>
              {/each}
            </span>
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .browse-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    font-family: sans-serif;
  }

  .nav-bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    background: #1e293b;
    color: white;
    flex-shrink: 0;
  }

  .nav-selects {
    display: flex;
    gap: 1.5rem;
    align-items: center;
  }

  .nav-selects label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #cbd5e1;
  }

  .nav-selects select {
    background: #334155;
    color: white;
    border: 1px solid #475569;
    border-radius: 4px;
    padding: 0.3rem 0.5rem;
    font-size: 0.9rem;
    cursor: pointer;
  }

  .main-content {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .panel-left {
    width: 320px;
    flex-shrink: 0;
    border-right: 1px solid #e2e8f0;
    overflow-y: auto;
    padding: 1rem;
  }

  .panel-right {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 2rem;
  }

  .loading, .error {
    padding: 2rem;
    text-align: center;
    color: #64748b;
  }

  .error { color: #ef4444; }

  .verse {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1.25rem;
    border-bottom: 1px solid #f1f5f9;
  }

  .verse-num {
    font-size: 0.8rem;
    color: #94a3b8;
    flex-shrink: 0;
    min-width: 1.5rem;
    text-align: right;
  }

  .verse-text {
    font-size: 1.6rem;
    line-height: 2.2;
    font-family: 'Amiri', 'Scheherazade New', serif;
    flex: 1;
  }

  .token {
    display: inline;
    margin: 0 0.1rem;
  }

  .morpheme {
    cursor: pointer;
    border-radius: 3px;
    padding: 0 2px;
    transition: background 0.15s;
  }

  .morpheme:hover {
    background: #dbeafe;
  }

  .morpheme.selected {
    background: #3b82f6;
    color: white;
  }
</style>
