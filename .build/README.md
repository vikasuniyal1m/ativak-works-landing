# Rebuilding tailwind-build.css

The site uses a prebuilt, purged Tailwind stylesheet (`../tailwind-build.css`)
instead of the Play CDN script, for performance (no runtime JS/DOM-scan cost)
and to avoid the unstyled-flash layout shift the CDN caused.

After changing any Tailwind class in `index.html`, `thank-you/index.html`, or
`privacy-policy.html`, rebuild with:

```
cd .build
npm install
npx tailwindcss -i input.css -o ../tailwind-build.css --minify
```

`tailwind.config.js` here is the source of truth for the `kotlis.*` color
tokens and font families — keep it in sync with any theme changes.
