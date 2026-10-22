'use strict';
const demo = document.querySelector('#demo-frame');
document.querySelectorAll('[data-demo-tab]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-demo-tab]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  demo?.contentWindow?.postMessage({type:'tennislog-demo-tab',tab:button.dataset.demoTab}, location.origin);
}));
document.querySelector('[data-reset-demo]')?.addEventListener('click', () => {
  if(confirm('Reset only the TennisLog browser demo to its sample records? Any changes you made in this demo will be removed.')) {
    demo?.contentWindow?.postMessage({type:'tennislog-demo-reset'}, location.origin);
  }
});
