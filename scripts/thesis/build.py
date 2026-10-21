#!/usr/bin/env python3
"""Build the research report (เล่มวิจัย) from Markdown chapters.

Usage:
  build.py make-ref   create thesis/templates/reference.docx (TH Sarabun New 16pt, Thai margins)
  build.py diagrams   render docs/diagrams/*.mmd -> thesis/export/figures/*.png (needs mmdc)
  build.py docx       thesis/export/thesis.docx (needs pandoc)
  build.py gemini     thesis/export/GEMINI_HANDOFF.md (no dependencies)
  build.py check      report missing chapters, open markers, missing diagrams
  build.py all        diagrams + docx + gemini + check

Diagram placeholder inside a chapter:
  {{diagram:seq-login|รูปที่ 3.1 Sequence diagram การเข้าสู่ระบบ}}
"""
import re
import shutil
import subprocess
import sys
import warnings
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TH = ROOT / "thesis"
CH = TH / "chapters"
OUT = TH / "export"
FIG = OUT / "figures"
DIAG = ROOT / "docs" / "diagrams"
META = TH / "meta.md"
REF = TH / "templates" / "reference.docx"
PH = re.compile(r"\{\{diagram:([A-Za-z0-9_\-]+)(?:\|([^}]*))?\}\}")
MARKERS = ["[TODO", "[ต้องตรวจสอบ]", "[ต้องการข้อมูล]", "[ต้องการอ้างอิง]"]

EXPECTED = [
    "00-front-matter.md", "01-introduction.md", "02-literature.md",
    "03-methodology.md", "04-results.md", "05-conclusion.md",
    "90-references.md", "95-appendix.md",
]

THAI_FONT = "TH Sarabun New"
STYLE_SIZES = {
    "Normal": 16, "Body Text": 16, "First Paragraph": 16, "Compact": 16,
    "Block Text": 16, "Caption": 16, "Image Caption": 16, "Table Caption": 16,
    "Title": 20, "Subtitle": 18, "Heading 1": 20, "Heading 2": 18,
    "Heading 3": 16, "Heading 4": 16, "TOC Heading": 20,
}

GEMINI_HEADER = """# คำสั่งสำหรับ Gemini — จัดทำเล่มวิจัยจากเนื้อหาด้านล่าง

คุณคือผู้ช่วยจัดรูปแบบเอกสารวิชาการภาษาไทย หน้าที่ของคุณคือ **นำเนื้อหาด้านล่างไปจัดทำเป็นเล่มวิจัยใน Google Docs**
โดยไม่เปลี่ยนสาระสำคัญ

## รูปแบบที่ต้องใช้
- ฟอนต์ TH Sarabun New ขนาด 16 pt (หัวข้อบท 20 pt ตัวหนา จัดกึ่งกลาง, หัวข้อย่อย 18 pt ตัวหนา)
- ระยะขอบ: บน 1.5 นิ้ว, ซ้าย 1.5 นิ้ว, ล่าง 1 นิ้ว, ขวา 1 นิ้ว / ระยะบรรทัด 1 เท่า
- ขึ้นบทใหม่ (บทที่ 1–5) ที่หน้าใหม่เสมอ
- เลขหัวข้อตามที่ให้มา (1.1, 1.2.1 ...) / เลขรูปและตารางตามบท (รูปที่ 3.1, ตารางที่ 4.2)
- คำบรรยายรูปอยู่ใต้รูป คำบรรยายตารางอยู่เหนือตาราง
- สร้างสารบัญ สารบัญตาราง และสารบัญรูป
- บรรณานุกรมตามรูปแบบ APA 7th

## Diagram
บล็อก ```mermaid``` คือโค้ด diagram ให้แปลงเป็นรูป (เช่นผ่าน mermaid.live) แล้ววางแทนบล็อก พร้อมคำบรรยายรูปที่อยู่ด้านบนบล็อก

## ข้อห้าม
- ห้ามแต่งข้อมูล ตัวเลข ผลการทดลอง หรือแหล่งอ้างอิงขึ้นใหม่
- ข้อความที่มีป้าย [ต้องตรวจสอบ] [ต้องการข้อมูล] [ต้องการอ้างอิง] [TODO] ให้คงไว้และไฮไลต์สีเหลือง
- ปรับภาษาได้เฉพาะให้เป็นภาษาวิชาการที่ถูกต้อง สละสลวย โดยความหมายเดิม

## เมื่อเสร็จ
สรุปสั้น ๆ ว่าปรับภาษาจุดใด และมีป้ายที่ยังค้างกี่จุด

---
"""


def chapters():
    return sorted(CH.glob("*.md")) if CH.exists() else []


def mmd_path(name):
    return DIAG / f"{name}.mmd"


def assemble(mode):
    parts = []
    if META.exists():
        parts.append(META.read_text(encoding="utf-8"))
    for p in chapters():
        parts.append(p.read_text(encoding="utf-8"))
    text = "\n\n".join(parts)

    def repl(m):
        name, caption = m.group(1), (m.group(2) or m.group(1)).strip()
        png = FIG / f"{name}.png"
        src = mmd_path(name)
        if mode == "docx" and png.exists():
            return f"![{caption}](figures/{name}.png)"
        code = src.read_text(encoding="utf-8").strip() if src.exists() else "%% [ต้องการข้อมูล] ไม่พบไฟล์ diagram"
        return f"**{caption}**\n\n```mermaid\n{code}\n```"

    return PH.sub(repl, text)


def cmd_make_ref():
    if not shutil.which("pandoc"):
        sys.exit("ต้องติดตั้ง pandoc ก่อน")
    try:
        from docx import Document
        from docx.oxml import OxmlElement
        from docx.oxml.ns import qn
        from docx.shared import Inches, Pt
    except ImportError:
        sys.exit("ต้องติดตั้ง python-docx ก่อน: pip install python-docx")
    REF.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pandoc", "-o", str(REF), "--print-default-data-file", "reference.docx"],
                   check=True)
    d = Document(str(REF))
    warnings.filterwarnings("ignore", category=UserWarning)
    for name, size in STYLE_SIZES.items():
        try:
            st = d.styles[name]
        except KeyError:
            continue
        st.font.size = Pt(size)
        rpr = st.element.get_or_add_rPr()
        rf = rpr.find(qn("w:rFonts"))
        if rf is None:
            rf = OxmlElement("w:rFonts")
            rpr.insert(0, rf)
        for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
            rf.set(qn(attr), THAI_FONT)
        for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
            rf.attrib.pop(qn(attr), None)
        szcs = rpr.find(qn("w:szCs"))
        if szcs is None:
            szcs = OxmlElement("w:szCs")
            rpr.append(szcs)
        szcs.set(qn("w:val"), str(size * 2))
        if name.startswith("Heading") or name in ("Title", "TOC Heading"):
            st.font.bold = True
            st.font.color.rgb = None
    for s in d.sections:
        s.top_margin = Inches(1.5)
        s.left_margin = Inches(1.5)
        s.bottom_margin = Inches(1)
        s.right_margin = Inches(1)
    d.save(str(REF))
    print(f"wrote {REF.relative_to(ROOT)}")


def cmd_diagrams():
    mmdc = shutil.which("mmdc")
    if not mmdc:
        print("ข้าม: ไม่พบ mmdc (ติดตั้ง: npm i -g @mermaid-js/mermaid-cli) — docx จะใส่โค้ด mermaid แทนรูป")
        return
    FIG.mkdir(parents=True, exist_ok=True)
    for src in sorted(DIAG.glob("*.mmd")):
        out = FIG / f"{src.stem}.png"
        if out.exists() and out.stat().st_mtime >= src.stat().st_mtime:
            continue
        r = subprocess.run([mmdc, "-i", str(src), "-o", str(out), "-s", "2", "-b", "white"],
                           capture_output=True, text=True)
        print(("rendered " if r.returncode == 0 else "FAILED ") + src.name)
        if r.returncode != 0:
            print(r.stderr[-800:])


def cmd_docx():
    if not shutil.which("pandoc"):
        sys.exit("ต้องติดตั้ง pandoc ก่อน (apt install pandoc / brew install pandoc)")
    OUT.mkdir(parents=True, exist_ok=True)
    tmp = OUT / "_assembled.md"
    tmp.write_text(assemble("docx"), encoding="utf-8")
    args = ["pandoc", str(tmp), "-o", str(OUT / "thesis.docx"),
            "--toc", "--toc-depth=2", "-M", "toc-title=สารบัญ",
            f"--resource-path={OUT}"]
    if REF.exists():
        args.append(f"--reference-doc={REF}")
    else:
        print("เตือน: ยังไม่มี reference.docx — รัน build.py make-ref เพื่อให้ได้ฟอนต์ TH Sarabun New")
    subprocess.run(args, check=True)
    tmp.unlink()
    print(f"wrote {(OUT / 'thesis.docx').relative_to(ROOT)}")


def cmd_gemini():
    OUT.mkdir(parents=True, exist_ok=True)
    body = assemble("gemini")
    stamp = f"_สร้างเมื่อ {date.today().isoformat()} จากไฟล์ใน thesis/chapters/_\n\n"
    path = OUT / "GEMINI_HANDOFF.md"
    path.write_text(GEMINI_HEADER + stamp + body + "\n", encoding="utf-8")
    print(f"wrote {path.relative_to(ROOT)}")


def cmd_check():
    have = {p.name for p in chapters()}
    missing = [n for n in EXPECTED if n not in have]
    print("บทที่ยังไม่มีไฟล์:", ", ".join(missing) if missing else "ครบ")
    total = 0
    for p in chapters():
        t = p.read_text(encoding="utf-8")
        counts = {m: t.count(m) for m in MARKERS if t.count(m)}
        for m in PH.finditer(t):
            if not mmd_path(m.group(1)).exists():
                counts[f"diagram ไม่พบ: {m.group(1)}"] = counts.get(f"diagram ไม่พบ: {m.group(1)}", 0) + 1
        if counts:
            total += sum(counts.values())
            print(f"  {p.name}: " + ", ".join(f"{k} x{v}" for k, v in counts.items()))
    print(f"ป้ายค้างทั้งหมด: {total}")


def main(argv):
    cmds = {"make-ref": cmd_make_ref, "diagrams": cmd_diagrams, "docx": cmd_docx,
            "gemini": cmd_gemini, "check": cmd_check}
    if not argv:
        sys.exit(__doc__)
    if argv[0] == "all":
        cmd_diagrams(); cmd_docx(); cmd_gemini(); cmd_check()
    elif argv[0] in cmds:
        cmds[argv[0]]()
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
