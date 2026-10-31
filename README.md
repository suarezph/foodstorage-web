# Food Storage Web

The web app for Food Storage: what food your household has, where it is, and what to use first.

- API and its contract: [`foodstorage-api`](https://github.com/suarezph/foodstorage-api)
- How the app is put together: [`docs/architecture.md`](docs/architecture.md)

## Run it locally

Node 22+. Start `foodstorage-api` first (`npm run dev`, port 3001).

```bash
npm install
npm run dev     # http://localhost:5174
npm test
```

Sign in with the admin made by `npm run user:create` in the API repo, create a household under
"Households & people", put yourself in it as Manager, and add your family.
