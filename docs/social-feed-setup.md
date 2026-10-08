# Free social feed

**On hold at the owner's request (October 8, 2026).** The navigation link and
route are removed; the refresh workflow has no schedule and its job is explicitly
disabled, including manual runs. Draft components and collector remain in source.
The saved preview is `data_prep/social_feed_preview.json`, outside public assets.
To resume, restore the route/navigation and schedule, remove the workflow job
guard, and run the collector to populate `public/data/social_feed.json`.

`/social` collects posts from the nine accounts in `src/lib/socialAccounts.json`,
filters them, and caches the `html` returned by X's free, unauthenticated
`GET https://publish.x.com/oembed?url=POST_URL&omit_script=true&dnt=true` endpoint.

oEmbed requires individual post URLs; it does not list an account's recent posts.
Nitter supplies discovery via public RSS. `nitter.kareem.one` returned real RSS
for all nine accounts in the October 8, 2026 check. Several initially returned
404 before succeeding on a later request. The other six instances on Nitter's
published list failed RSS checks (404, 403, 451, 503 or DNS failure).
The source is editable in `data_prep/social_feed_rules.json`; no login, paid X
API, API key or AI classification service is used.

## Refresh

```powershell
python data_prep/update_social_feed.py
python -m unittest discover -s data_prep -p test_social_feed.py
npm run build
```

When resumed, `.github/workflows/update-social-feed.yml` can schedule collection
at 06:23 and 18:23 UTC and support manual runs. It commits the public snapshot to
`main`, which follows the site's existing Cloudflare Pages rebuild setup.
The paused workflow stays disabled even after publishing this code. No external
account, secret or payment setup is required.
GitHub Actions is free for standard runners in public repositories; for private
repositories, included minutes and the account's spending settings apply.

## Collection, moderation and display

- Read at most 20 original posts per account from the returned RSS, retaining
  only the last 30 days. This is a recent feed, not a complete archive.
- Skip replies/reposts; validate RSS channel and original post authorship.
- Reject promotional wording, known sponsor brands, affiliate/discount language,
  giveaways, merchandise/jersey pitches and blocked domains. Examine quoted text
  too, so quoted sponsorship/merch posts cannot bypass the filter.
- Require game/team context in remaining text or image descriptions; ambiguous
  posts are held outside the published feed. `allow_ids` fixes relevance mistakes;
  `deny_ids` excludes false positives. Promotion exclusions take precedence.
- An attachment's own permalink must not count as relevance just because it
  contains the player's handle. Real-data review caught this bug and a merchandise
  post phrased as a “new NRG drop”; regression checks cover both.
- Cache approved oEmbed HTML in the public snapshot for 24 hours; unchanged fresh
  embeds require no new oEmbed request. Strip scripts, event handlers, unsafe links
  and non-blockquote markup before publishing. Convert that cached markup into
  native text/link tokens, preserving authored text, paragraph breaks and emoji.
- Native scrapbook cards now render structured text/link tokens from cached
  oEmbed, with author names/avatars and original media URLs from RSS. No X widget
  script or iframe loads. Keep full text, linked entities, timestamp, original
  source and the X mark. Quoted post text/media stay separate from the author's
  own attachments. Media URLs are allowlisted to X's image/video CDN. Generated
  pic.twitter.com media links are represented by the displayed attachment.
- Photos load directly from the original CDN, without downloads or image changes.
  Videos play with native controls only when RSS supplies an MP4; video-thumbnail
  entries link to playback on X. GIF videos do not autoplay. Missing media keeps
  an original-post fallback link. No engagement counts or verification badges are
  fabricated. Visitors never call oEmbed or the read API.
- An oEmbed 403/404/410 excludes that post. Other oEmbed errors leave the post's
  source link visible without old cached text. All nine RSS requests must succeed
  before publishing; a failed account preserves the previous complete snapshot.
- Replace the snapshot on each successful refresh, so posts absent from RSS or
  beyond the rolling window drop out. The page shows visitor-local update time,
  marks refreshes delayed after 36 hours, and offers category/author filters.

RSS mirrors can stop working or block GitHub's runners. This source was verified
locally; an Actions run still needs verification after publishing. The workflow
fails visibly and preserves the last good feed when collection fails. Text rules
are conservative, not semantic/image understanding: disguised promotions can slip
through and relevant image-only art/short reactions can be withheld.

Download the `social-review` Actions artifact to inspect exclusion/hold reasons.
It is accessible to repository readers, retained seven days and not part of the
public site. Local reports go to `.local/social-review.json`. The public snapshot
contains accepted IDs, dates, original links and sanitized official oEmbed HTML.

For offline parsing checks, `--fixture-dir DIRECTORY` accepts saved HANDLE.xml
files and makes no network requests (it only reuses existing fresh embed HTML).
Always use `--out` and `--report` with local temporary paths for experiments.

Sources: [Nitter](https://github.com/zedeus/nitter),
[published instance list](https://github.com/zedeus/nitter/wiki/Instances),
[X embedding help](https://help.x.com/en/using-x/how-to-embed-a-post).
