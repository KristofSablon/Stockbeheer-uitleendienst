#!/usr/bin/env python3
"""Bouwt Uitleendienst-app.aspx uit shell.html, de app-delen en de ingesloten xlsx-bibliotheek."""
import pathlib

HIER = pathlib.Path(__file__).parent

def veilig_in_script(tekst: str) -> str:
    # Een letterlijke </script> in ingesloten code zou het script-blok voortijdig sluiten.
    return tekst.replace("</script", "<\\/script")

shell = (HIER / "shell.html").read_text(encoding="utf-8")
xlsx = veilig_in_script((HIER / "lib" / "xlsx.mini.min.js").read_text(encoding="utf-8"))
app = veilig_in_script("\n".join(
    (HIER / naam).read_text(encoding="utf-8") for naam in ("app1.js", "app2.js", "app3.js", "app4.js")))

uit = shell.replace("/*XLSX*/", xlsx, 1).replace("/*APPJS*/", app, 1)
doel = HIER / "Uitleendienst-app.aspx"
doel.write_text(uit, encoding="utf-8")
print(f"Geschreven: {doel} ({doel.stat().st_size/1024:.0f} kB)")
