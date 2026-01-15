import Card from './Card/index.vue';
import Counter from './Counter/index.vue';
import HelloWorld from './HelloWorld/index.vue';
import Page from './Page/index.vue';
import PageChanges from './PageChanges/index.vue';

export const prototypes = [
  {
    id: 'HelloWorld',
    component: HelloWorld,
  },
  {
    id: 'Counter',
    component: Counter,
  },
  {
    id: 'Card',
    component: Card,
  },
  {
    id: 'Page',
    component: Page,
  },
  {
    id: 'PageChanges',
    component: PageChanges,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));
