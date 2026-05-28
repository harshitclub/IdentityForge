# Git Branching Strategy

This project follows a simple and scalable Git branching workflow.

The goal is to keep:

* production stable
* development organized
* features isolated

---

# Main Branches

## `main`

The `main` branch contains stable production-ready code.

### Rules

* Never commit directly to `main`
* Only tested code should be merged here
* Production deployments should happen from this branch

---

## `develop`

The `develop` branch is the primary development branch.

All new features should merge into `develop` first.

### Flow

```txt id="7bk9uk"
feature branch -> develop -> main
```

---

# Feature Branches

Every feature should have its own branch.

## Naming Convention

```txt id="2jlwmr"
feature/<feature-name>
```

## Examples

```txt id="1s0vfh"
feature/project-setup
feature/database-schema
feature/auth-system
feature/user-module
feature/admin-module
feature/email-service
feature/security
feature/redis-cache
feature/testing
feature/devops
```

---

# Hotfix Branches

Hotfix branches are used for urgent fixes.

## Naming Convention

```txt id="57k7dw"
hotfix/<issue-name>
```

## Example

```txt id="9m4dlu"
hotfix/jwt-security-fix
```

### Flow

```txt id="d9wl4u"
main -> hotfix branch -> main + develop
```

---

# Recommended Development Flow

## Step 1 — Switch to develop

```bash id="f3lgx0"
git checkout develop
git pull origin develop
```

---

## Step 2 — Create Feature Branch

```bash id="wn9x4e"
git checkout -b feature/auth-system
```

---

## Step 3 — Push Feature Branch

```bash id="hpr90t"
git push origin feature/auth-system
```

---

## Step 4 — Merge Flow

```txt id="llq9nm"
feature/auth-system -> develop
develop -> main
```

---

# Branch Prefixes

Allowed branch prefixes:

```txt id="dd6p4m"
feature/
fix/
hotfix/
refactor/
docs/
test/
chore/
```

---

# Recommended Commit Convention

This project follows Conventional Commits.

## Format

```txt id="4o5r4j"
type(scope): message
```

## Examples

```txt id="73m7zv"
feat(auth): implement refresh token rotation
fix(user): resolve avatar upload issue
refactor(session): improve token validation
docs(readme): update setup guide
```

---

# Protected Branches

The following branches should be protected:

```txt id="fzq7s2"
main
develop
```
