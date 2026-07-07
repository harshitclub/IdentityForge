# Git Workflow

This project follows a simple Git Flow.

The goal is to keep:

- `main` always production-ready
- `develop` always integration-ready
- every feature isolated in its own branch

---

# Branches

## main

The `main` branch always contains stable production-ready code.

### Rules

- Never develop directly on `main`.
- Never commit directly on `main`.
- Only merge tested code from `develop`.

---

## develop

The `develop` branch is the main development branch.

Every new feature starts from `develop`.

### Rules

- Never build a feature directly on `develop`.
- Create a feature branch first.
- Merge completed features back into `develop`.

---

## feature/*

Every feature gets its own branch.

Examples

```txt
feature/authentication
feature/user-module
feature/session-management
feature/redis-cache
feature/swagger
feature/testing
feature/email-verification
```

---

# Overall Flow

```txt
main
  ▲
  │
develop
  ▲
  │
feature/my-feature
```

Every feature follows

```txt
feature → develop → main
```

---

# Development Workflow

## Step 1

Switch to develop.

```bash
git checkout develop
```

### What it does

Switches your working directory to the `develop` branch.

---

## Step 2

Create a feature branch.

```bash
git checkout -b feature/session-refresh-token-linking
```

### What it does

- Creates a new branch.
- Automatically switches to it.
- Copies the current state of `develop`.

The `-b` flag means

```txt
Create + Switch
```

without `-b`

```bash
git checkout feature/session-refresh-token-linking
```

only switches branches.

---

## Step 3

Check changed files.

```bash
git status
```

### What it does

Shows

- modified files
- new files
- deleted files
- staged files
- current branch

---

## Step 4

Stage changes.

```bash
git add .
```

### What it does

Moves all modified files into Git's staging area.

Think of it as

```txt
Working Directory

↓

Staging Area

↓

Commit
```

---

## Step 5

Create a commit.

```bash
git commit -m "feat(auth): link refresh tokens with sessions"
```

### What it does

Creates a snapshot of the staged files.

Every commit should represent one logical change.

Use Conventional Commits.

Examples

```txt
feat(auth): implement login
feat(user): add profile update
fix(auth): resolve refresh token bug
refactor(session): simplify session flow
docs(readme): update installation guide
```

---

## Step 6

Push feature branch.

```bash
git push -u origin feature/session-refresh-token-linking
```

### What it does

- Uploads the branch to GitHub.
- `-u` creates upstream tracking.

After this

```bash
git push
```

is enough.

---

# Merge Feature into Develop

## Step 1

Switch to develop.

```bash
git checkout develop
```

---

## Step 2

Merge feature.

```bash
git merge feature/session-refresh-token-linking
```

### What it does

Combines the feature branch into `develop`.

---

## Step 3

Push develop.

```bash
git push origin develop
```

### What it does

Uploads the updated `develop` branch.

---

# Merge Develop into Main

## Step 1

Switch to main.

```bash
git checkout main
```

---

## Step 2

Merge develop.

```bash
git merge develop
```

### What it does

Moves all completed and tested features into production.

---

## Step 3

Push main.

```bash
git push origin main
```

---

# Delete Feature Branch

Delete locally.

```bash
git branch -d feature/session-refresh-token-linking
```

### What it does

Deletes the local feature branch after it has been merged.

---

Delete remotely.

```bash
git push origin --delete feature/session-refresh-token-linking
```

### What it does

Deletes the feature branch from GitHub.

---

# Useful Git Commands

## Current branch

```bash
git branch
```

Shows all local branches.

Current branch is marked with

```txt
*
```

---

## Check changes

```bash
git status
```

Shows current project state.

---

## Commit history

```bash
git log --oneline
```

Shows compact commit history.

Example

```txt
7b45e1d feat(auth): implement login
91d6ab2 feat(user): add profile update
c84b3ff Initial commit
```

---

## View differences

```bash
git diff
```

Shows changes not yet staged.

---

## View staged differences

```bash
git diff --cached
```

Shows changes that are staged and will be committed.

---

## Undo staged files

```bash
git restore --staged .
```

Removes files from staging.

---

## Discard local changes

```bash
git restore .
```

Restores modified files to the last committed state.

**Be careful:** this permanently discards uncommitted changes.

---

# When should I use git pull?

For this project (single developer)

Normally you **do not need**

```bash
git pull origin develop
```

because you are the only developer.

Use `git pull` only when

- working with multiple developers
- working from multiple machines
- remote repository has newer commits

Otherwise, you can safely skip it.

---

# Final Workflow

```txt
develop
    │
    ▼
Create Feature Branch
    │
    ▼
Write Code
    │
    ▼
git add .
    │
    ▼
git commit
    │
    ▼
git push
    │
    ▼
Merge → develop
    │
    ▼
Push develop
    │
    ▼
Merge → main
    │
    ▼
Push main
    │
    ▼
Delete Feature Branch
```

---

# Project Rules

✅ Never commit directly to `main`

✅ Never develop directly on `develop`

✅ One feature = One feature branch

✅ One logical change = One commit

✅ Merge feature → develop first

✅ Merge develop → main only after testing

✅ Delete feature branch after merging

✅ Use Conventional Commits