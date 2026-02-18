# How to Switch to Version v2

## Summary
The version `v2` in the `Osak0/campus_forum` repository is a **branch** (not a tag).

## Git Commands to Switch to v2

### Option 1: Fetch and Checkout (Recommended)
If you haven't fetched the latest changes from the remote repository:

```bash
# Fetch all branches from the remote repository
git fetch origin

# Checkout the v2 branch
git checkout v2
```

### Option 2: Direct Checkout
If you already have the v2 branch tracked locally:

```bash
# Simply checkout the v2 branch
git checkout v2
```

### Option 3: Create Local Branch Tracking Remote v2
If you want to create a new local branch that tracks the remote v2 branch:

```bash
# Fetch the latest changes
git fetch origin

# Create and checkout a local v2 branch that tracks origin/v2
git checkout -b v2 origin/v2
```

## Verification
After switching to v2, verify you're on the correct branch:

```bash
# Check current branch
git branch

# Verify the commit SHA matches v2
git rev-parse HEAD
# Expected SHA: 0b2c164025da36b3da4af1d88b7ef0ea376936bf
```

## Additional Information
- **Branch Name:** v2
- **Current SHA:** 0b2c164025da36b3da4af1d88b7ef0ea376936bf
- **Repository:** Osak0/campus_forum

## What's in v2?
The v2 branch includes the following enhancements compared to main:
- **SYNC_REPORT.md**: New synchronization report document (210+ lines)
- **backend/requirements.txt**: Updated dependencies including bcrypt version fix
- **frontend/js/auth.js**: Authentication improvements
- **frontend/js/index.js**: Index page enhancements
- **frontend/js/login.js**: Login functionality updates
- **frontend/js/post_detail.js**: Major updates to post detail page with comments and replies UI (240+ new lines)
- **frontend/style.css**: Enhanced styling (100+ new lines)

Key features in v2:
- Comments and replies UI functionality
- Voting system updates
- Improved user authentication flow
- Better code organization with helper functions

## Troubleshooting

### If you have uncommitted changes:
```bash
# Stash your changes before switching
git stash

# Switch to v2
git checkout v2

# Restore your changes (if needed)
git stash pop
```

### If the branch doesn't exist locally:
```bash
# Fetch all remote branches
git fetch origin

# List all branches (including remote)
git branch -a

# Checkout the remote v2 branch
git checkout v2
```
