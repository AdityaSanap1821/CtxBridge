"""Prompt quality eval harness for /explain.

Runs a small matrix of (highlighted_text, surrounding_context) x ROLES through
the real /explain handler and prints the results side-by-side. Use this to
iterate the prompt in prompts/system.md, and to prove the M2 exit gate:
"same text under a different role gives visibly different output."

Run from the backend/ directory:

    ../.venv/Scripts/python scripts/eval_explain.py
    ../.venv/Scripts/python scripts/eval_explain.py --out ../docs/eval-2026-07-31.md

The --out flag writes a markdown-formatted snapshot for archiving prompt
iterations. Without it, prints to stdout.

Scenarios below are lifted from seed.py so we eval exactly what the demo
shows. Sharayu can replace them as the seeded conversation evolves.
"""

from __future__ import annotations

import argparse
import io
import sys
import time
from contextlib import redirect_stdout
from pathlib import Path

# Make `app` importable when run as `python scripts/eval_explain.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import LLM_MODEL, ROLES  # noqa: E402
from app.ctxbridge.routes import explain  # noqa: E402
from app.ctxbridge.schema import ExplainRequest  # noqa: E402
from app.workspace.store import get_brief  # noqa: E402

# Each scenario = (highlight, the full message it came from). Keep short so
# a full run stays cheap and manual review stays scannable.
SCENARIOS: list[tuple[str, str]] = [
    (
        "usage-based pricing",
        "Kicking off the Q3 pricing revamp — goal is to ship usage-based pricing before the September enterprise renewals.",
    ),
    (
        "canary release",
        "We're adding a feature flag rollout for the new pricing engine, gated behind a canary release.",
    ),
    (
        "pipeline velocity",
        "We want to lead the launch with 'pipeline velocity' and lock in the ARR uplift claim.",
    ),
    (
        "hard go-live date",
        "Two enterprise prospects are asking for a hard go-live date — can I commit to Sept 15?",
    ),
]


def _run_one(highlight: str, context: str, role: str) -> tuple[dict | None, float, str | None]:
    """Return (parsed_result_dict, elapsed_seconds, error_string_or_None)."""
    req = ExplainRequest(
        highlighted_text=highlight,
        surrounding_context=context,
        reader_role=role,
    )
    t0 = time.perf_counter()
    try:
        result = explain(req)
    except Exception as e:
        return None, time.perf_counter() - t0, f"{type(e).__name__}: {e}"
    return result.model_dump(), time.perf_counter() - t0, None


def _print_report() -> None:
    brief = get_brief()
    print(f"# CtxBridge eval — {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    print(f"- Model: `{LLM_MODEL}`")
    print(f"- Roles: {', '.join(ROLES)}")
    print(f"- Scenarios: {len(SCENARIOS)}")
    print()
    print("## Brief in use")
    print()
    print(f"> {brief.strip() or '(empty)'}")
    print()

    all_timings: list[float] = []
    failures: list[str] = []

    for i, (highlight, context) in enumerate(SCENARIOS, 1):
        print(f"## Scenario {i}: `{highlight}`")
        print()
        print(f"**Surrounding message:** {context}")
        print()
        for role in ROLES:
            result, elapsed, err = _run_one(highlight, context, role)
            all_timings.append(elapsed)
            print(f"### {role}  _(t={elapsed:.2f}s)_")
            print()
            if err is not None:
                failures.append(f"{highlight} / {role}: {err}")
                print(f"**ERROR:** {err}")
                print()
                continue
            print(f"**plain_explanation:** {result['plain_explanation']}")
            print()
            print("**impact_bullets:**")
            bullets = result.get("impact_bullets") or []
            if not bullets:
                print("- _(none — fallback path likely)_")
            for b in bullets:
                print(f"- {b}")
            print()

    print("---")
    print("## Summary")
    if all_timings:
        avg = sum(all_timings) / len(all_timings)
        print(f"- Calls: {len(all_timings)}")
        print(f"- Avg latency: {avg:.2f}s")
        print(f"- Max latency: {max(all_timings):.2f}s")
        print(f"- Min latency: {min(all_timings):.2f}s")
    print(f"- Failures: {len(failures)}")
    for f in failures:
        print(f"  - {f}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", type=Path, help="Write report to this file instead of stdout.")
    args = parser.parse_args()

    if args.out:
        buf = io.StringIO()
        with redirect_stdout(buf):
            _print_report()
        args.out.write_text(buf.getvalue(), encoding="utf-8")
        # Also echo a one-line summary so the runner sees something.
        sys.stdout.reconfigure(encoding="utf-8")
        print(f"Wrote {args.out} ({len(buf.getvalue())} chars).")
    else:
        sys.stdout.reconfigure(encoding="utf-8")
        _print_report()


if __name__ == "__main__":
    main()
