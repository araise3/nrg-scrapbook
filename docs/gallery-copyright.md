# NRG Scrapbook: gallery copyright research

Checked 8 October 2026. This is a practical research note, not a legal opinion
or confirmation of permission from any rights holder.

## Finding

The downloaded collection is not yet cleared for a public, self-hosted gallery.
An original-quality download button, photographer credit, or a free fan-page
purpose does not itself grant republication rights. Cloudflare R2 is still a
technical option, but changing hosts does not change the photo license.

## Photo sources checked

Read the public photo-page license label and embedded photo metadata for one
existing site image from each source. All three explicitly display **All rights
reserved**, with Flickr photo license ID `0`:

- VALORANT Esports: [mada, Shanghai](https://www.flickr.com/photos/valorantesports/55574547526/),
  caption credits Colin Young-Wolff/Riot Games.
- VCT Americas: [bonkar and s0m, Stage 2 2025](https://www.flickr.com/photos/vctamericas/54755401351/),
  caption credits Tina Jo/Riot Games.
- NRGgg: [Ethan, LDN_FILM_23](https://www.flickr.com/photos/nrggg/55413480317/).

This is a sample, not an audit of all 2,782 local images. The existing download
inventories preserve captions, source URLs and dimensions but do not establish
permission to republish. Do not assign a blanket license to an entire account
based on these samples. License evidence from the checks is saved locally in
`.local/flickr-license-check.json` and the corresponding photo-page HTML.

[Flickr's reuse guidance](https://www.flickrhelp.com/hc/en-us/articles/10710266545556-Using-Flickr-images-shared-by-other-members)
explains the default reserved-rights status and directs users to obtain permission.
Its [API terms](https://www.flickr.com/help/terms/api) explicitly say API access
does not override the photo owner's restrictions. If an API integration is later
used, review its separate display, caching, attribution and removal requirements.

## Riot's fan-content policy

[Legal Jibber Jabber](https://www.riotgames.com/en/legal) offers a conditional,
revocable license for noncommercial community uses of Riot-owned IP. It also
requires an original contribution, prohibits unpermitted third-party material,
restricts Riot trademarks, and requires a conspicuous fan-project notice.

My interpretation: a curated scrapbook with original history and commentary has
a stronger basis under this policy than mirroring the downloaded archives. The
policy does not explicitly clear this particular bulk photography gallery, and
the captions alone do not establish which rights Riot controls. NRG's own photos
are a separate source; Riot's policy cannot grant NRG or a photographer's rights.
Obtain written confirmation for the intended gallery use from the relevant rights
holder or an authorized licensing contact, including any contracted photography.

If relying on that policy, include its prescribed project notice on the site.
Mark the site as independent of both Riot and NRG. Credits and a disclaimer are
useful obligations, but neither substitutes for permission.

## German copyright context

For a Germany-based operator, the [Urheberrechtsgesetz](https://www.gesetze-im-internet.de/urhg/BJNR012730965.html)
protects photographs (§72) and reserves public online availability (§19a).
Private-copy provisions (§53) do not provide a general basis to publish those
copies publicly. A decorative gallery should not assume it qualifies as a
quotation (§51). Whether an exception applies requires analysis of the actual use.

## Concrete hosting approach

Before uploading, record each selected photo's source URL, creator/credit,
rights holder if known, exact license and version, permission evidence,
permitted modifications, and any expiry or withdrawal conditions. Ask for
permission to reproduce on a free independent fan site and CDN, generate WebP
sizes, crop or apply collage treatments, and retain public copies for the agreed
term. Request album-level permission when appropriate, with specified album URLs.

Publish only photos covered by an applicable license or documented permission.
For [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), for example, retain
attribution, link the license and identify changes. Other CC variants have
different requirements; do not apply CC BY rules to reserved-rights images.
Keep the licensing evidence with the import manifest and provide visible credits
and a way for rights holders to contact the operator.

For photos without clearance, link visitors to the original Flickr album. Flickr's
official embedding feature may be another option where enabled, but it is not
permission to copy files to R2; check the relevant terms and owner settings.

This also affects the photographs already used in the site's background and
passport. They should be included in the same rights audit. No photos were
removed, new gallery images uploaded, or rights holders contacted during this task.
