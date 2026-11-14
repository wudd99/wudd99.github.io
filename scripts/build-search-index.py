"""Index only posts present in the published blog list; never index unlisted copies.

Run after editing a post or the blog list: python scripts/build-search-index.py
Tags are declared on each blog card's data-tags attribute, separated by commas.
"""
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import json
import re
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


class PlainText(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def plain(source):
    parser = PlainText()
    parser.feed(source)
    return ' '.join(' '.join(parser.parts).split())


posts = []
listing = (ROOT / 'blog/index.html').read_text()
for attrs, card in re.findall(r'<article\b([^>]*class="blog-card\b[^>]*)>(.*?)</article>', listing, re.S):
    match = re.search(r'<h3>\s*<a href="([^"]+)"[^>]*>(.*?)</a>', card, re.S)
    if not match:
        raise ValueError('Published blog card has no title link')
    url = urlsplit(unescape(match[1])).path
    path = (ROOT / url.lstrip('/') / 'index.html').resolve()
    if not path.is_relative_to(ROOT.resolve()):
        raise ValueError('Post path must stay inside dist')
    source = path.read_text()
    content = source.split('<div class="post-content">', 1)[1].split('</article>', 1)[0]
    summary = re.search(r'<p class="summary">(.*?)</p>', card, re.S)
    tags = re.search(r'data-tags="([^"]*)"', attrs)
    posts.append({
        'url': url,
        'title': plain(match[2]),
        'summary': plain(summary[1]) if summary else '',
        'content': plain(content),
        'tags': [tag.strip() for tag in unescape(tags[1]).split(',') if tag.strip()] if tags else [],
    })

if len({post['url'] for post in posts}) != len(posts):
    raise ValueError('Duplicate published post URL')
(ROOT / 'blog/search-index.json').write_text(json.dumps(posts, ensure_ascii=False, indent=2) + '\n')
print(f'Indexed {len(posts)} published post(s), including full text and tags.')
