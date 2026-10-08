"""Collect free Nitter RSS, filter posts, and cache free X oEmbed HTML."""
import argparse
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from html.parser import HTMLParser
from html import escape
import json
from pathlib import Path
import re
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ACCOUNTS = ROOT / "src/lib/socialAccounts.json"
RULES = ROOT / "data_prep/social_feed_rules.json"
OUT = ROOT / "public/data/social_feed.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


class Description(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text, self.links, self.quote = [], [], False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "blockquote":
            self.quote = True
        if tag == "a" and attrs.get("href"):
            self.links.append(attrs["href"])
            # Mention title attributes can carry the game/team context.
            self.text.append(attrs.get("title", ""))
        if tag == "img":
            self.text.append(attrs.get("alt", ""))

    def handle_data(self, value):
        self.text.append(value)


def media_url(value, video=False):
    parsed = urlparse(value or "")
    hosts = ("video.twimg.com",) if video else ("pbs.twimg.com",)
    return value if parsed.scheme == "https" and parsed.hostname in hosts and not parsed.username and not parsed.password else None


class PostBody(HTMLParser):
    """Convert the first post paragraph to text/link tokens, without attribution HTML."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.body, self.depth, self.started, self.done, self.href = [], 0, False, False, None

    def handle_starttag(self, tag, attrs):
        if self.done:
            return
        if tag == "p":
            self.started = True
            self.depth += 1
        if self.depth and tag == "a":
            href = dict(attrs).get("href", "")
            parsed = urlparse(href)
            if parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password:
                self.href = href
        if self.depth and tag == "br":
            self.add("\n")

    def handle_endtag(self, tag):
        if tag == "a":
            self.href = None
        if tag == "p" and self.depth:
            self.depth -= 1
            if not self.depth:
                self.done = True

    def add(self, text):
        token = {"text": text}
        if self.href:
            token["href"] = self.href
        if self.body and self.body[-1].get("href") == token.get("href"):
            self.body[-1]["text"] += text
        else:
            self.body.append(token)

    def handle_data(self, text):
        if self.depth and not self.done:
            self.add(text)


class RSSMedia(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.media, self.quote_media, self.quote_depth = [], [], 0
        self.video = None

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "blockquote":
            self.quote_depth += 1
        target = self.quote_media if self.quote_depth else self.media
        if tag == "video":
            self.video = {"type": "video", "poster": media_url(attrs.get("poster"))}
            target.append(self.video)
        if tag == "source" and self.video:
            url = media_url(attrs.get("src"), video=True)
            if url and attrs.get("type") == "video/mp4":
                self.video["src"] = url
        if tag == "img":
            url = media_url(attrs.get("src"))
            if url:
                if "/amplify_video_thumb/" in url or "/ext_tw_video_thumb/" in url or "/tweet_video_thumb/" in url:
                    target.append({"type": "video", "poster": url})
                else:
                    target.append({"type": "image", "src": url, "alt": attrs.get("alt", "")})

    def handle_endtag(self, tag):
        if tag == "blockquote":
            self.quote_depth = max(0, self.quote_depth - 1)
        if tag == "video":
            self.video = None


def quoted_post(html, media):
    quote = re.search(r"<blockquote>(.*?)</blockquote>", html, re.S | re.I)
    if not quote:
        return None
    markup = quote[1]
    author = re.search(r"<b>(.*?)</b>", markup, re.S | re.I)
    if not author:
        return None
    text = Description()
    text.feed(author[1])
    identity = re.fullmatch(r"(.*?)\s*\(@([A-Za-z0-9_]{1,15})\)", "".join(text.text).strip())
    links = Description()
    links.feed(markup)
    if not identity:
        return None
    permalink = next((link for link in links.links if re.fullmatch(rf"/{re.escape(identity[2])}/status/[0-9]{{1,19}}", urlparse(link).path, re.I)), None)
    if not permalink:
        return None
    paragraph = re.search(r"<p>(.*?)</p>", markup, re.S | re.I)
    body = PostBody()
    if paragraph:
        # Nitter sometimes nests an extra <p>; balance it for token extraction.
        inner = re.sub(r"</?p(?:\s[^>]*)?>", "", paragraph[1], flags=re.I)
        body.feed("<p>" + inner + "</p>")
    source_host = urlparse(permalink).hostname
    for token in body.body:
        parsed = urlparse(token.get("href", ""))
        if parsed.hostname == source_host:
            token["href"] = "https://x.com" + parsed.path + ("?" + parsed.query if parsed.query else "")
    return {"name": identity[1], "handle": identity[2], "url": "https://x.com" + urlparse(permalink).path,
            "body": body.body, "media": media}


def parse_feed(raw, account):
    if len(raw) > 2_000_000 or b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("Oversized/unsupported RSS document")
    root = ET.fromstring(raw)
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise ValueError("Source did not return RSS")
    if f"@{account['handle'].lower()}" not in channel.findtext("title", "").lower().split():
        raise ValueError("RSS channel belongs to a different account")
    posts = []
    for item in channel.findall("item"):
        title = item.findtext("title", "")
        # Retweets in Nitter use the ORIGINAL author's URL, never attribute them to this account.
        if re.match(r"^(?:RT by |R to )@", title, re.I):
            continue
        link = urlparse(item.findtext("link", ""))
        match = re.fullmatch(r"/([A-Za-z0-9_]{1,15})/status/([0-9]{1,19})", link.path)
        if not match or match[1].lower() != account["handle"].lower():
            raise ValueError("Unexpected post link/author in RSS")
        date = parsedate_to_datetime(item.findtext("pubDate", ""))
        if date.tzinfo is None:
            raise ValueError("Missing RSS timezone")
        description = Description()
        markup = item.findtext("description", "")
        description.feed(markup)
        attachments = RSSMedia()
        attachments.feed(markup)
        author_name = channel.findtext("title", "").rsplit(" / @", 1)[0]
        avatar = media_url(channel.findtext("image/url", ""))
        posts.append({"id": match[2], "handle": account["handle"], "text": title,
                      "context": " ".join(description.text), "links": description.links,
                      "quoted": description.quote, "date": date.astimezone(timezone.utc),
                      "author": {"name": author_name, "avatar": avatar}, "media": attachments.media,
                      "quote": quoted_post(markup, attachments.quote_media)})
    return posts


def classify(post, rules):
    if post["id"] in rules["deny_ids"]:
        return "reject", "manual exclusion"
    # An attachment's own permalink is not evidence of relevance: every link
    # contains the selected player's handle, even on an unrelated image.
    links = [link for link in post["links"] if not re.fullmatch(
        rf"/{re.escape(post['handle'])}/status/{post['id']}", urlparse(link).path, re.I)]
    context = post["text"] + " " + post["context"] + " " + " ".join(links)
    for link in post["links"]:
        domain = (urlparse(link).hostname or "").lower()
        if any(domain == blocked or domain.endswith("." + blocked) for blocked in rules["blocked_domains"]):
            return "reject", "promotional domain"
    if re.search(rules["promotion_pattern"], context, re.I):
        return "reject", "promotional language or brand"
    if post["id"] in rules["allow_ids"]:
        return "accept", "manual relevance approval"
    if re.search(rules["relevant_pattern"], context, re.I):
        return "accept", "team or game context"
    return "review", "ambiguous relevance"


class EmbedHTML(HTMLParser):
    """Keep official blockquote markup, without executable HTML or unsafe links."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts, self.links, self.stack = [], [], []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "iframe", "object", "svg", "math"):
            self.skip += 1
        if self.skip or tag not in ("blockquote", "p", "a", "br"):
            return
        attrs = dict(attrs)
        if tag == "blockquote":
            self.parts.append('<blockquote class="twitter-tweet" data-dnt="true" data-conversation="none">')
        elif tag == "a":
            url = attrs.get("href", "")
            parsed = urlparse(url)
            if parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password:
                self.links.append(url)
                self.parts.append(f'<a href="{escape(url, quote=True)}" target="_blank" rel="noopener noreferrer">')
            else:
                self.parts.append("<a>")
        else:
            self.parts.append(f"<{tag}>")
        if tag != "br":
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if tag in ("script", "style", "iframe", "object", "svg", "math") and self.skip:
            self.skip -= 1
            return
        if not self.skip and self.stack and self.stack[-1] == tag:
            self.parts.append(f"</{self.stack.pop()}>")

    def handle_data(self, text):
        if not self.skip:
            self.parts.append(escape(text))


def sanitize_embed(html, post):
    if not isinstance(html, str) or len(html) > 250_000:
        raise ValueError("Invalid oEmbed HTML")
    parser = EmbedHTML()
    parser.feed(html)
    while parser.stack:
        parser.parts.append(f"</{parser.stack.pop()}>")
    if not any(urlparse(link).hostname in ("x.com", "twitter.com", "www.twitter.com") and
               urlparse(link).path.lower() == f"/{post['handle']}/status/{post['id']}".lower()
               for link in parser.links):
        raise ValueError("oEmbed does not reference the requested post")
    return "".join(parser.parts)


def cache_embeds(feed, previous, report, offline=False, rules=None):
    now = datetime.now(timezone.utc)
    cached = {post["id"]: post for post in previous.get("posts", [])}
    enriched = []
    for post in feed["posts"]:
        prior = cached.get(post["id"], {})
        cached_at = datetime.fromisoformat(prior["htmlFetchedAt"].replace("Z", "+00:00")) if prior.get("htmlFetchedAt") else None
        if prior.get("html") and cached_at and timedelta(0) <= now - cached_at < timedelta(hours=24):
            post.update(html=sanitize_embed(prior["html"], post), htmlFetchedAt=prior["htmlFetchedAt"])
        elif not offline:
            try:
                query = urlencode({"url": post["url"], "omit_script": "true", "dnt": "true", "hide_thread": "true"})
                request = Request("https://publish.x.com/oembed?" + query,
                                  headers={"User-Agent": "NRGScrapbook/1.0 (oEmbed reader)"})
                with urlopen(request, timeout=15) as response:
                    raw = response.read(250_001)
                if len(raw) > 250_000:
                    raise ValueError("Oversized oEmbed response")
                payload = json.loads(raw)
                post.update(html=sanitize_embed(payload["html"], post), htmlFetchedAt=now.isoformat().replace("+00:00", "Z"))
            except HTTPError as error:
                if error.code in (403, 404, 410):
                    report.append({"id": post["id"], "url": post["url"], "decision": "reject", "reason": "oEmbed unavailable or removed"})
                    continue
                # Keep source attribution even if markup cannot be refreshed.
                report.append({"id": post["id"], "url": post["url"], "decision": "embed unavailable", "reason": f"HTTP {error.code}"})
            except (URLError, TimeoutError, ValueError, KeyError):
                report.append({"id": post["id"], "url": post["url"], "decision": "embed unavailable", "reason": "oEmbed request failed"})
        if post.get("html") and rules:
            description = Description()
            description.feed(post["html"])
            if re.search(rules["promotion_pattern"], " ".join(description.text), re.I):
                report.append({"id": post["id"], "url": post["url"], "decision": "reject", "reason": "promotional text in official oEmbed"})
                continue
        if post.get("html"):
            body = PostBody()
            body.feed(post["html"])
            if body.body:
                # oEmbed appends a generated media link; the native attachment
                # already represents it, so avoid printing a second media URL.
                post["body"] = [token for token in body.body if not (post.get("media") and re.fullmatch(r"pic\.twitter\.com/\S+", token["text"]))]
        enriched.append(post)
    feed["posts"] = enriched
    return feed


def fetch_feed(account, sources):
    for source in sources:
        parsed = urlparse(source)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("RSS source must be a public HTTPS origin without credentials")
        url = source.rstrip("/") + "/" + account["handle"] + "/rss"
        for attempt in range(2):
            try:
                request = Request(url, headers={"User-Agent": "NRGScrapbook/1.0 (public RSS reader)", "Accept": "application/rss+xml, application/xml"})
                with urlopen(request, timeout=20) as response:
                    raw = response.read(2_000_001)
                return parse_feed(raw, account)
            except HTTPError as error:
                if error.code not in (404, 429, 500, 502, 503, 504):
                    break
            except (URLError, TimeoutError, ValueError, ET.ParseError):
                pass
            if attempt == 0:
                time.sleep(2)
    raise RuntimeError(f"No usable RSS for @{account['handle']}; previous snapshot preserved")


def build_feed(collected, rules, now):
    accepted, report = {}, []
    cutoff = now - timedelta(days=rules["lookback_days"])
    for posts in collected:
        for post in sorted(posts, key=lambda post: post["date"], reverse=True)[:rules["max_posts_per_account"]]:
            if not cutoff <= post["date"] <= now:
                continue
            decision, reason = classify(post, rules)
            url = f"https://x.com/{post['handle']}/status/{post['id']}"
            if decision == "accept":
                accepted[post["id"]] = {"id": post["id"], "handle": post["handle"],
                                         "createdAt": post["date"].isoformat().replace("+00:00", "Z"), "url": url,
                                         "text": post["text"], "author": post.get("author"),
                                         "media": post.get("media", []), "quote": post.get("quote")}
            else:
                report.append({"id": post["id"], "handle": post["handle"], "url": url,
                               "text": post["text"], "decision": decision, "reason": reason})
    posts = sorted(accepted.values(), key=lambda post: (post["createdAt"], int(post["id"])), reverse=True)
    return {"updatedAt": now.isoformat().replace("+00:00", "Z"), "posts": posts}, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fixture-dir", type=Path, help="Use saved public RSS files; no network")
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument("--report", type=Path, default=ROOT / ".local/social-review.json")
    args = parser.parse_args()
    accounts, rules = read_json(ACCOUNTS), read_json(RULES)
    if not 1 <= rules["lookback_days"] <= 30 or not 1 <= rules["max_posts_per_account"] <= 100:
        raise ValueError("Invalid feed window/limit")
    collected = []
    for account in accounts:
        if args.fixture_dir:
            posts = parse_feed((args.fixture_dir / (account["handle"] + ".xml")).read_bytes(), account)
        else:
            posts = fetch_feed(account, rules["sources"])
        collected.append(posts)
    # All nine must succeed before writing anything; don't erase a failed account.
    feed, report = build_feed(collected, rules, datetime.now(timezone.utc))
    previous = read_json(args.out) if args.out.exists() else {}
    feed = cache_embeds(feed, previous, report, offline=bool(args.fixture_dir), rules=rules)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.out.parent.mkdir(parents=True, exist_ok=True)
    temp = args.out.with_suffix(".tmp")
    temp.write_text(json.dumps(feed, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp.replace(args.out)
    print(f"Accepted {len(feed['posts'])} posts; excluded/held {len(report)}. No X API calls.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Social feed update failed: {error}", file=sys.stderr)
        sys.exit(1)
