# FakeWiki

This project is a system for building lightweight MediaWiki prototypes. I should probably give it a better name.

Try it at [todepond.github.io/FakeMediaWiki](https://todepond.github.io/FakeMediaWiki/)

- It comes with Codex and a bunch of CSS variables for making wiki-like UIs.
- It comes with a little library for using MediaWiki's APIs. See `FakeWiki.ts` for more info.

## Stack

- Vue
- Vite
- Codex (the design system, not the agent)
- GitHub Pages

## How to run it locally

Clone the repo.

```sh
git clone https://github.com/todepond/fakemediawiki
```

Install dependencies.

```sh
npm i
```

Run it.

```sh
npm run dev
```

Then open [localhost:5173](http://localhost:5173/) in a web browser.
