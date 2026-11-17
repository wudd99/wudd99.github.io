"""Validate deploy output and verify new Markdown content propagates through Hugo."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import base64
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile

PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = Path(sys.argv[1] if len(sys.argv) > 1 else PROJECT / 'public').resolve()


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.nodes = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        self.nodes.append((tag, dict(attrs)))

    def with_class(self, name):
        return [attrs for _, attrs in self.nodes if name in attrs.get('class', '').split()]


def validate(output):
    pages = list(output.rglob('*.html'))
    assert pages, 'No generated HTML'
    for path in pages:
        text = path.read_text()
        assert 'ZgotmplZ' not in text and 'hugo: raw HTML omitted' not in text, path
        page = Page(path)
        if any(t == 'meta' and a.get('http-equiv', '').lower() == 'refresh' for t, a in page.nodes):
            continue  # Hugo's alias redirect does not render the theme shell.
        ids = [a['id'] for _, a in page.nodes if 'id' in a]
        assert not [i for i, n in Counter(ids).items() if n > 1], f'Duplicate IDs in {path}'
        assert not any(t == 'meta' and a.get('name') == 'robots' and 'noindex' in a.get('content', '') for t, a in page.nodes), 'Production must remain indexable'
        for tag, attrs in page.nodes:
            ref = attrs.get('src') if tag in ('img', 'script') else attrs.get('href') if tag in ('a', 'link') else None
            if not ref:
                continue
            url = urlsplit(ref)
            if url.netloc and url.netloc != 'yihaow.com':
                continue
            if url.scheme and url.scheme not in ('https', 'http'):
                continue
            target = (output / unquote(url.path).lstrip('/')) if url.path.startswith('/') else (path.parent / unquote(url.path))
            if url.path:
                assert target.exists(), f'Missing local target {ref} on {path}'
            if attrs.get('integrity'):
                algorithm, digest = attrs['integrity'].split('-', 1)
                assert base64.b64encode(hashlib.new(algorithm, target.read_bytes()).digest()).decode() == digest, f'Invalid resource fingerprint: {ref}'
        assert page.with_class('social-links'), f'Missing profile on {path}'
        assert any(a.get('href') == 'mailto:yihao_wu@ucsb.edu' for _, a in page.nodes), 'Missing email action'
    for css in (output / 'css').glob('*.css'):
        import re
        for ref in re.findall(r'url\([\'"]?(/[^)\'"\s]+)', css.read_text()):
            assert (output / unquote(urlsplit(ref).path).lstrip('/')).is_file(), f'Missing CSS resource {ref}'
    home = Page(output / 'index.html')
    assert any(a.get('data-page') == 'home' for t, a in home.nodes if t == 'body')
    assert home.with_class('publication-card') and home.with_class('poster-card')
    assert all(a.get('data-pub-type') and a.get('data-pub-topics') for a in home.with_class('publication-card'))
    listing = Page(output / 'blog/index.html')
    assert any(a.get('data-page') == 'blog-list' for t, a in listing.nodes if t == 'body'), 'Blog JS requires blog-list page marker'
    index = json.loads((output / 'blog/search-index.json').read_text())
    assert len(index) == len(listing.with_class('blog-card')), 'Search index disagrees with visible blog cards'
    for item in index:
        post = Page(output / item['url'].strip('/') / 'index.html')
        assert any(a.get('data-page') == 'blog-post' for t, a in post.nodes if t == 'body')
        assert post.with_class('post-content') and item['content']
        assert isinstance(item['tags'], list)
    assert (output / 'CNAME').read_text().strip() == 'yihaow.com'
    assert 'Allow: /' in (output / 'robots.txt').read_text()


validate(OUTPUT)
with tempfile.TemporaryDirectory(prefix='yihao-markdown-') as temporary:
    root = Path(temporary)
    content = root / 'content'
    shutil.copytree(PROJECT / 'content', content)
    # Exercise real content edits without changing the repository or deploying fixtures.
    home = content / '_index.md'
    home.write_text(home.read_text().replace('## Welcome!', '## Markdown migration fixture'))
    for slug, extra in [('published', ''), ('draft', 'draft: true\n'), ('future', 'publishDate: 2999-01-01\n')]:
        (content / 'blog' / f'migration-{slug}.md').write_text('---\ntitle: "Migration ' + slug + '"\ndate: 2020-01-01\nsummary: "Fixture summary"\ntags: ["Test & Tags", "研究"]\n' + extra + '---\n\n## Fixture heading\n\nFull-text-marker ZX817 appears only in the body.\n')
    (content / 'blog' / 'migration-no-tags.md').write_text('---\ntitle: No tags fixture\ndate: 2020-01-01\n---\nBody without optional metadata.')
    subprocess.run([os.environ.get('HUGO_BIN', 'hugo'), '--source', str(PROJECT), '--contentDir', str(content), '--destination', str(root / 'output'), '--cleanDestinationDir', '--noBuildLock'], check=True, stdout=subprocess.DEVNULL)
    built = root / 'output'
    assert 'Markdown migration fixture' in (built / 'index.html').read_text(), 'Home Markdown stopped rendering'
    index = json.loads((built / 'blog/search-index.json').read_text())
    new = next(item for item in index if item['title'] == 'Migration published')
    assert 'ZX817' in new['content'] and new['summary'] == 'Fixture summary'
    assert new['tags'] == ['Test & Tags', '研究']
    assert not any(item['title'] in ('Migration draft', 'Migration future') for item in index)
    listing = Page(built / 'blog/index.html')
    assert any(a.get('data-tags') == 'Test & Tags,研究' for a in listing.with_class('blog-card'))
    assert any(urlsplit(a.get('href', '')).query == 'tag=Test+%26+Tags' for _, a in listing.nodes), 'Tag URL escaping broke'
    validate(built)
print('Build validated: local links, assets, fingerprints, profile, filters and Markdown-driven search; drafts/future posts excluded.')
