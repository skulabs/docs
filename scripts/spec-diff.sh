#!/bin/bash
# Endpoint-level diff of two OpenAPI files: added, removed, and changed operations.
# Order-insensitive, so a server that reorders paths reports no changes.
# Usage: scripts/spec-diff.sh <old-openapi.json> <new-openapi.json>
# Exit codes:
#   0  the specs document the same API
#   1  they differ, no endpoint removed
#   2  they differ and at least one endpoint was removed
#   3  the diff itself failed (unreadable or malformed spec); never read as a verdict
set -Eeuo pipefail
trap 'exit 3' ERR

# comm needs the byte order sort produces; a locale collation breaks it
export LC_ALL=C

old_spec="$1"
new_spec="$2"

# One line per operation: "<METHOD> <path>\t<compact sorted JSON of the operation>".
# Path-level parameters are folded into each operation; other path-level keys
# (summary, servers, $ref) are not operations.
list_operations() {
  jq -r -S '.paths | if type == "object" then . else error("spec has no paths object") end
    | to_entries[] | .key as $path | .value as $item | $item | to_entries[]
    | select(.key | IN("get", "put", "post", "delete", "patch", "head", "options", "trace"))
    | "\(.key | ascii_upcase) \($path)\t\(.value + {path_parameters: ($item.parameters // [])} | tojson)"' "$1" | sort
}

# Everything outside the operations: info, servers, tags, shared components
spec_metadata() {
  jq -S 'del(.paths)' "$1"
}

old_ops=$(list_operations "$old_spec")
new_ops=$(list_operations "$new_spec")

old_keys=$(cut -f1 <<< "$old_ops")
new_keys=$(cut -f1 <<< "$new_ops")

added=$(comm -13 <(echo "$old_keys") <(echo "$new_keys"))
removed=$(comm -23 <(echo "$old_keys") <(echo "$new_keys"))
# Operations whose line differs between the specs, minus the brand-new ones
changed=$(comm -12 <(echo "$old_keys") <(comm -13 <(echo "$old_ops") <(echo "$new_ops") | cut -f1 | sort))

old_metadata=$(spec_metadata "$old_spec")
new_metadata=$(spec_metadata "$new_spec")
metadata_changed="no"
if [ "$old_metadata" != "$new_metadata" ]; then
  metadata_changed="yes"
fi

print_section() {
  echo "## $1"
  if [ -z "$2" ]; then echo "(none)"; else echo "$2" | sed 's/^/- /'; fi
  echo
}

print_section "Added" "$added"
print_section "Removed" "$removed"
print_section "Changed" "$changed"
echo "## Shared components, servers, tags, or info changed: $metadata_changed"

if [ -n "$removed" ]; then
  exit 2
fi
if [ -n "$added$changed" ] || [ "$metadata_changed" = "yes" ]; then
  exit 1
fi
exit 0
