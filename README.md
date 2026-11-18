# Yihao Wu's academic website

`source` contains the editable Hugo project. GitHub Actions builds it with Hugo **0.145.0 Extended** and publishes the result to `main` (https://yihaow.com/). Edit `source`; generated HTML on `main` is overwritten by the next deployment.

## Editing content

- `content/_index.md`: introduction, publications, posters, academic service, contact information, and the `timeline.items` front matter.
- `content/blog/*.md`: blog articles. Front matter supports `title`, `date`, `cover`, `summary`, and `tags`. Search indexes titles, summaries, full text and tags automatically at build time; drafts and future-dated posts stay unpublished.
- `config.toml`: profile name, subtitle, images, social links, email and site metadata. The email button opens the visitor's email application using `mailto:`.
- `static/files/papers/`: publication PDFs; use `/files/papers/filename.pdf` in publication shortcodes.
- `static/images/`: images and local SVG icons. `static/fonts/`: locally hosted Lato and Zhuque Fangsong with their license/source notices.

Keep the existing shortcodes (`section`, `pubs`, `publication-card`, `poster`, `poster-card`) when updating the home page. Publication cards accept `type`, `topic` (or `topics`), `source`, `sourcelink`, `pagelink`, `pdf`, and optional `remark`/`remarkcolor`. Their filters and numbering are generated automatically. The Chinese profile font is currently a small subset for 吴逸豪; changing that name requires updating the subset or providing a full font.

## Theme and validation

Theme templates are in `themes/wyh_card_style/layouts/`. CSS and JavaScript live in `themes/wyh_card_style/assets/`; Hugo fingerprints them for cache invalidation. `macaron.css` supplies mint, lavender, apricot, and cream colors. The liquidGL adapter adds decorative refraction over the prism wallpaper. The vendor script is fingerprinted by Hugo and loaded on demand. Open `/?glass=off` to use the baseline material.

```sh
hugo server
```

Before pushing:

```sh
node --test tests/performance.test.cjs
hugo --cleanDestinationDir
python3 tests/check-build.py public
```

The integration check also builds temporary Markdown fixtures using the `hugo` command (or the `HUGO_BIN` environment variable). To regenerate the starfield after editing `static/images/soft-tile.svg`, run `python3 scripts/build-starfield.py`.
