# Zanzibar Reality (prototype)

Evidence-based reality check map. Static React + TypeScript app, no backend, no API keys. **Ships with an empty dataset** — it shows no scores until a
researched dataset is supplied.

```bash
npm install
npm run dev                         # http://localhost:5173
npm run validate                    # typecheck + tests + production build
ZR_DATASET_DIR=/abs/path npm run dev   # run against an external dataset directory
```
Docs: [PRODUCT](PRODUCT.md) · [ACCEPTANCE](ACCEPTANCE.md) · [DATA_MODEL](DATA_MODEL.md) · [STATE](STATE.md).
