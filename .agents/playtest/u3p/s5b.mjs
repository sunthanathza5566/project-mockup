import { session, B } from './lib.mjs';
const s = await session(); const { p } = s;
await s.as('chair1');
console.log('HOME TODOS', await p.locator('[data-testid^="todo-"]').evaluateAll(es => es.map(e => e.getAttribute('data-testid') + ' ' + e.innerText.replace(/\s+/g, ' ').slice(0, 110))));
console.log('NAV', (await p.locator('nav, aside').first().innerText()).replace(/\n+/g, ' | ').slice(0, 90));
await s.shot('chair-home-after-review');
await s.done();
