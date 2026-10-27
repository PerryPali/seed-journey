/* 科学手记独立于三维场景：无网络请求，渲染不可用时仍能阅读。 */
(() => {
  'use strict';
  const dialog = document.querySelector('#science-notes');
  const open = document.querySelector('#notes-open');
  const reading = dialog.querySelector('.notes-reading');
  const tabs = [...dialog.querySelectorAll('[role="tab"]')];
  const panels = [...dialog.querySelectorAll('[role="tabpanel"]')];
  function selectNote(index, focus = false) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    reading.scrollTop = 0;
    if (focus) tabs[index].focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectNote(index));
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectNote(next, true);
    });
  });
  open.addEventListener('click', () => {
    const progress =
      window.seedJourney?.snapshot().progress ?? Number(document.body.dataset.chapter || 0);
    selectNote(progress >= 3.23 ? 3 : progress >= 2.5 ? 2 : progress >= 1.1 ? 1 : 0);
    dialog.querySelector('details').open = false;
    dialog.showModal();
    // 隐藏的面板没有可滚动布局，显示后再归零，避免重开时停在上一篇末尾。
    reading.scrollTop = 0;
    dialog.scrollTop = 0;
    document.body.classList.add('notes-open');
    open.setAttribute('aria-expanded', 'true');
  });
  document.querySelector('#notes-close').addEventListener('click', () => dialog.close());
  document.querySelector('#notes-return').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.body.classList.remove('notes-open');
    open.setAttribute('aria-expanded', 'false');
    open.focus({ preventScroll: true });
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    )
      dialog.close();
  });
})();
