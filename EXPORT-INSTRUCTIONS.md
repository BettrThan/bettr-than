# Bettr Than — Version 40 source export

Saved version: 40
Source commit: 9494dbf7435faaf1108d1865a975b626d72db3d6

## Contents
All 317 tracked files from the exact saved commit, unchanged. Includes application code, local images/fonts, research datasets, tests, dependency lockfile, database schema/migrations, and documentation. EXPORT-INSTRUCTIONS.md and EXPORT-MANIFEST.json are export-only additions.

This ZIP excludes Git history, installed dependencies, local caches, build output, runtime secrets, and the live production database. Tracked font assets are retained. Source files have not been modified for a different hosting provider.

## Put the source in your GitHub repository (Windows)
1. Download this ZIP and use Extract All.
2. Clone https://github.com/BettrThan/bettr-than with GitHub Desktop to a local folder.
3. Open the extracted Bettr-Than-v40 folder. Copy ALL of its contents into the cloned repository folder. Copy the contents, not the enclosing folder, so package.json sits at the repository root. Include hidden configuration files. Replace the existing starter README if prompted; preserve the clone's .git folder.
4. Review the changed files in GitHub Desktop, commit with a message such as "Import Bettr Than version 40", then push to origin.

Do not upload the ZIP itself as the source: GitHub does not unpack uploaded ZIPs into repository files. This export does not push anything or establish automatic sync.

## Running and deployment
The included README describes the Linux-based build scripts. Node.js >=22.13.0 is required. On Windows, use a Linux environment such as WSL for these scripts.

This app uses Cloudflare D1 and Sites-managed authentication/runtime bindings. GitHub stores the code; uploading does not deploy a working copy or move production data. Hosting outside Sites requires configuring the database, environment, and a trusted authentication layer. Never expose protected admin routes by trusting client-supplied authentication headers.

## Integrity
EXPORT-MANIFEST.json lists the SHA-256 and byte length of every source file. The export was checked against the exact Git blobs and the ZIP integrity check passed.
