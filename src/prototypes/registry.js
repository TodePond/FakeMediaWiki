import Card from "./Card/index.vue";
import Counter from "./Counter/index.vue";
import FeaturedArticle from "./FeaturedArticle/index.vue";
import HelloWorld from "./HelloWorld/index.vue";
import OnThisDay from "./OnThisDay/index.vue";
import Page from "./Page/index.vue";
import PageChanges from "./PageChanges/index.vue";
import PageHtml from "./PageHtml/index.vue";
import PageMetadata from "./PageMetadata/index.vue";
import RandomPage from "./RandomPage/index.vue";
import SearchPages from "./SearchPages/index.vue";
import SearchTitles from "./SearchTitles/index.vue";
import WikitextTransform from "./WikitextTransform/index.vue";

export const prototypes = [
  {
    id: "Card",
    component: Card,
  },
  {
    id: "Counter",
    component: Counter,
  },
  {
    id: "FeaturedArticle",
    component: FeaturedArticle,
  },
  {
    id: "HelloWorld",
    component: HelloWorld,
  },
  {
    id: "OnThisDay",
    component: OnThisDay,
  },
  {
    id: "Page",
    component: Page,
  },
  {
    id: "PageChanges",
    component: PageChanges,
  },
  {
    id: "PageHtml",
    component: PageHtml,
  },
  {
    id: "PageMetadata",
    component: PageMetadata,
  },
  {
    id: "RandomPage",
    component: RandomPage,
  },
  {
    id: "SearchPages",
    component: SearchPages,
  },
  {
    id: "SearchTitles",
    component: SearchTitles,
  },
  {
    id: "WikitextTransform",
    component: WikitextTransform,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));
