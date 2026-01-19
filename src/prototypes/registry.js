import Card from './Card/index.vue';
import Counter from './Counter/index.vue';
import HelloWorld from './HelloWorld/index.vue';
import Page from './Page/index.vue';
import PageChanges from './PageChanges/index.vue';

export const prototypes = [
  {
    id: 'PageChanges',
    component: PageChanges,
  },
  {
    id: 'Page',
    component: Page,
  },
  {
    id: 'Card',
    component: Card,
  },
  {
    id: 'Counter',
    component: Counter,
  },
  {
    id: 'HelloWorld',
    component: HelloWorld,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));
