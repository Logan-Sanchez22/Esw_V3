# Gryph Gardens — Development Setup Guide

Welcome! This guide walks you from a completely empty computer to running the Gryph Gardens app on your own phone. Follow it top to bottom, in order. Every command tells you exactly which folder to run it from.

> **This guide was written by inspecting the actual repository**, not from a generic template. If something here doesn't match what you see on your screen, stop and ask — don't guess.

---

## 1. What You Are Setting Up

**Gryph Gardens** is a mobile app (built with [Expo](https://expo.dev)/React Native) where users complete real-world sustainability "Quests" (recycle something, bike to campus, etc.), earn points, and spend those points decorating a virtual garden. It has two garden views (an isometric 3D-style view and a top-down view) that share the same underlying garden data.

### The repository is a single project — not split into "mobile" and "web" folders

Unlike some setups, **this repository is one Expo app**, sitting at the root of the repo. There is no separate `mobile/` or `web/` directory. The exact same codebase can run as:

- an app on your phone via **Expo Go** (this is what you'll do — and what the club demo uses)
- an iOS/Android build (not needed for this guide — no one on the team currently does this)
- a website (`npm run web` — not needed for this guide; nobody currently deploys this)

**If your goal is to run the mobile app and contribute to it, everything you need is in this one repository.** You do not need to install Xcode, Android Studio, Docker, or any database software just to see the app running on your phone.

### The pieces of this project, briefly

| Part | What it is | Do you need it for the demo? |
|---|---|---|
| The Expo/React Native app (`src/app/`, `src/components/`, etc.) | The actual mobile app | **Yes — this is the whole point** |
| Clerk (sign-in) | Handles user accounts | **Yes — the app will not even open without this configured** |
| Neon Postgres + Drizzle ORM (`src/db/`) | Cloud database that syncs your garden across devices | Not required to *see the app run*, but the app expects it to exist — see the warning in Section 9 |

---

## 2. Before You Start

- **Supported computer**: Windows, macOS, or Linux all work fine for this project. Nothing in this repo requires a specific OS.
- **Computer specs**: Nothing unusual — any laptop/desktop from the last several years that can run a modern web browser and a code editor is fine.
- **Internet connection**: Required throughout — for installing software, cloning the repository, and downloading app dependencies (which is a genuinely large download; see Section 9).
- **A phone**: You need a real iPhone or Android phone to see the app the way it's meant to be demoed. (There are other ways to preview an Expo app without a physical phone, but they require extra software like Xcode or Android Studio — this guide does not cover them, since the team's normal workflow is a real phone with Expo Go.)
- **USB cable**: Not required. This project runs over Wi-Fi.
- **Same Wi-Fi network**: Yes — **your phone and your computer normally need to be on the same Wi-Fi network** for the default connection mode. Details and workarounds are in Section 13.
- **Accounts you'll need**:
  - A **GitHub account** (to access the code)
  - **Clerk API keys** and a **database connection string**, which someone on the team needs to give you — see the warning box in Section 9. You cannot get these yourself; they come from whoever manages the project's Clerk and Neon accounts.

---

## 3. Install Git

Git is the tool that downloads ("clones") the project's code to your computer and tracks changes.

### Windows

1. Go to **[git-scm.com/download/win](https://git-scm.com/download/win)**. The download should start automatically for the 64-bit installer.
2. Run the installer. When it asks about options, **the defaults are fine for everything** — just click "Next" through the installer. (If you want one recommendation: on the "Adjusting your PATH environment" step, keep the default selected option, "Git from the command line and also from 3rd-party software.")
3. Finish the installer.
4. Open a fresh terminal (search for "Command Prompt", "PowerShell", or "Git Bash" — any of these work) and check it installed:

   ```bash
   git --version
   ```

   You should see something like `git version 2.4x.x.windows.1`. Any recent 2.x version is fine.

### macOS

Git usually comes preinstalled or installs itself the first time you use it.

1. Open the **Terminal** app (search for it with Spotlight, `Cmd + Space`).
2. Type:

   ```bash
   git --version
   ```

3. If Git isn't installed, macOS will pop up a prompt to install the "Command Line Developer Tools" — click **Install** and wait for it to finish, then run the command again.
4. If you'd rather install it manually (or want a newer version), download it from **[git-scm.com/download/mac](https://git-scm.com/download/mac)**, or if you have [Homebrew](https://brew.sh) installed, run `brew install git`.

### Linux

Use your distribution's package manager, for example on Ubuntu/Debian:

```bash
sudo apt update
sudo apt install git
```

Then verify with `git --version` as above.

---

## 4. Install Node.js

Node.js is required to run this project's tooling (`npm`, Expo, Metro).

> **Note on versions**: This repository does not pin an exact Node.js version anywhere (no `.nvmrc`, no `engines` field in `package.json`). The safe choice is the **current Active LTS release of Node.js** — Expo SDK 57 (what this project uses) expects a modern, actively-supported Node version. If your team lead has a specific version they want everyone to standardize on, they should add a `.nvmrc` file to the repo (see "Team Lead Decisions Needed" at the end of this guide) — until then, LTS is the right default.

### Windows and macOS

1. Go to **[nodejs.org](https://nodejs.org)**.
2. Download the button labeled **LTS** (not "Current"). LTS means "Long-Term Support" — the stable, recommended version.
3. Run the installer and accept the defaults.
4. Open a fresh terminal and verify:

   ```bash
   node --version
   npm --version
   ```

   You should see version numbers, for example `v22.x.x` for Node and `10.x.x` for npm. (npm installs automatically with Node — you don't install it separately.) Any current LTS major version works.

### Linux / if you want to switch Node versions easily

Many developers use **nvm** (Node Version Manager) instead of the installer above, especially useful if you ever need multiple Node versions on one machine:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Then restart your terminal and run:

```bash
nvm install --lts
nvm use --lts
```

Verify the same way with `node --version` and `npm --version`.

> ⚠️ **Do not use Yarn or pnpm for this project.** The repository has a committed `package-lock.json`, which means **npm** is the package manager this project uses. Mixing package managers can create a second, conflicting lockfile and cause confusing dependency bugs.

---

## 5. Install an Editor

The team's recommended editor is **Visual Studio Code** — the repository itself has a `.vscode/extensions.json` file recommending an extension for it, which tells us this is the intended editor.

1. Download it from **[code.visualstudio.com](https://code.visualstudio.com)**.
2. Run the installer with default options.
3. Once the project is cloned (Section 7), open it by either:
   - Right-clicking the project folder → "Open with Code", or
   - Inside VS Code: **File → Open Folder…** and select the cloned `Esw_V3` folder.

### Extensions

The repository recommends exactly one extension — VS Code will actually prompt you to install it automatically the first time you open the project folder:

- **Expo Tools** (`expo.vscode-expo-tools`) — adds Expo-specific editor support.

You don't need anything beyond this to get the app running. (Feel free to add personal-preference extensions like a Prettier or ESLint integration later, but they aren't required.)

---

## 6. Get Access to the GitHub Repository

The code lives at:

```
https://github.com/Logan-Sanchez22/Esw_V3
```

Before you can clone it, you need:

1. **A GitHub account.** If you don't have one, create one free at [github.com](https://github.com).
2. **Access to this specific repository.** This repository is not necessarily public — ask whoever manages it (your team lead) to **add your GitHub username as a collaborator**. Send them the email address or username tied to your GitHub account.
3. **Confirm you have access**: open `https://github.com/Logan-Sanchez22/Esw_V3` in your browser while signed into GitHub. If you can see the code (not a 404 page), you're in.

If you try to clone and get a **permission denied / repository not found** error, it almost always means you haven't been added as a collaborator yet, or you're signed into the wrong GitHub account on your computer. Double-check both with your team lead before troubleshooting further.

---

## 7. Clone the Repository

Open a terminal, navigate to wherever you keep your coding projects (for example `cd Documents` or `cd projects`), and run:

```bash
git clone https://github.com/Logan-Sanchez22/Esw_V3
```

This downloads the entire project into a new folder named `Esw_V3`.

Move into it:

```bash
cd Esw_V3
```

Verify you're in the right place — this should list the project's files:

```bash
ls
```

(On Windows Command Prompt, use `dir` instead of `ls`.) You should see files like `package.json`, `app.json`, and folders like `src`, `assets`, and `constants`.

> ⚠️ **Which branch am I on?** By default, cloning gives you the `main` branch. Run `git branch --show-current` to confirm. **Ask your team lead whether `main` currently has the latest, demo-ready code**, or whether you should check out a different branch — see "Team Lead Decisions Needed" at the end of this guide.

---

## 8. Understand the Project Structure

Here is the actual top-level layout of this repository:

```text
Esw_V3/
├── src/
│   ├── app/                 ← Every screen in the app lives here (Expo Router "file-based routing" —
│   │                           each file is a screen; folder names in parentheses group screens)
│   │   ├── (auth)/           — Sign-in / sign-up screens
│   │   ├── (tabs)/           — The 5 main app screens (Home, Isometric Garden,
│   │   │                       Top-Down Garden, Quests, Settings) and the bottom tab bar
│   │   ├── api/               — Server-side API routes (e.g. saving/loading a garden)
│   │   ├── onboarding.tsx    — First-launch intro screens
│   │   └── _layout.tsx        — The app's root wrapper (fonts, providers, auth gate)
│   ├── components/          ← Reusable UI pieces (buttons, cards, the garden grids, etc.)
│   ├── context/              ← Shared app state (garden data, quests, sound/theme preferences)
│   ├── lib/                  ← Core logic that isn't tied to any screen (garden rules, sound, etc.)
│   └── db/                   ← Database schema + connection (Drizzle ORM, only used server-side)
├── constants/                ← Design tokens (colors, spacing, fonts) and static app data
├── assets/                   ← Images, fonts, and sound files bundled into the app
├── drizzle/                  ← Generated SQL migration files for the database
├── app.json                  ← Expo's app configuration (name, icon, plugins, etc.)
├── package.json               ← Dependencies and npm scripts (see Section 9)
├── tsconfig.json              ← TypeScript configuration
├── .env.example                ← Template for the environment variables you need to create (see Section 9)
└── drizzle.config.ts          ← Configuration for the database migration tool
```

**You do not need to memorize this.** The one thing to remember: **all commands in this guide are run from the root `Esw_V3` folder** — the one you just `cd`'d into. There is no separate subfolder to `cd` into for "the mobile app" — you're already in it.

---

## 9. Install Mobile Dependencies

Still inside the `Esw_V3` folder, run:

```bash
npm install
```

### What this does

- Reads `package.json` and `package-lock.json`
- Downloads every library the app depends on (React Native, Expo, Clerk, etc.) into a new `node_modules/` folder
- This folder is large (typically several hundred MB) and is never committed to Git — that's expected and normal

### What to expect

- This can take anywhere from **1 to 10+ minutes** depending on your internet speed — it's a genuinely large project.
- You may see warnings about deprecated sub-dependencies scroll by. **Warnings are normal and expected; only stop if you see the word `ERROR` or the command exits with a failure.**
- When it finishes successfully, you'll see a summary line like `added 1200 packages in 45s` and be returned to your prompt.

### Common `npm install` problems

| Symptom | Likely cause |
|---|---|
| Command hangs for a very long time with no output | Slow or unstable internet — let it keep running, or try again |
| `EACCES` / permission errors | Usually means Node was installed in a way that needs admin rights for global installs — reinstalling Node via the official installer (Section 4) usually fixes this; avoid using `sudo npm install` |
| Errors mentioning a specific package failing to build | Copy the exact error and ask the team — don't guess at fixes here, since this varies by machine |

### ⚠️ Environment variables — required before the app will run at all

This project uses a `.env` file for secrets that are never committed to Git (you can see this in `.gitignore`). The repository includes a **template** at `.env.example`. Copy it:

```bash
cp .env.example .env
```

(On Windows Command Prompt: `copy .env.example .env`)

Then open `.env` in your editor and fill in three values:

| Variable | What it's for | Required to launch the app at all? |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Sign-in/sign-up (Clerk) | **Yes — the app crashes immediately on launch without this.** |
| `CLERK_SECRET_KEY` | Lets the app's own server-side code verify who's signed in | Needed for garden data to sync to the cloud; the app still opens without it |
| `DATABASE_URL` | Connection string to the project's Neon Postgres database | Needed for garden data to sync to the cloud; the app still opens without it |

> ⚠️ **You cannot generate these values yourself.** They come from the project's Clerk dashboard and Neon dashboard, which your team lead controls access to. **Ask your team lead for these three values before continuing** — see "Team Lead Decisions Needed" at the end of this guide. Without at least `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, the app will show an error screen every time you try to open it (this is a deliberate, hard-coded check in `src/app/_layout.tsx`, not a bug).
>
> If you only have the Clerk key and not the database credentials, the app will still run and you'll be able to sign in and build a garden — it just won't back your garden up to the cloud (it's saved on your device either way).

---

## 10. Expo Setup

Here's exactly how this project uses Expo, based on `package.json`:

- **You do not need to install any global CLI tool.** There is no `expo-cli` package and no instruction anywhere in this repo to install one globally. The commands below use the project's *local* copy of Expo (via `npm run` scripts, or `npx expo`, which automatically uses the version installed in `node_modules/`).
- **Expo SDK version**: `~57.0.22` (see `expo` in `package.json`). This matters because your **Expo Go app must support SDK 57** — see Section 11.
- **How the app starts**: `package.json` defines these scripts, all meant to be run from the `Esw_V3` root folder:

  | Command | What it does |
  |---|---|
  | `npm start` | Starts the Expo development server (same as `npx expo start`) |
  | `npm run android` | Starts the server and tries to open an Android emulator (not needed for this guide) |
  | `npm run ios` | Starts the server and tries to open an iOS simulator (not needed for this guide) |
  | `npm run web` | Starts the server in web-browser mode |
  | `npm run lint` | Runs Expo's linter |

  For this guide, you only need `npm start`.

- **Expo Go** is the sandbox app on your phone that runs this project without you needing to build a native app yourself. That's the tool you'll use for the demo.

---

## 11. Install Expo Go on the Phone

### iPhone

1. Open the **App Store**.
2. Search for **Expo Go**.
3. Install it.
4. Open it once after installing (just to confirm it launches).
5. **You do not need to sign in** to Expo Go to run this project — you'll connect by scanning a QR code (Section 12), which doesn't require an Expo account.

### Android

1. Open the **Google Play Store**.
2. Search for **Expo Go**.
3. Install it.
4. Open it once after installing.
5. Same as above — **no sign-in required** for this project's workflow.

> ⚠️ **SDK compatibility**: Expo Go on the app stores only supports specific SDK versions at a time. This project uses **SDK 57**. If, after installing Expo Go, you get an "incompatible" or "project uses a different SDK" error when trying to open the project (Section 12–13), your installed Expo Go version doesn't yet support SDK 57. See Section 16 for what to do.

---

## 12. Run the First Project

From the `Esw_V3` root folder (the same place you ran `npm install`):

```bash
npx expo start
```

(`npm start` does the exact same thing — either works.)

### What happens next

1. A tool called **Metro** (React Native's bundler) starts up and prepares your JavaScript code to be sent to your phone.
2. After a few seconds, a **QR code** appears in your terminal, along with a small menu of keyboard shortcuts.
3. A webpage may also open in your browser showing the same QR code and some developer tools — this is optional to use, you can ignore it and work entirely from the terminal and your phone.

### Opening the app

**On iPhone:**
- Open your phone's **Camera** app (not Expo Go itself) and point it at the QR code in your terminal/browser.
- Tap the notification banner that appears — it will open the project directly in Expo Go.

**On Android:**
- Open the **Expo Go** app itself.
- Tap **"Scan QR code"** inside the app.
- Point it at the QR code.

### Useful terminal shortcuts while the server is running

With the terminal window focused, you can press:
- `r` — reload the app
- `m` — toggle the developer menu
- `a` — try to open on a connected Android emulator (not relevant for this guide)
- `i` — try to open on an iOS simulator (not relevant for this guide)
- `Ctrl + C` — stop the server

---

## 13. Connecting the Phone

**By default, your phone and your computer need to be on the same Wi-Fi network.** This is how Expo's default "LAN" connection mode finds your computer from your phone.

### If the QR code doesn't work, or your phone can't connect

Work through these in order:

1. **Confirm Wi-Fi.** Check that your phone and computer show the exact same Wi-Fi network name. This is the single most common cause of connection failures.
2. **Computer on Ethernet instead of Wi-Fi?** This breaks LAN discovery even if your phone is on the right Wi-Fi network, since your computer isn't on that Wi-Fi network at all. Either connect your computer to the same Wi-Fi too, or use Tunnel mode (below).
3. **VPN enabled?** Turn it off. VPNs frequently route traffic in a way that breaks LAN discovery between devices on the same physical network.
4. **Windows Firewall prompt.** The first time you run `npx expo start` on Windows, you may get a firewall permission popup for Node.js — click **Allow** (for both private and public networks if asked). If you accidentally denied it, you'll need to allow "Node.js JavaScript Runtime" manually in Windows Defender Firewall settings.
5. **Some corporate/campus Wi-Fi networks block device-to-device connections** even when both devices are technically on the same network (common on university Wi-Fi, which is worth knowing given this is a club project on a campus network). If you suspect this, use Tunnel mode instead:

   ```bash
   npx expo start --tunnel
   ```

   This routes the connection through the internet instead of your local network, so same-Wi-Fi is no longer required — but it's slower to load. The first time you use it, it may prompt to install an additional package (`@expo/ngrok`) — accept that prompt.

6. Still stuck? Press `w` in the terminal (or check the browser dev tools page) for more detailed connection diagnostics, or ask a teammate to try connecting to rule out a phone-specific issue.

---

## 14. Verify Everything Works

```text
[ ] Git installed (git --version works)
[ ] Node.js installed (node --version and npm --version work)
[ ] VS Code installed
[ ] GitHub repository accessible in your browser
[ ] Repository cloned (you have an Esw_V3 folder)
[ ] .env file created with at least EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY filled in
[ ] Mobile dependencies installed (npm install finished without errors)
[ ] Expo Go installed on your phone
[ ] npx expo start runs and shows a QR code
[ ] Phone connected and the app opened
[ ] Gryph Gardens launches (past the onboarding/sign-in screen)
[ ] You can sign in and see the Home screen with garden/quest cards
```

### You're done

If every box above is checked, you have a fully working Gryph Gardens development setup. You can now make changes to the code in your editor and see them reflected on your phone automatically (Expo "Fast Refresh" reloads the app as you save files).

---

## 15. First Git Workflow

You don't need to be a Git expert to contribute safely — here's the everyday loop.

### Checking your status

From the `Esw_V3` folder:

```bash
git status
```

Shows which files you've changed. Run this often — it's always safe.

### Getting the latest changes before you start working

```bash
git pull
```

Do this **every time you sit down to work**, before making changes, so you're not working on outdated code.

### Saving your work

```bash
git add .
git commit -m "A short description of what you changed"
git push
```

- `git add .` stages all your changed files
- `git commit -m "..."` saves a snapshot with a message describing what you did
- `git push` uploads your commits to GitHub so teammates can see them

### What is a branch?

A branch is an independent line of work — think of it as your own copy of the project you can safely experiment on without affecting everyone else's code. Check which branch you're currently on:

```bash
git branch --show-current
```

To create a new branch and switch to it (a common pattern before starting a new feature or fix):

```bash
git checkout -b your-name/short-description
```

To switch back to an existing branch:

```bash
git checkout main
```

### If Git reports a conflict

A conflict means Git found two changes to the same lines of a file and doesn't know which one you want. Don't panic and don't force anything:

1. Run `git status` — it will list which files have conflicts.
2. Open those files in your editor — Git marks the conflicting sections with `<<<<<<<`, `=======`, and `>>>>>>>`.
3. Edit the file by hand to keep the correct version (or a combination), then delete the `<<<<<<<`/`=======`/`>>>>>>>` marker lines.
4. Run `git add .` on the fixed files, then `git commit` to finish resolving it.

If this feels confusing the first time, that's completely normal — ask a teammate to walk through it with you rather than guessing.

---

## 16. Common Problems & Fixes

| Problem | Fix |
|---|---|
| **`git: command not found` / `'git' is not recognized`** | Git isn't installed, or your terminal was opened before installing it. Reinstall following Section 3, then open a **brand-new** terminal window. |
| **`node: command not found` / `'node' is not recognized`** | Same idea — reinstall Node.js (Section 4) and open a fresh terminal. On Windows, restarting your computer after installing Node also resolves this if a new terminal alone doesn't. |
| **`npm install` fails partway through** | Check your internet connection first. If it's stable, copy the exact error text — it usually names a specific package. Don't run `sudo npm install` to "force" it past a permissions error; reinstall Node properly instead. |
| **Expo won't start / errors immediately on `npx expo start`** | Make sure you ran `npm install` first and that it completed without errors. Also confirm you're running the command from the `Esw_V3` root folder, not a subfolder. |
| **App crashes immediately with a red error screen mentioning `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`** | This is expected if your `.env` file is missing or incomplete — see Section 9. Get the real key from your team lead. |
| **Expo Go says "This project uses an incompatible SDK version"** | Your installed Expo Go app doesn't support SDK 57 (this project's version) yet, or vice versa. Confirm you installed Expo Go fresh from the App Store/Play Store (Section 11) — it auto-updates, so this usually resolves itself within a version or two. If it persists across your whole team, flag it — see Team Lead Decisions Needed. |
| **QR code doesn't scan / phone can't connect** | Walk through Section 13 in order — Wi-Fi network match is the most common cause. |
| **Changes to code aren't appearing on the phone** | Try pressing `r` in the terminal to force a reload. If that doesn't help, stop the server (`Ctrl + C`) and restart it with `npx expo start --clear`, which clears Metro's bundler cache. |
| **"Repository not found" or permission denied when cloning** | You haven't been added as a collaborator yet, or you're signed into the wrong GitHub account. Confirm both with your team lead (see Section 6). |
| **Wrong Node version installed / something behaves differently than a teammate's setup** | Since this repo doesn't pin a Node version, differences between LTS releases can occasionally cause subtle issues. Run `node --version` and compare with a teammate who has a known-working setup; if it differs significantly, install the same major LTS version. |
| **`.env` changes don't seem to take effect** | Stop the Expo server completely (`Ctrl + C`) and start it again — environment variables are only read when the server starts, not live-reloaded. |

---

## 17. Full Clean Installation Checklist

```text
INSTALLATION
☐ Git
☐ Node.js (current LTS)
☐ VS Code (+ Expo Tools extension, auto-prompted)
☐ Expo Go (on your phone)

REPOSITORY
☐ GitHub account created
☐ Added as a collaborator on Logan-Sanchez22/Esw_V3
☐ Repository cloned to your computer
☐ Confirmed you're in the Esw_V3 folder (and on the right branch)
☐ .env file created from .env.example, with real values from your team lead
☐ npm install completed with no errors

RUNNING
☐ npx expo start runs and shows a QR code
☐ Phone and computer on the same Wi-Fi (or tunnel mode used)
☐ QR code scanned successfully
☐ Gryph Gardens opens on your phone
☐ You can sign in and reach the Home screen
```

---

## 18. Copy/Paste Commands

Everything you'll need, in the order you'll need it. All commands run from the `Esw_V3` project folder unless noted.

**One-time setup:**

```bash
git clone https://github.com/Logan-Sanchez22/Esw_V3
cd Esw_V3
cp .env.example .env
# now edit .env with real values from your team lead
npm install
```

**Every time you start working:**

```bash
git pull
npx expo start
```

**If your phone can't connect over Wi-Fi:**

```bash
npx expo start --tunnel
```

**If the app seems stuck on old code:**

```bash
npx expo start --clear
```

**Saving and sharing your work:**

```bash
git status
git add .
git commit -m "Describe what you changed"
git push
```

**Branch basics:**

```bash
git branch --show-current      # see what branch you're on
git checkout -b your-branch    # create and switch to a new branch
git checkout main              # switch back to main
```

---

## Team Lead Decisions Needed

These are things I found in the repository that a new team member cannot safely resolve on their own — please decide and update this guide (or the repo) accordingly:

1. **How do new team members get the required secrets?** `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is mandatory just to open the app (it's a hard `throw` in `src/app/_layout.tsx` if missing), and `CLERK_SECRET_KEY` / `DATABASE_URL` are needed for garden data to sync to the cloud. There's currently no documented process for distributing these — decide whether to share a single team `.env` file securely (e.g. via a password manager), give each new member their own Clerk/Neon access, or something else.
2. **Is `main` the branch new members should clone?** All of today's newest work (sound, ground formations, the Day/Night toggle, and the visual polish pass) was done on a branch called `claude/eager-feynman-08prre`. I could not confirm from inside the repo whether that work has been merged into `main`. Please confirm which branch actually has the current, demo-ready app before pointing new members at `main`.
3. **No Node.js version is pinned anywhere in the repo** (no `.nvmrc`, no `engines` field in `package.json`). If the team wants everyone on an identical Node version, add one of those files — until then, this guide recommends "current LTS," which could theoretically drift between team members over time.
4. **Is the GitHub repository private?** This guide assumes new members need to be explicitly added as a collaborator. If it's actually public, Section 6 can be simplified.
5. **Confirm the current Expo Go compatibility situation.** This guide couldn't verify live whether the App Store/Play Store version of Expo Go currently supports this project's Expo SDK (57) at the time a new member sets up — if the team has already hit this issue, it's worth adding the specific fix directly to Section 16 instead of the general guidance given here.
