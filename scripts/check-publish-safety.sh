#!/usr/bin/env bash
# Publish-Safety-Check — Blueprint-Vault Template (C-PUB-05).
#
# Kopiere diese Datei in jedes neue Projekt-Repo unter `scripts/check-publish-safety.sh`.
# In CI als Job ausführen (Job-Name generisch: "Publish safety check").
# Optional lokal als Pre-Push-Hook installieren.
#
# Exit-Code 0 = sauber, 1 = Treffer (Build fails / Push fails).

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FOUND=0

echo "Publish-safety check — scanning $REPO_ROOT"
echo "---"

# ---------------------------------------------------------------------------
# C-PUB-01: Vault-Verzeichnisse dürfen nicht getrackt sein
# ---------------------------------------------------------------------------
echo "→ Checking for tracked vault directories (C-PUB-01)…"
VAULT_PATHS=$(git ls-files | grep -iE '(^|/)(vault|.*-vault)/' || true)
if [ -n "$VAULT_PATHS" ]; then
    echo -e "${RED}FAIL${NC}: Vault directories are tracked in git:"
    echo "$VAULT_PATHS" | sed 's/^/    /'
    FOUND=1
fi

# ---------------------------------------------------------------------------
# C-PUB-03: Interne Methodologie-Doks dürfen nicht getrackt sein
# ---------------------------------------------------------------------------
echo "→ Checking for tracked internal methodology docs (C-PUB-03)…"
FORBIDDEN_FILES=$(git ls-files | grep -iE '(^|/)(SECURITY-AUDIT|IMPLEMENTIERUNGS-LOG|BUG-TRACKING|SESSION-LOG-|.*-AUDIT-REPORT|THREAT-MODEL|SOAK-TEST-PLAN|LOAD-TEST-PLAN|PERFORMANCE-PROFILE|KEYBOARD-NAV|SCREEN-READER-TEST-PLAN|TECH-DEBT-BACKLOG)\.(md|MD)$' || true)
if [ -n "$FORBIDDEN_FILES" ]; then
    echo -e "${RED}FAIL${NC}: Internal methodology docs are tracked in git:"
    echo "$FORBIDDEN_FILES" | sed 's/^/    /'
    FOUND=1
fi

# ---------------------------------------------------------------------------
# C-PUB-02: Interne IDs in committed Dateien
# ---------------------------------------------------------------------------
echo "→ Checking for internal planning IDs in committed files (C-PUB-02)…"

# Welche Dateien scannen: alle getrackten Files, aber:
#  - Binärformate raus (Bilder, Fonts, Audio/Video, PDFs)
#  - Lock-Files raus (auto-generiert, sehr lang)
#  - Vendor/Dist/Build-Verzeichnisse raus
#  - Minified Assets raus
#  - Diese Datei selbst raus (sonst matcht das Skript seine eigenen Patterns)
# Bewusst NICHT nach Whitelist-Extensions filtern, damit auch extensionless
# Dateien (.gitignore, Dockerfile, Makefile, LICENSE) gescannt werden.
SELF_PATH=$(git ls-files --full-name "$0" 2>/dev/null | head -1)
[ -z "$SELF_PATH" ] && SELF_PATH="scripts/check-publish-safety.sh"
SCAN_FILES=$(git ls-files | \
    grep -vE '(^|/)(node_modules|vendor|dist|build|storybook-static|coverage|\.git)/' | \
    grep -vE '\.(min\.(js|css)|map|png|jpg|jpeg|gif|webp|avif|ico|svg|woff2?|ttf|eot|otf|mp[34]|webm|mov|pdf|zip|tar|gz|tgz|7z|exe|bin|dat|wasm)$' | \
    grep -vE '(^|/)(package-lock\.json|composer\.lock|yarn\.lock|pnpm-lock\.yaml)$' | \
    grep -vFx "$SELF_PATH" || true)

# Harte Patterns: indicate a leak unconditionally, in any file.
HARD_PATTERNS=(
    '\bC-(SEC|PRIV|A11Y|PERF|DEV|SB|I18N|MOB|HC|ARCH|UX|DOC|MOT|AI|PUB|REPO|OPS)-[0-9]{2}\b'
    '\bADR-[0-9]{3}\b'
    '\bBUG-[0-9]{3,4}\b'
    '\bFEAT-[0-9]{3,4}\b'
    '\bS-[0-9]{2}\b'
    '\bM-[0-9]{2}\b'
    'Baustein[[:space:]]+[0-9]+'
    'Constraint coverage:'
    'Go-Live[[:space:]-]?Gate'
    'Vault-Pflicht'
    'Post-Sprint-Audit'
)

# Weiche Patterns: vault- and methodology-doc names. Legitimate in ignore-files
# (.gitignore, .dockerignore, .prettierignore, .eslintignore) because their
# purpose is to declare what NOT to track. Everywhere else they leak.
SOFT_PATTERNS=(
    'Metro-Vault'
    'Blueprint-Vault'
    '\bTech-Debt-Backlog\b'
)

# Files where soft patterns are allowed (ignore-files of various tools)
IGNORE_FILE_PATTERN='(^|/)\.(git|docker|prettier|eslint|stylelint|npm)ignore$'

SOFT_SCAN_FILES=$(echo "$SCAN_FILES" | grep -vE "$IGNORE_FILE_PATTERN" || true)

PATTERN_HITS=0
run_pattern_check() {
    local pattern="$1"
    local files="$2"
    if [ -z "$files" ]; then return; fi
    local hits
    hits=$(echo "$files" | xargs grep -HnE "$pattern" 2>/dev/null || true)
    if [ -n "$hits" ]; then
        if [ $PATTERN_HITS -eq 0 ]; then
            echo -e "${RED}FAIL${NC}: Internal planning IDs found in committed files:"
        fi
        echo "  Pattern: $pattern"
        echo "$hits" | head -20 | sed 's/^/    /'
        local count
        count=$(echo "$hits" | wc -l | tr -d ' ')
        if [ "$count" -gt 20 ]; then
            echo "    … and $((count - 20)) more"
        fi
        PATTERN_HITS=$((PATTERN_HITS + 1))
        FOUND=1
    fi
}

for PATTERN in "${HARD_PATTERNS[@]}"; do
    run_pattern_check "$PATTERN" "$SCAN_FILES"
done

for PATTERN in "${SOFT_PATTERNS[@]}"; do
    run_pattern_check "$PATTERN" "$SOFT_SCAN_FILES"
done

# ---------------------------------------------------------------------------
# C-PUB-06: Verdächtige interne URLs / Entwickler-Pfade
# ---------------------------------------------------------------------------
echo "→ Checking for internal URLs / dev paths (C-PUB-06)…"
SUSPICIOUS_PATHS='(/Users/[A-Za-z0-9._-]+/|/home/[A-Za-z0-9._-]+/(?!user/|\.|root))'
if [ -n "$SCAN_FILES" ]; then
    HITS=$(echo "$SCAN_FILES" | xargs grep -HnE "$SUSPICIOUS_PATHS" 2>/dev/null | grep -vE '(example|placeholder|your-home|/Users/<|/home/<)' || true)
    if [ -n "$HITS" ]; then
        echo -e "${YELLOW}WARN${NC}: Possible developer home paths in committed files:"
        echo "$HITS" | head -10 | sed 's/^/    /'
        # Nur Warnung, kein FAIL — manchmal sind Beispiele legitim
    fi
fi

# ---------------------------------------------------------------------------
# Ergebnis
# ---------------------------------------------------------------------------
echo "---"
if [ $FOUND -eq 0 ]; then
    echo -e "${GREEN}OK${NC}: publish-safety check passed."
    exit 0
else
    echo -e "${RED}FAIL${NC}: publish-safety check failed."
    echo ""
    echo "What to do:"
    echo "  - Remove the offending content (move internal docs to your local vault)."
    echo "  - Rewrite comments / test descriptions to drop the internal IDs."
    echo "  - For an exception (rare), document the reason in a commit message and"
    echo "    extend this script — never disable it silently."
    exit 1
fi
