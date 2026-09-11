document.documentElement.classList.add('js');

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('#main-nav');
const disclosure = document.querySelector('.nav-disclosure');
const closeMenu = () => {
  menu?.classList.remove('is-open');
  menuButton?.setAttribute('aria-expanded', 'false');
};
menuButton?.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menu.classList.toggle('is-open', open);
});
document.addEventListener('click', (event) => {
  if (!event.target.closest('.nav-disclosure') && disclosure) disclosure.open = false;
  if (!event.target.closest('.site-header')) closeMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (disclosure?.open) {
    disclosure.open = false;
    disclosure.querySelector('summary').focus();
  } else if (menu?.classList.contains('is-open')) {
    closeMenu();
    menuButton.focus();
  }
});
matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);
document.querySelector('[data-print]')?.addEventListener('click', () => window.print());

const chapters = [...document.querySelectorAll('[data-chapter]')];
if (chapters.length) {
  document.documentElement.classList.add('sample-enhanced');
  const chapterLinks = [...document.querySelectorAll('[data-chapter-link]')];
  const chapterSelect = document.querySelector('#chapter-select');
  let currentChapter;
  function updateChapter(moveFocus = false) {
    let id;
    try {
      id = decodeURIComponent(location.hash.slice(1));
    } catch {
      id = '';
    }
    const active = chapters.find((chapter) => chapter.dataset.chapter === id) || chapters[0];
    for (const chapter of chapters) chapter.hidden = chapter !== active;
    for (const link of chapterLinks) {
      if (link.dataset.chapterLink === active.id) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
    }
    chapterSelect.value = active.id;
    if (moveFocus && currentChapter !== active.id) {
      active.querySelector('h2').focus({ preventScroll: true });
      active.scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    currentChapter = active.id;
  }
  window.addEventListener('hashchange', () => updateChapter(true));
  chapterSelect.addEventListener('change', () => {
    location.hash = chapterSelect.value;
  });
  updateChapter(false);

  function initPanels(buttonAttr, panelAttr) {
    const buttons = [...document.querySelectorAll(`[${buttonAttr}]`)];
    const panels = [...document.querySelectorAll(`[${panelAttr}]`)];
    function activate(button) {
      const value = button.getAttribute(buttonAttr);
      for (const candidate of buttons)
        candidate.setAttribute('aria-pressed', String(candidate === button));
      for (const panel of panels) panel.hidden = panel.getAttribute(panelAttr) !== value;
    }
    for (const button of buttons) button.addEventListener('click', () => activate(button));
    if (buttons[0]) activate(buttons[0]);
  }
  initPanels('data-concept', 'data-concept-panel');
  initPanels('data-drawing', 'data-drawing-panel');

  const dialog = document.querySelector('.drawing-dialog');
  let previousFocus;
  document.querySelectorAll('[data-expand-drawing]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!dialog?.showModal) return;
      event.preventDefault();
      previousFocus = link;
      dialog.querySelector('h2').textContent = link.dataset.expandDrawing;
      const image = dialog.querySelector('img');
      image.src = link.href;
      image.alt = `${link.dataset.expandDrawing}. Illustrative sample project, pending review.`;
      dialog.showModal();
    });
  });
  dialog?.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog?.addEventListener('close', () => previousFocus?.focus());
  dialog?.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    )
      dialog.close();
  });
}
