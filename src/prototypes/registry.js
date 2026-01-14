import Counter from './counter/index.vue';
import HelloWorld from './hello-world/index.vue';

export const prototypes = [
  {
    id: 'counter',
    name: 'Counter',
    component: Counter,
  },
  {
    id: 'hello-world',
    name: 'Hello World',
    component: HelloWorld,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));
