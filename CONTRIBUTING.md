# Contributing to MetroViz-NC

Thanks for your interest!

---

## Quick start

```bash
git clone https://github.com/sys-cr/metroviz-nextcloud-app.git
cd metroviz-nc
npm install
composer install
```

See [`docs/dev/README.md`](./docs/dev/README.md) for the developer
overview.

---

## Ground rules

1. **Don't modify `js/metroviz/` unless you must.** That tree is an
   upstream fork of [rstockm/Metroviz](https://github.com/rstockm/Metroviz).
   Edits there create merge cost forever. Put adapter code in the
   `js/nc-*.js` files at the same level instead.
2. **No CDN fetches.** All vendor JS is mirrored into `js/vendor/`
   from `package.json`-pinned versions.
3. **Both `de` and `en` translations in the same commit.**
4. **No secrets in git.**

---

## Reporting bugs

Open a GitHub issue with:

- Nextcloud version (`occ status`)
- PHP version (`php -v`)
- Browser + OS
- Steps to reproduce
- What you expected vs. what happened
- Browser DevTools console output if relevant

For security issues, please **do not** open a public issue. Email the
maintainer (see [`appinfo/info.xml`](./appinfo/info.xml) for the
contact).

---

## License

By contributing you agree that your contributions will be licensed
under the [MIT License](./LICENSE) of this project.
