import Card from './Card/index.vue';
import Counter from './Counter/index.vue';
import HelloWorld from './HelloWorld/index.vue';
import Page from './Page/index.vue';

export const prototypes = [
  {
    id: 'HelloWorld',
    name: 'Special:HelloWorld',
    component: HelloWorld,
  },
  {
    id: 'Counter',
    name: 'Special:Counter',
    component: Counter,
  },
  {
    id: 'Card',
    name: 'Special:Card',
    component: Card,
  },
  {
    id: 'Page',
    name: 'Special:Page',
    component: Page,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));
