import Card from "./Card/index.vue";
import Counter from "./Counter/index.vue";
import FeaturedPage from "./FeaturedPage/index.vue";
import HelloWorld from "./HelloWorld/index.vue";
import OnThisDay from "./OnThisDay/index.vue";
import Page from "./Page/index.vue";
import PageChanges from "./PageChanges/index.vue";
import PageFeed from "./PageFeed/index.vue";
import PageHtml from "./PageHtml/index.vue";
import PageMedia from "./PageMedia/index.vue";
import PageMetadata from "./PageMetadata/index.vue";
import PageMobileHtml from "./PageMobileHtml/index.vue";
import PageSource from "./PageSource/index.vue";
import RandomPage from "./RandomPage/index.vue";
import SearchPages from "./SearchPages/index.vue";
import SearchTitles from "./SearchTitles/index.vue";
import SearchUsers from "./SearchUsers/index.vue";
import WikitextTransform from "./WikitextTransform/index.vue";

/**
 * @typedef {object} PrototypeDefinition
 * @property {string} id
 * @property {import("vue").Component} component
 * @property {boolean} [pinned]
 * @property {string} [wrapper]
 */

/**
 * @type {PrototypeDefinition[]}
 */
export const prototypes = [
  {
    id: "PageFeed",
    component: PageFeed,
    wrapper: "Special",
    pinned: true,
  },
  {
    id: "PageChanges",
    component: PageChanges,
    wrapper: "Special",
    pinned: true,
  },
  {
    id: "PageChanges",
    component: PageChanges,
    wrapper: "Fullscreen",
    pinned: true,
  },
  {
    id: "SearchTitles",
    component: SearchTitles,
    pinned: false,
    wrapper: "Special",
  },
  {
    id: "SearchPages",
    component: SearchPages,
    pinned: false,
    wrapper: "Special",
  },
  {
    id: "SearchUsers",
    component: SearchUsers,
    pinned: false,
    wrapper: "Special",
  },
  {
    id: "FeaturedPage",
    component: FeaturedPage,
    pinned: false,
    wrapper: "Special",
  },
  {
    id: "OnThisDay",
    component: OnThisDay,
    pinned: false,
    wrapper: "Special",
  },
  {
    id: "WikitextTransform",
    component: WikitextTransform,
    pinned: false,
    wrapper: "Special",
  },
  {
    id: "PageMetadata",
    component: PageMetadata,
    pinned: false,
    wrapper: "Special",
  },
  {
    id: "PageHtml",
    component: PageHtml,
    wrapper: "Special",
    pinned: false,
  },
  {
    id: "PageSource",
    component: PageSource,
    wrapper: "Special",
    pinned: false,
  },
  {
    id: "PageMedia",
    component: PageMedia,
    wrapper: "Special",
    pinned: true,
  },
  {
    id: "PageMobileHtml",
    component: PageMobileHtml,
    wrapper: "Special",
    pinned: false,
  },
  {
    id: "RandomPage",
    component: RandomPage,
    wrapper: "Special",
    pinned: false,
  },
  {
    id: "Page",
    component: Page,
    wrapper: "Special",
    pinned: false,
  },
  {
    id: "Card",
    component: Card,
    wrapper: "Special",
    pinned: false,
  },
  {
    id: "Counter",
    component: Counter,
    wrapper: "Special",
    pinned: false,
  },
  {
    id: "HelloWorld",
    component: HelloWorld,
    wrapper: "Special",
    pinned: false,
  },
];

export const prototypeMap = new Map(prototypes.map((p) => [p.id, p.component]));

export function getPinnedPrototypes() {
  return prototypes.filter((p) => p.pinned);
}

export function getUnpinnedPrototypes() {
  return prototypes.filter((p) => !p.pinned);
}
