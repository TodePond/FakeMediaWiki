import Counter from './counter/index.vue';
import HelloWorld from './hello-world/index.vue';

export const prototypes = [
  {
    id: 'counter',
    name: 'Special:Counter',
    component: Counter,
  },
  {
    id: 'hello-world',
    name: 'Special:HelloWorld',
    component: HelloWorld,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));
