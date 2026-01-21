import Card from "./Card/index.vue";
import Counter from "./Counter/index.vue";
import FeaturedPage from "./FeaturedPage/index.vue";
import HelloWorld from "./HelloWorld/index.vue";
import OnThisDay from "./OnThisDay/index.vue";
import Page from "./Page/index.vue";
import PageChanges from "./PageChanges/index.vue";
import PageHtml from "./PageHtml/index.vue";
import PageMedia from "./PageMedia/index.vue";
import PageMetadata from "./PageMetadata/index.vue";
import PageMobileHtml from "./PageMobileHtml/index.vue";
import PageSource from "./PageSource/index.vue";
import RandomPage from "./RandomPage/index.vue";
import SearchPages from "./SearchPages/index.vue";
import SearchTitles from "./SearchTitles/index.vue";
import WikitextTransform from "./WikitextTransform/index.vue";

export const prototypes = [
  {
    id: "SearchTitles",
    component: SearchTitles,
  },
  {
    id: "SearchPages",
    component: SearchPages,
  },
  {
    id: "FeaturedPage",
    component: FeaturedPage,
  },
  {
    id: "OnThisDay",
    component: OnThisDay,
  },
  {
    id: "WikitextTransform",
    component: WikitextTransform,
  },
  {
    id: "PageMetadata",
    component: PageMetadata,
  },
  {
    id: "PageHtml",
    component: PageHtml,
  },
  {
    id: "PageSource",
    component: PageSource,
  },
  {
    id: "PageMedia",
    component: PageMedia,
  },
  {
    id: "PageMobileHtml",
    component: PageMobileHtml,
  },
  {
    id: "PageChanges",
    component: PageChanges,
  },
  {
    id: "RandomPage",
    component: RandomPage,
  },
  {
    id: "Page",
    component: Page,
  },
  {
    id: "Card",
    component: Card,
  },
  {
    id: "Counter",
    component: Counter,
  },
  {
    id: "HelloWorld",
    component: HelloWorld,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));
