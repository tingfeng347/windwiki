export function HomeSearch() {
  if (import.meta.env.SSG_MD) return null;

  return (
    <button
      type="button"
      className="windwiki-search"
      onClick={() => {
        // Reuse the default theme's single search panel and keyboard shortcut.
        document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK', ctrlKey: true }));
      }}
    >
      <span>搜索知识库</span>
      <kbd>Ctrl / ⌘ K</kbd>
    </button>
  );
}
