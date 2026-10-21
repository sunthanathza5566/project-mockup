#!/usr/bin/env python3
"""XP ledger for the agent team. Standard library only.

Usage:
  xp.py init
  xp.py award <agent> <points> "<reason>" <TASK-id>
  xp.py status [agent]
  xp.py board
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
XP_DIR = ROOT / ".agents" / "xp"
LEDGER = XP_DIR / "ledger.jsonl"
BOARD = XP_DIR / "LEADERBOARD.md"
MEMORY = ROOT / ".agents" / "memory"

AGENTS = [
    "code-reader", "researcher", "architect", "diagram-designer",
    "backend-dev", "frontend-dev", "db-engineer",
    "qa-tester", "ui-inspector", "playtester", "reviewer", "security-auditor",
    "devops", "docs-writer", "thesis-writer", "xp-keeper",
]
LEVELS = [(0, 1, "Rookie"), (60, 2, "Member"), (180, 3, "Senior"),
          (400, 4, "Lead"), (800, 5, "Master")]

PLAYBOOK_TEMPLATE = """# Playbook — {agent}

## RULES
- (ยังไม่มี)

## LESSONS
- (ยังไม่มี)

## PROJECT KNOWLEDGE
- (ยังไม่มี)
"""


def read_ledger():
    if not LEDGER.exists():
        return []
    rows = []
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        if line.strip():
            rows.append(json.loads(line))
    return rows


def totals():
    score = {a: 0 for a in AGENTS}
    tasks = {a: set() for a in AGENTS}
    for r in read_ledger():
        a = r["agent"]
        # XP floor is 0, applied in order so penalties can't push below zero
        score[a] = max(0, score.get(a, 0) + int(r["points"]))
        tasks.setdefault(a, set()).add(r["task"])
    return score, tasks


def level_of(xp):
    cur = LEVELS[0]
    for lv in LEVELS:
        if xp >= lv[0]:
            cur = lv
    nxt = next((lv for lv in LEVELS if lv[0] > xp), None)
    return cur, nxt


def cmd_init():
    XP_DIR.mkdir(parents=True, exist_ok=True)
    LEDGER.touch(exist_ok=True)
    for a in AGENTS:
        pb = MEMORY / a / "playbook.md"
        if not pb.exists():
            pb.parent.mkdir(parents=True, exist_ok=True)
            pb.write_text(PLAYBOOK_TEMPLATE.format(agent=a), encoding="utf-8")
    cmd_board()
    print("initialized")


def cmd_award(agent, points, reason, task):
    if agent not in AGENTS:
        sys.exit(f"unknown agent: {agent}. valid: {', '.join(AGENTS)}")
    try:
        pts = int(points)
    except ValueError:
        sys.exit("points must be an integer")
    if not task.startswith("TASK-"):
        sys.exit("task id must look like TASK-0001")
    before, _ = totals()
    old_lv, _ = level_of(before[agent])
    row = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "agent": agent, "points": pts, "reason": reason, "task": task,
    }
    XP_DIR.mkdir(parents=True, exist_ok=True)
    with LEDGER.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")
    after, _ = totals()
    new_lv, _ = level_of(after[agent])
    msg = f"{agent}: {pts:+d} XP ({reason}) -> {after[agent]} XP"
    if new_lv[1] != old_lv[1]:
        msg += f"  ** LEVEL {old_lv[1]} -> {new_lv[1]} ({new_lv[2]}) **"
    print(msg)


def cmd_status(agent=None):
    score, tasks = totals()
    for a in ([agent] if agent else AGENTS):
        if a not in score:
            sys.exit(f"unknown agent: {a}")
        (_, lv, name), nxt = level_of(score[a])
        to_next = f"{nxt[0] - score[a]} XP to Lv{nxt[1]}" if nxt else "max level"
        print(f"{a:18} Lv{lv} {name:7} {score[a]:5} XP  tasks={len(tasks[a]):3}  ({to_next})")


def cmd_board():
    score, tasks = totals()
    rows = sorted(AGENTS, key=lambda a: -score[a])
    recent = read_ledger()[-15:][::-1]
    out = ["# LEADERBOARD", "",
           f"_อัปเดต: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')} (สร้างโดย xp.py — ห้ามแก้มือ)_", "",
           "| อันดับ | Agent | Level | XP | งานที่ร่วม | ถึง level ถัดไป |",
           "|---|---|---|---|---|---|"]
    for i, a in enumerate(rows, 1):
        (_, lv, name), nxt = level_of(score[a])
        to_next = f"{nxt[0] - score[a]} XP" if nxt else "MAX"
        out.append(f"| {i} | {a} | Lv{lv} {name} | {score[a]} | {len(tasks[a])} | {to_next} |")
    out += ["", "## รายการล่าสุด", "", "| เวลา | Agent | XP | เหตุผล | งาน |", "|---|---|---|---|---|"]
    for r in recent:
        out.append(f"| {r['ts']} | {r['agent']} | {int(r['points']):+d} | {r['reason']} | {r['task']} |")
    XP_DIR.mkdir(parents=True, exist_ok=True)
    BOARD.write_text("\n".join(out) + "\n", encoding="utf-8")
    print(f"wrote {BOARD.relative_to(ROOT)}")


def main(argv):
    if not argv:
        sys.exit(__doc__)
    cmd, args = argv[0], argv[1:]
    if cmd == "init":
        cmd_init()
    elif cmd == "award" and len(args) == 4:
        cmd_award(*args)
    elif cmd == "status":
        cmd_status(args[0] if args else None)
    elif cmd == "board":
        cmd_board()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
