<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/1a2b8ee0-a734-4e71-a587-ff010325d8af

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. (Optional) Choose database provider in `.env.local`:
   - `DB_PROVIDER=firebase` (default)
   - `DB_PROVIDER=json` (stores data in local JSON file, no Firebase required)
   - Optional path when using json: `JSON_DB_PATH=./data/local-db.json`
4. Run the app:
   `npm run dev`
