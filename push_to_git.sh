#!/bin/bash
set -e
git config --global credential.helper store || true
gh auth setup-git || true
git push origin main
git push origin backup-before-vivid-aura || true
git push origin backup-state-before-aura || true
echo "Pushed successfully!"
