# scrolltrace.in

Static website for ScrollTrace. No build step: every page is plain HTML.

```
index.html              Homepage (definition, FAQ, schema)
how-it-works/index.html /how-it-works/
compare/index.html      /compare/
privacy/index.html      /privacy/
about/index.html        /about/  (founder page + contact form)
404.html                Not-found page
assets/                 site.css, site.js, favicon.svg
robots.txt sitemap.xml llms.txt   For search and AI crawlers
CNAME .nojekyll         GitHub Pages: serve on scrolltrace.in
vercel.json             Vercel settings (ignored by GitHub Pages)
```

## Deploy

### Option A: Vercel (how scrolltrace.in is served today)
1. Replace the contents of the GitHub repo Vercel deploys from with these files.
2. Commit and push to the main branch. Vercel redeploys automatically.
3. Nothing changes in DNS.

### Option B: GitHub Pages
1. Push these files to the root of a GitHub repo.
2. Repo **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`.
3. Custom domain: `scrolltrace.in` (the `CNAME` file already sets it). Tick **Enforce HTTPS** once it is available.
4. At your domain registrar, change DNS to GitHub Pages:
   - `A` records for `@`: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - `CNAME` for `www`: `<your-github-username>.github.io`
   - Remove the old records that point to Vercel.

### After going live
- Google Search Console: add `scrolltrace.in`, submit `https://scrolltrace.in/sitemap.xml`.
- Check https://scrolltrace.in/robots.txt and /sitemap.xml return content (both returned 404 before).
- Test structured data at https://search.google.com/test/rich-results

## Preview locally
```
python3 -m http.server 8765
```
then open http://localhost:8765
