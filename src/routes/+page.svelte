<script>
  import { page } from '$app/stores';
  let { children } = $props();

  const navItems = [
    { href: '/',        ar: 'تصفح',  en: 'Browse'     },
    { href: '/search',  ar: 'بحث',   en: 'Search'     },
    { href: '/roots',   ar: 'جذور',  en: 'Roots'      },
    { href: '/filter',  ar: 'تصفية', en: 'Filter'     },
    { href: '/table',   ar: 'جدول',  en: 'Table'      },
    { href: '/stats',   ar: 'إحصاء', en: 'Statistics' },
  ];
</script>

<svelte:head>
  <title>Quran Explorer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
  <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Scheherazade+New:wght@400;700&family=Cinzel:wght@400;600&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap" rel="stylesheet">
</svelte:head>

<nav>
  <div class="brand">
    <span class="brand-ar">القرآن الكريم</span>
    <span class="brand-en">QURAN EXPLORER</span>
  </div>
  <div class="links">
    {#each navItems as item}
      <a href={item.href} class:active={$page.url.pathname === item.href}>
        <span class="link-ar">{item.ar}</span>
        <span class="link-en">{item.en}</span>
      </a>
    {/each}
  </div>
</nav>

<main>
  {@render children()}
</main>

<style>
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }

  :global(:root) {
    --ink: #1a1208;
    --parchment: #f7f0e3;
    --parchment-dark: #ede3cc;
    --gold: #c8922a;
    --gold-light: #e8b84b;
    --gold-muted: #a07820;
    --rust: #8b3a1a;
    --teal: #1a5c5c;
    --divider: #d4b896;
    --text-muted: #6b5a3e;
    --shadow: rgba(26,18,8,0.15);
  }

  :global(body) {
    background: var(--parchment);
    color: var(--ink);
    font-family: 'EB Garamond', Georgia, serif;
    min-height: 100vh;
  }

  :global(.arabic) {
    font-family: 'Scheherazade New', 'Amiri', serif;
    direction: rtl;
    unicode-bidi: embed;
  }

  :global(::-webkit-scrollbar) { width: 6px; }
  :global(::-webkit-scrollbar-track) { background: var(--parchment-dark); }
  :global(::-webkit-scrollbar-thumb) { background: var(--divider); border-radius: 3px; }

  nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2rem;
    height: 64px;
    background: var(--ink);
    border-bottom: 2px solid var(--gold);
    position: sticky;
    top: 0;
    z-index: 100;
    direction: ltr;
  }

  .brand { display: flex; flex-direction: column; line-height: 1.1; }

  .brand-ar {
    font-family: 'Scheherazade New', serif;
    color: var(--gold-light);
    font-size: 1.1rem;
    direction: rtl;
  }

  .brand-en {
    font-family: 'Cinzel', serif;
    color: var(--gold);
    font-size: 0.65rem;
    letter-spacing: 0.18em;
  }

  .links { display: flex; gap: 0.25rem; }

  a {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.4rem 0.85rem;
    border-radius: 4px;
    text-decoration: none;
    border: 1px solid transparent;
    transition: background 0.15s;
  }

  a:hover { background: rgba(200,146,42,0.12); border-color: rgba(200,146,42,0.3); }

  a.active { background: rgba(200,146,42,0.18); border-color: var(--gold-muted); }

  .link-ar {
    font-family: 'Scheherazade New', serif;
    color: var(--parchment);
    font-size: 1rem;
  }

  .link-en {
    color: var(--gold-muted);
    font-size: 0.6rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  a.active .link-ar { color: var(--gold-light); }
  a.active .link-en { color: var(--gold); }
</style>
