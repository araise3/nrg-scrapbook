"""Meaningful offline regression checks; no network or credentials."""
from datetime import datetime, timezone
import unittest
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path
from urllib.error import HTTPError
from update_social_feed import (parse_feed, classify, sanitize_embed, cache_embeds,
                              build_feed, main, read_json, ROOT, RULES, PostBody, RSSMedia, quoted_post)


class FeedTests(unittest.TestCase):
    def setUp(self):
        self.rules = read_json(RULES)
        self.post = {"id": "123", "handle": "skubacs", "text": "NRG win", "context": "", "links": [], "quoted": False, "date": datetime(2026, 10, 8, tzinfo=timezone.utc)}

    def test_ads_override_relevance_and_manual_allow(self):
        self.rules["allow_ids"] = ["123"]
        for text in ["NRG #ad", "ASUS_ROG champs", "NRG please buy", "new NRG drop go check it out", "NRG giveaway", "Champs jersey released", "NRG use my code TEST"]:
            self.assertEqual(classify({**self.post, "text": text}, self.rules)[0], "reject", text)
        self.assertEqual(classify({**self.post, "context": "paid partnership"}, self.rules)[0], "reject")
        self.assertEqual(classify({**self.post, "links": ["https://shop.stake.com/deal"]}, self.rules)[0], "reject")

    def test_attachment_permalink_cannot_create_relevance(self):
        post = {**self.post, "text": "Video", "context": "Video", "links": ["https://nitter.kareem.one/skubacs/status/123#m"]}
        self.assertEqual(classify(post, self.rules)[0], "review")
        self.assertEqual(classify({**post, "text": "2-0 vs T1 playoffs"}, self.rules)[0], "accept")

    def test_rss_parser_checks_authorship_and_skips_reposts(self):
        raw = b'''<rss><channel><title>NRG skuba / @skubacs</title>
          <item><title>RT by @skubacs: NRG</title><link>https://nitter.example/other/status/122</link></item>
          <item><title>NRG</title><link>https://nitter.example/skubacs/status/123#m</link><pubDate>Thu, 08 Oct 2026 00:00:00 GMT</pubDate><description>&lt;p&gt;NRG&lt;/p&gt;</description></item>
          </channel></rss>'''
        self.assertEqual(len(parse_feed(raw, {"handle": "skubacs"})), 1)
        with self.assertRaises(ValueError):
            parse_feed(raw, {"handle": "brawk"})
        with self.assertRaises(ValueError):
            parse_feed(raw.replace(b'/skubacs/status/', b'/other/status/'), {"handle": "skubacs"})
        with self.assertRaises(ValueError):
            parse_feed(b'<!DOCTYPE rss><rss/>', {"handle": "skubacs"})

    def test_oembed_strips_executable_markup_and_requires_correct_post(self):
        html = '<blockquote onclick="evil()"><p>NRG &amp; friends<script>evil()</script><img src=x onerror=evil()></p><a href="javascript:evil()">unsafe</a><a href="https://x.com/skubacs/status/123">original</a></blockquote>'
        clean = sanitize_embed(html, self.post)
        for unsafe in ["script", "onclick", "onerror", "javascript:", "<img", "evil()"]:
            self.assertNotIn(unsafe, clean)
        self.assertIn('class="twitter-tweet"', clean)
        self.assertIn("NRG &amp; friends", clean)
        with self.assertRaises(ValueError):
            sanitize_embed(html.replace("status/123", "status/124"), self.post)

    def test_cached_html_does_not_make_network_requests(self):
        post = {"id": "123", "handle": "skubacs", "url": "https://x.com/skubacs/status/123"}
        previous = {"posts": [{**post, "html": '<blockquote><a href="https://x.com/skubacs/status/123">NRG</a></blockquote>', "htmlFetchedAt": datetime.now(timezone.utc).isoformat()}]}
        with patch("update_social_feed.urlopen", side_effect=AssertionError("Unexpected network")):
            feed = cache_embeds({"posts": [post]}, previous, [])
        self.assertIn("html", feed["posts"][0])

    def test_removed_oembed_is_not_republished(self):
        post = {"id": "123", "handle": "skubacs", "url": "https://x.com/skubacs/status/123"}
        with patch("update_social_feed.urlopen", side_effect=HTTPError(post["url"], 404, "gone", {}, None)):
            report = []
            feed = cache_embeds({"posts": [post]}, {}, report)
        self.assertEqual(feed["posts"], [])
        self.assertEqual(report[0]["decision"], "reject")

    def test_official_embed_promotions_are_rechecked(self):
        post = {"id": "123", "handle": "skubacs", "url": "https://x.com/skubacs/status/123"}
        previous = {"posts": [{**post, "html": '<blockquote>#ad NRG <a href="https://x.com/skubacs/status/123">original</a></blockquote>', "htmlFetchedAt": datetime.now(timezone.utc).isoformat()}]}
        with patch("update_social_feed.urlopen", side_effect=AssertionError("Unexpected network")):
            feed = cache_embeds({"posts": [post]}, previous, [], rules=self.rules)
        self.assertEqual(feed["posts"], [])

    def test_native_body_preserves_lines_links_and_unicode_without_author_footer(self):
        body = PostBody()
        body.feed('<blockquote><p>NRG &amp; friends<br><br>GGs 👏 <a href="https://x.com/T1">@T1</a></p>— NRG skuba <a href="https://x.com/skubacs/status/123">October 8</a></blockquote>')
        self.assertEqual(''.join(token['text'] for token in body.body), 'NRG & friends\n\nGGs 👏 @T1')
        self.assertEqual(body.body[-1]['href'], 'https://x.com/T1')

    def test_native_media_keeps_quoted_images_separate_and_rejects_unsafe_sources(self):
        markup = '<p>NRG</p><img src="https://pbs.twimg.com/media/own.jpg"><img src="https://evil.example/untrusted.jpg"><video poster="https://pbs.twimg.com/tweet_video_thumb/gif.jpg"><source src="https://video.twimg.com/tweet_video/gif.mp4" type="video/mp4"></video><blockquote><b>Team (@NRGgg)</b><p>NRG won<br>GGs</p><img src="https://pbs.twimg.com/media/quote.jpg"><footer><a href="https://nitter.kareem.one/NRGgg/status/456#m">original</a></footer></blockquote>'
        media = RSSMedia()
        media.feed(markup)
        self.assertEqual(len(media.media), 2)
        self.assertEqual(len(media.quote_media), 1)
        self.assertEqual(media.media[1]['src'], 'https://video.twimg.com/tweet_video/gif.mp4')
        quote = quoted_post(markup, media.quote_media)
        self.assertEqual(quote['url'], 'https://x.com/NRGgg/status/456')
        self.assertEqual(''.join(token['text'] for token in quote['body']), 'NRG won\nGGs')
        self.assertEqual(quote['media'][0]['src'], 'https://pbs.twimg.com/media/quote.jpg')

    def test_expiration_deduplication_and_failed_refresh_preserves_snapshot(self):
        feed, _ = build_feed([[self.post, self.post, {**self.post, "id": "124", "date": datetime(2026, 8, 1, tzinfo=timezone.utc)}]], self.rules, datetime(2026, 10, 8, 12, tzinfo=timezone.utc))
        self.assertEqual(len(feed["posts"]), 1)
        # Keep temporary artifacts within the repository on sandboxed Windows.
        with TemporaryDirectory(dir=ROOT) as directory:
            output = Path(directory) / "feed.json"
            output.write_text('previous', encoding="utf-8")
            with patch("sys.argv", ["collector", "--out", str(output)]), patch("update_social_feed.fetch_feed", side_effect=RuntimeError("RSS unavailable")):
                with self.assertRaises(RuntimeError):
                    main()
            self.assertEqual(output.read_text(), 'previous')


if __name__ == "__main__":
    unittest.main()
