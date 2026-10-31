# UseFirst Web

The web app for UseFirst: what food your household has, where it is, and what to use first.

- API and its contract: [`foodstorage-api`](https://github.com/suarezph/foodstorage-api)
- How the app is put together: [`docs/architecture.md`](docs/architecture.md)

Install it on your phone (Chrome: "Install app"; iPhone Safari: Share → "Add to Home Screen") to
get a daily "use these first" notification. It also scans barcodes, keeps a shopping list, shows
what gets thrown away, and suggests what to cook.

## Run it locally

Node 22+. Start `foodstorage-api` first (`npm run dev`, port 3001).

```bash
npm install
npm run dev     # http://localhost:5174
npm test
```

Sign in with the admin made by `npm run user:create` in the API repo, create a household under
"Households & people", put yourself in it as Manager, and add your family.
