# StarkAccess SDK Publication & Distribution Guide

This guide explains how to make the `starkaccess-sdk` available to other developers.

## 1. Publishing to NPM (Recommended)

To make the SDK available via `npm install starkaccess-sdk`, follow these steps:

### Prerequisites
- An [NPM account](https://www.npmjs.com/signup).
- Your package name `starkaccess-sdk` should be available (or use a scoped name like `@your-org/starkaccess-sdk`).

### Steps
1. **Login to NPM**:
   ```bash
   npm login
   ```
2. **Verify Package (Dry Run)**:
   ```bash
   npm publish --dry-run
   ```
   *Review the output to ensure only `src/`, `README.md`, and `LICENSE` are included.*
3. **Publish**:
   ```bash
   npm publish --access public
   ```

---

## 2. Using as a Git Dependency

If you don't want to publish to NPM yet, others can install it directly from your GitHub repository:

```bash
npm install moses-Dera/accessmanager-zk#sdk
```
*(Note: This assumes the SDK is in a branch or subdirectory compatible with NPM's git install logic. For a monorepo, it's better to publish to a registry.)*

---

## 3. Local Development (Linking)

For testing the SDK in another local project without publishing:

1. **Inside the `sdk/` directory**:
   ```bash
   npm link
   ```
2. **Inside your other project**:
   ```bash
   npm link starkaccess-sdk
   ```

---

## 4. GitHub Releases & Actions

You can automate the publication using GitHub Actions. Create a workflow in `.github/workflows/publish.yml`:

```yaml
name: Publish SDK
on:
  release:
    types: [created]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
        working-directory: ./sdk
      - run: npm publish --access public
        working-directory: ./sdk
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## 🛡️ Package Integrity Check

Before every release, run:
```bash
npm pack
```
This generates a `.tgz` file. Decompress it to verify that no sensitive files (like `.env` or internal tests) are included. Our `package.json` "files" field currently includes:
- `src/` (Core logic)
- `README.md` (Documentation)
- `LICENSE` (MIT)
