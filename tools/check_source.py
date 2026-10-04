#!/usr/bin/env python3
"""Check the Git index before uploading source; never print matched secret values."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
PROHIBITED = (
    re.compile(r"(^|/)(node_modules|\.wrangler|\.venv|__pycache__|backups|staging|work)/"),
    re.compile(r"^outputs/prototype/public/data/"),
    re.compile(r"(^|/)\.env(?:\..+)?$"),
    re.compile(r"(^|/)\.dev\.vars(?:\..+)?$"),
    re.compile(r"\.(?:sqlite3?|db|db-wal|db-shm|zip|tar|tar\.gz)$"),
)
SECRETS = (
    re.compile(rb"gh[pousr]_[A-Za-z0-9]{30,}"),
    re.compile(rb"github_pat_[A-Za-z0-9_]{40,}"),
    re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(rb"(?:sk-proj-|sk-ant-)[A-Za-z0-9_-]{30,}"),
)


def main():
    listed = subprocess.check_output(["git", "ls-files", "--stage", "-z"], cwd=ROOT)
    failures = []
    total = 0
    count = 0
    for entry in listed.split(b"\0"):
        if not entry:
            continue
        metadata, raw_name = entry.split(b"\t", 1)
        mode, object_id, stage = metadata.split()
        name = raw_name.decode("utf-8")
        count += 1
        if stage != b"0":
            failures.append((name, "unresolved merge"))
            continue
        if mode == b"120000":
            failures.append((name, "symlink must be reviewed before upload"))
            continue
        if not name.endswith(".example") and any(p.search(name) for p in PROHIBITED):
            failures.append((name, "local data or credential path is tracked"))
        # Read the staged blob, not a possibly different working tree file.
        data = subprocess.check_output(["git", "cat-file", "blob", object_id.decode()], cwd=ROOT)
        total += len(data)
        if len(data) > 20 * 1024 * 1024:
            failures.append((name, "file exceeds the 20 MiB source review limit"))
        if any(pattern.search(data) for pattern in SECRETS):
            failures.append((name, "possible credential; value redacted"))
    if not count:
        print("No staged or tracked source files found.", file=sys.stderr)
        return 1
    for name, reason in failures:
        print(f"BLOCKED {name}: {reason}", file=sys.stderr)
    print(f"Checked {count} indexed files, {total} bytes; {len(failures)} issue(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
