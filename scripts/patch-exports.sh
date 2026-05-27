#!/bin/bash
# Patch gaussian-splat-renderer-for-lam to export the internal Raycaster class
MODULE="node_modules/gaussian-splat-renderer-for-lam/build/gaussian-splat-renderer-for-lam.module.js"
if [ -f "$MODULE" ] && ! grep -q 'Raycaster, AbortablePromise' "$MODULE"; then
  sed -i.bak 's/export { AbortablePromise/export { AbortablePromise, Raycaster/' "$MODULE"
  rm -f "${MODULE}.bak"
  echo "Patched Raycaster export into gaussian-splat-renderer-for-lam"
fi
