"""
Architecture Scanner — Deterministic filesystem scanner for BillDog.

Walks the project tree, catalogs all directories/files, extracts metadata
from directives and execution scripts, and regenerates ARCHITECTURE.md
while preserving human-authored sections (Design Decisions Log, Constraints).

Usage:
    python execution/scan_architecture.py --output AGENT_BRAIN/ARCHITECTURE.md
"""

import os
import sys
import json
import re
import argparse
import logging
from datetime import datetime, timezone

# Configure logging
os.makedirs(".tmp", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(".tmp/execution.log"),
        logging.StreamHandler(sys.stdout),
    ],
)

# Directories and patterns to skip during scanning
SKIP_DIRS = {
    "node_modules", ".next", ".git", "__pycache__", ".tmp",
    ".vercel", ".turbo", "dist", "build", ".cache",
}
SKIP_FILES = {".DS_Store", "Thumbs.db"}

# Section markers for preserved content
DESIGN_DECISIONS_MARKER = "## SECTION 11 — DESIGN DECISIONS LOG"
CONSTRAINTS_MARKER = "## SECTION 12 — CONSTRAINTS & HARD RULES"


def walk_project(root_dir):
    """Walk the project tree and return a structured inventory."""
    inventory = {}
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Filter out skipped directories in-place
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]

        rel_dir = os.path.relpath(dirpath, root_dir)
        if rel_dir == ".":
            rel_dir = ""

        files = []
        for f in sorted(filenames):
            if f in SKIP_FILES:
                continue
            full_path = os.path.join(dirpath, f)
            try:
                stat = os.stat(full_path)
                files.append({
                    "name": f,
                    "size_bytes": stat.st_size,
                    "modified": datetime.fromtimestamp(
                        stat.st_mtime, tz=timezone.utc
                    ).isoformat(),
                })
            except OSError:
                files.append({"name": f, "size_bytes": 0, "modified": "unknown"})

        if files or dirnames:
            inventory[rel_dir or "."] = {
                "subdirs": sorted(dirnames),
                "files": files,
            }

    return inventory


def extract_directive_goals(directives_dir):
    """Read each directive .md and extract the ## Goal line."""
    goals = {}
    if not os.path.isdir(directives_dir):
        return goals

    for fname in sorted(os.listdir(directives_dir)):
        if not fname.endswith(".md"):
            continue
        fpath = os.path.join(directives_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            # Extract goal section
            match = re.search(
                r"^## Goal\s*\n(.+?)(?=\n## |\Z)", content, re.MULTILINE | re.DOTALL
            )
            goal = match.group(1).strip() if match else "(no goal section found)"
            goals[fname] = goal
        except Exception as e:
            goals[fname] = f"(error reading: {e})"

    return goals


def extract_script_docstrings(execution_dir):
    """Read each execution .py and extract the module docstring."""
    docstrings = {}
    if not os.path.isdir(execution_dir):
        return docstrings

    for fname in sorted(os.listdir(execution_dir)):
        if not fname.endswith(".py"):
            continue
        fpath = os.path.join(execution_dir, fname)
        try:
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            # Extract triple-quoted docstring at module level
            match = re.search(r'^"""(.*?)"""', content, re.DOTALL)
            if not match:
                match = re.search(r"^'''(.*?)'''", content, re.DOTALL)
            docstring = match.group(1).strip() if match else "(no docstring found)"
            docstrings[fname] = docstring
        except Exception as e:
            docstrings[fname] = f"(error reading: {e})"

    return docstrings


def extract_env_names(env_path):
    """Read .env and list variable names (never values)."""
    names = []
    if not os.path.isfile(env_path):
        return names

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    name = line.split("=", 1)[0].strip()
                    names.append(name)
    except Exception:
        pass

    return names


def extract_preserved_sections(architecture_path):
    """
    Read existing ARCHITECTURE.md and extract the human-authored sections
    that must be preserved across regenerations:
    - Section 11 (Design Decisions Log)
    - Section 12 (Constraints & Hard Rules)
    """
    preserved = {"design_decisions": "", "constraints": ""}

    if not os.path.isfile(architecture_path):
        return preserved

    try:
        with open(architecture_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract Design Decisions section
        dd_match = re.search(
            rf"({re.escape(DESIGN_DECISIONS_MARKER)}.*?)(?={re.escape(CONSTRAINTS_MARKER)}|\Z)",
            content,
            re.DOTALL,
        )
        if dd_match:
            preserved["design_decisions"] = dd_match.group(1).strip()

        # Extract Constraints section
        c_match = re.search(
            rf"({re.escape(CONSTRAINTS_MARKER)}.*)",
            content,
            re.DOTALL,
        )
        if c_match:
            preserved["constraints"] = c_match.group(1).strip()

    except Exception as e:
        logging.warning(f"Could not read preserved sections: {e}")

    return preserved


def generate_scan_report(root_dir):
    """Generate the full scan data as a dictionary."""
    inventory = walk_project(root_dir)
    directives = extract_directive_goals(os.path.join(root_dir, "directives"))
    scripts = extract_script_docstrings(os.path.join(root_dir, "execution"))
    env_vars = extract_env_names(os.path.join(root_dir, ".env"))
    preserved = extract_preserved_sections(
        os.path.join(root_dir, "AGENT_BRAIN", "ARCHITECTURE.md")
    )

    report = {
        "scanned_at": datetime.now(tz=timezone.utc).isoformat(),
        "project_root": os.path.abspath(root_dir),
        "inventory": inventory,
        "directives": directives,
        "execution_scripts": scripts,
        "env_variable_names": env_vars,
        "preserved_sections": preserved,
    }

    return report


def format_inventory_tree(inventory):
    """Format the inventory as a readable tree string."""
    lines = []
    for dir_path in sorted(inventory.keys()):
        entry = inventory[dir_path]
        prefix = "  " * dir_path.count(os.sep) if dir_path != "." else ""
        dir_display = dir_path if dir_path != "." else "(root)"
        lines.append(f"{prefix}📁 {dir_display}/")
        for f in entry["files"]:
            file_prefix = prefix + "  "
            size_kb = f["size_bytes"] / 1024
            lines.append(f"{file_prefix}📄 {f['name']}  ({size_kb:.1f} KB)")

    return "\n".join(lines)


def generate_scan_section(report):
    """Generate the auto-scanned filesystem section for ARCHITECTURE.md."""
    lines = [
        "",
        "---",
        "",
        "## AUTO-SCANNED FILESYSTEM SNAPSHOT",
        "",
        f"> Last scanned: {report['scanned_at']}",
        f"> Project root: `{report['project_root']}`",
        "",
        "### Directory Inventory",
        "",
        "```",
        format_inventory_tree(report["inventory"]),
        "```",
        "",
    ]

    # Directives summary
    if report["directives"]:
        lines.append("### Directive Goals")
        lines.append("")
        lines.append("| Directive | Goal |")
        lines.append("|---|---|")
        for fname, goal in report["directives"].items():
            # Truncate long goals for table readability
            goal_short = goal.replace("\n", " ")[:120]
            lines.append(f"| `{fname}` | {goal_short} |")
        lines.append("")

    # Execution scripts summary
    if report["execution_scripts"]:
        lines.append("### Execution Scripts")
        lines.append("")
        lines.append("| Script | Purpose |")
        lines.append("|---|---|")
        for fname, doc in report["execution_scripts"].items():
            doc_short = doc.split("\n")[0][:120]
            lines.append(f"| `{fname}` | {doc_short} |")
        lines.append("")

    # Env vars
    if report["env_variable_names"]:
        lines.append("### Environment Variables (names only)")
        lines.append("")
        for name in report["env_variable_names"]:
            lines.append(f"- `{name}`")
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(
        description="Scan BillDog project and update ARCHITECTURE.md"
    )
    parser.add_argument(
        "--output",
        default="AGENT_BRAIN/ARCHITECTURE.md",
        help="Output path for ARCHITECTURE.md (default: AGENT_BRAIN/ARCHITECTURE.md)",
    )
    parser.add_argument(
        "--root",
        default=".",
        help="Project root directory (default: current directory)",
    )
    parser.add_argument(
        "--json-only",
        action="store_true",
        help="Output only the JSON scan data to .tmp/architecture_scan.json",
    )

    args = parser.parse_args()

    try:
        logging.info(f"Starting architecture scan from: {os.path.abspath(args.root)}")

        report = generate_scan_report(args.root)

        # Always save JSON intermediate
        json_path = os.path.join(".tmp", "architecture_scan.json")
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2, default=str)
        logging.info(f"Scan data saved to: {json_path}")

        if args.json_only:
            logging.info("JSON-only mode — skipping ARCHITECTURE.md update")
            return

        # Read existing ARCHITECTURE.md to preserve it
        output_path = os.path.join(args.root, args.output)

        if os.path.isfile(output_path):
            with open(output_path, "r", encoding="utf-8") as f:
                existing_content = f.read()

            # Find the auto-scanned section marker and replace/append it
            auto_marker = "## AUTO-SCANNED FILESYSTEM SNAPSHOT"
            scan_section = generate_scan_section(report)

            if auto_marker in existing_content:
                # Replace existing auto-scanned section using string operations
                # (avoids regex escape issues with Windows paths like C:\Users)
                auto_start = existing_content.index(auto_marker)

                # Find where the auto section ends (next preserved section or EOF)
                dd_pos = existing_content.find(DESIGN_DECISIONS_MARKER, auto_start)
                if dd_pos != -1:
                    auto_end = dd_pos
                else:
                    auto_end = len(existing_content)

                updated_content = (
                    existing_content[:auto_start]
                    + scan_section.strip()
                    + "\n\n"
                    + existing_content[auto_end:]
                )
            else:
                # Insert before Design Decisions section if it exists
                if DESIGN_DECISIONS_MARKER in existing_content:
                    updated_content = existing_content.replace(
                        DESIGN_DECISIONS_MARKER,
                        scan_section + "\n\n" + DESIGN_DECISIONS_MARKER,
                    )
                else:
                    # Append at end
                    updated_content = existing_content + "\n" + scan_section

            with open(output_path, "w", encoding="utf-8") as f:
                f.write(updated_content)
        else:
            # No existing file — write scan section as starting point
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "w", encoding="utf-8") as f:
                f.write(scan_section)

        logging.info(f"ARCHITECTURE.md updated: {output_path}")

        # Summary stats
        total_files = sum(
            len(v["files"]) for v in report["inventory"].values()
        )
        total_dirs = len(report["inventory"])
        logging.info(
            f"Scan complete: {total_dirs} directories, {total_files} files, "
            f"{len(report['directives'])} directives, "
            f"{len(report['execution_scripts'])} scripts, "
            f"{len(report['env_variable_names'])} env vars"
        )

    except Exception as e:
        logging.error(f"Architecture scan failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
