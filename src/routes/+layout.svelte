<script>
  import { page } from '$app/stores';
</script>

<nav>
  <div class="nav-brand">القرآن الكريم</div>
  <div class="nav-links">
    <a href="/" class:active={$page.url.pathname === '/'}>Browse</a>
    <a href="/search" class:active={$page.url.pathname.startsWith('/search')}>Search</a>
    <a href="/root" class:active={$page.url.pathname === '/root'}>Roots</a>
    <a href="/lemma" class:active={$page.url.pathname === '/lemma'}>Lemmas</a>
    <a href="/pattern" class:active={$page.url.pathname === '/pattern'}>Patterns</a>
    <a href="/pos" class:active={$page.url.pathname === '/pos'}>POS</a>
    <a href="/table" class:active={$page.url.pathname === '/table'}>Table</a>
  </div>
</nav>

<main>
  <slot />
</main>

<style>
  :global(*) { box-sizing: border-box; margin: 0; padding: 0; }
  :global(body) { font-family: Arial, sans-serif; background: #f0f0f0; color: #333; }
  :global(.arabic) { font-family: 'Traditional Arabic', 'Scheherazade New', Arial, sans-serif; direction: rtl; }

  nav {
    background: #1a472a;
    color: white;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 48px;
    position: sticky;
    top: 0;
    z-index: 100;
  }

  .nav-brand {
    font-size: 18px;
    font-family: 'Traditional Arabic', 'Scheherazade New', Arial, sans-serif;
    direction: rtl;
  }

  .nav-links { display: flex; gap: 4px; }

  .nav-links a {
    color: rgba(255,255,255,0.8);
    text-decoration: none;
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 14px;
    transition: background 0.15s;
  }

  .nav-links a:hover { background: rgba(255,255,255,0.15); color: white; }
  .nav-links a.active { background: rgba(255,255,255,0.25); color: white; font-weight: bold; }

  main { height: calc(100vh - 48px); overflow: hidden; }
</style>
