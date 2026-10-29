GLASS & CASE — Integrated website

OPEN: index.html (homepage)
STORE: tempered-glass-store.html

Integrated changes:
- Shared header navigation on homepage and tempered glass store
- Tempered Glass navbar links and Explore Tempered Glass CTA open the store
- Home and Back Covers links return to homepage sections
- Floating WhatsApp button on both pages (0777318581 / +94777318581)
- Existing tempered glass store layout and mobile filtering behavior retained

IMPORTANT: The supplied homepage ZIP contains only index.html, script.js and styles.css.
Its video assets are NOT inside that ZIP, and were not present in the previous store ZIP.
For the original homepage videos to play, place the following ORIGINAL files in assets/:
  - device-protection.mp4
  - back-cover-collection.mp4
  - tempered-glass-impact.mp4
  - everyday-protection.mp4

All store image assets are included. Do not upload this package expecting homepage videos to work until the files above are added.

2026-10-27 UPDATE:
- Desktop styles remain as before. Mobile hero is edge-to-edge; mobile navigation has one separator.
- Search fields are at least 16px on mobile to prevent iPhone Safari auto-zoom.
- Store product PNGs converted to WebP for smaller downloads.
- Videos referenced by the supplied homepage are missing from the original upload:
  assets/device-protection.mp4
  assets/back-cover-collection.mp4
  assets/tempered-glass-impact.mp4
  assets/everyday-protection.mp4
  These have not been fabricated. After adding each missing video, its existing source src will work automatically.
  Encode H.264 MP4, web optimized faststart, ideally 720p/1080p; host large videos on a CDN for best speed.
- A blank video area will stay blank until the original MP4s are supplied.

Mobile hero update: Reduced homepage hero from full-screen to 68svh (min 380px, max 610px), video uses object-fit: contain so edges are not cropped. Desktop unchanged. Original MP4s remain absent from source ZIP.

Store hero background: assets/store-hero-background.mp4 (autoplay muted loop, landing and model-product views).

DETAIL POPUP (NEW): View Details opens a modal over blurred page, with model-aware common glass-type descriptions. MTB uses supplied video assets/mtb-details.mp4. Other glass types display their existing image until individual videos are supplied. Product specifications are informational examples, confirm actual compatibility, contents and claims with supplier. Add future product videos to assets and configure the profile video in glass-detail-modal.js.
