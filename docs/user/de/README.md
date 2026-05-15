# MetroViz — Anwender-Dokumentation (Deutsch)

> Zielgruppe: Alle Nextcloud-Nutzer, die mit MetroViz arbeiten.

**MetroViz-NC** ist die Nextcloud-Variante von
[MetroViz von Ralf Stockmann](https://github.com/rstockm/Metroviz).
Visualisierung, Bedienung und das Roadmap-Format (`.metro`) bleiben
identisch — neu ist die Integration in Nextcloud: Speichern in
NC-Files statt im Browser, Teilen über die NC-Freigabe statt
Compressed-URL, Öffnen per Doppelklick aus der Dateien-App.

---

## Was ist MetroViz?

MetroViz visualisiert Technologie-Roadmaps als Metro-Karten — wie ein U-Bahn-Plan, in dem jede Linie ein Themenstrang ist und jede Station ein Meilenstein. Du erstellst deine Karten in Nextcloud, speicherst sie wie ganz normale Dateien (`.metro`) und kannst sie über die übliche Nextcloud-Freigabe mit deinem Team teilen.

Im Unterschied zur klassischen Tabelle siehst du auf einen Blick: Welche Themen laufen parallel? Wo kreuzen sie sich? Was kommt als Nächstes? Karten lassen sich anschließend als SVG, PNG, PDF, JSON oder Markdown exportieren.

---

## Erste Schritte

### 1. MetroViz öffnen

Klicke in der Nextcloud-Top-Leiste auf **MetroViz**. Beim ersten Aufruf siehst du eine Demo-Roadmap, damit du sofort etwas zum Anschauen hast.

### 2. Eine eigene Roadmap anlegen

In der linken Seitenleiste:

1. Klicke auf **+ Neu**.
2. Gib der Roadmap einen Namen (z. B. „Plattform-Migration 2026").
3. Die neue Datei wird automatisch unter `MetroViz/<Name>.metro` in deinen Nextcloud-Dateien angelegt.

### 3. Inhalte hinzufügen

Klicke oben rechts auf **Editor** (das Stift-Symbol). In der Editor-Seitenleiste kannst du in zwei Modi arbeiten:

- **Visual Editor:** Felder für Metadaten, Zonen (z. B. „2026 Q1"), Linien (Themenstränge) und Events (Meilensteine). Inputs werden direkt übernommen.
- **JSON:** Roh-Bearbeitung für Power-User. Fehlerhafte JSON wird in roter Inline-Meldung markiert.

### 4. Speichern

Speichern geschieht **automatisch** alle 2 Sekunden nach deiner letzten Änderung. Die Statusanzeige neben dem Titel zeigt:

| Anzeige | Bedeutung |
|---|---|
| _(leer)_ | Keine Änderungen seit dem letzten Laden |
| ● Ungespeicherte Änderungen | Du tippst gerade — wird in Kürze gespeichert |
| ⊙ Speichert… | WebDAV-Schreibvorgang läuft |
| ✓ Gespeichert | Letzter Schreibvorgang erfolgreich |

Manuelles Speichern geht zusätzlich über das **⋮**-Menü oben rechts → **Speichern**.

---

## Die Oberfläche

```
┌─────────────────────────────────────────────────────────────────┐
│  Nextcloud-Topbar (NC-Standard, MetroViz-Eintrag aktiv)         │
├──────────────┬──────────────────────────────────┬───────────────┤
│              │ Demo-Roadmap        ✓ Gespeichert │               │
│  + Neu       │ ┌────────────────────────────┐   │               │
│              │ │ Metro-Map | Textfassung    │   │               │
│  Demo-       │ ├────────────────────────────┤   │   Editor      │
│  Roadmap     │ │                            │   │   (rechts,    │
│  ─────────   │ │   (Metro-Karte)            │   │    aufklapp-  │
│  Migration   │ │                            │   │    bar)       │
│  -2026       │ │                            │   │               │
│  Tech-       │ │                            │   │               │
│  Strategy    │ │                            │   │               │
│              │ └────────────────────────────┘   │               │
└──────────────┴──────────────────────────────────┴───────────────┘
   Datei-Liste            Hauptbereich              Bearbeitung
```

### Die linke Seitenleiste — Dateien

Hier siehst du alle `.metro`-Dateien in deinem `MetroViz/`-Ordner. Die aktive Datei ist markiert. Ein Klick öffnet die Datei.

**+ Neu** legt eine neue, leere Roadmap an.

### Der Hauptbereich — zwei Ansichten

Oben in der Header-Leiste wechselst du zwischen:

- **Metro-Map** — die grafische Karte. Linien und Events lassen sich anklicken (Detail-Tooltip), Zonen sind farbig hinterlegt.
- **Textfassung** — die Roadmap als gerendertes Markdown. Praktisch zum Vorlesen, Drucken oder Reinkopieren in Tickets / Wikis.

### Die rechte Seitenleiste — Editor

Über den **Editor**-Button im Header geöffnet. Zwei Tabs:

- **Visual Editor** — strukturierte Eingabe-Felder. Empfohlen für alle, die ungern JSON schreiben.
- **JSON** — direkter JSON-Zugriff für Refactor / Bulk-Import.

Schließen mit dem **×**-Button oben rechts in der Seitenleiste.

### Das ⋮-Aktionsmenü

Oben rechts neben dem Editor-Button. Inhalt:

| Eintrag | Wirkung |
|---|---|
| Speichern | Manuelles Speichern jetzt |
| Speichern als… | Kopie unter neuem Namen anlegen |
| Importieren | `.metro`- oder `.json`-Datei aus dem Dateisystem hochladen (überschreibt die aktive Roadmap) |
| Exportieren ▸ als SVG / PNG / PDF Map | Karten-Export |
| Exportieren ▸ als JSON / Markdown | Daten-Export |
| Aufräumen | Räumt verwaiste Linien / Events / Zonen aus dem JSON, ohne sichtbare Änderung |

---

## Häufige Aufgaben

### Eine neue Linie hinzufügen

Editor öffnen → Visual Editor → Abschnitt „Linien" → **+ Linie hinzufügen**. Name, Farbe und Reihenfolge eintragen.

### Ein Event auf eine Linie setzen

Editor → Visual Editor → Abschnitt „Events" → **+ Event hinzufügen**. Linie, Zeitpunkt und Titel angeben. Auf der Map erscheint das Event als Station auf der gewählten Linie.

### Eine Zone für ein Quartal anlegen

Editor → Visual Editor → Abschnitt „Zonen" → **+ Zone hinzufügen**. Start, Ende und Farbe eingeben. Auf der Map erscheint die Zone als farbig hinterlegter Hintergrund-Block.

### Eine Roadmap mit Kollegen teilen

MetroViz nutzt die normale Nextcloud-Freigabe. Schritte:

1. Wechsle in die Nextcloud-Dateien-App.
2. Navigiere zu `MetroViz/`.
3. Rechtsklick auf die `.metro`-Datei → **Teilen** (oder das Teilen-Symbol).
4. Empfänger eintragen — wie bei jeder anderen Datei.

Der Empfänger öffnet die Datei in seiner eigenen MetroViz-Ansicht (er muss die App auf seinem Account aktiviert haben).

### Eine bestehende Roadmap aus JSON importieren

⋮-Menü → **Importieren** → Datei wählen. Die aktive Roadmap wird **überschrieben** — also vorher eine Kopie anlegen, falls du den alten Stand behalten willst (⋮ → Speichern als…).

### Exportieren

⋮-Menü → **Exportieren** ▸ Format wählen:

- **SVG Map** — Vektor-Grafik, beliebig skalierbar, ideal für Folien.
- **PNG Map** — Pixelbild, für Chat-Messages oder schnelle Vorschau.
- **PDF Map** — Druckfertig.
- **JSON** — Roh-Datei, identisch zum `.metro`-Format.
- **Markdown** — Roadmap als Text, gut für Tickets, Wikis, README.

---

## Tastatur und Bedienung

Alle Schaltflächen sind tastaturbedienbar. Wichtige Standards:

- **Tab** / **Shift+Tab** — Fokus durch Buttons und Eingabefelder bewegen.
- **Enter** / **Leertaste** — fokussierte Schaltfläche aktivieren.
- **Esc** — geöffnetes Menü oder Editor schließen.

Touch-Bedienung: Alle Schaltflächen sind mindestens 44 × 44 Pixel groß. Die Oberfläche funktioniert vollständig ab 375 px Bildschirmbreite (Smartphone-Hochformat).

---

## Häufige Fragen

**F: Wo werden meine Roadmaps gespeichert?**
A: In deinen eigenen Nextcloud-Dateien, im Ordner `MetroViz/`. Du kannst dort jederzeit auch außerhalb von MetroViz reingucken oder die `.metro`-Dateien herunterladen.

**F: Was passiert, wenn ich den Browser-Tab schließe, bevor gespeichert wurde?**
A: MetroViz speichert automatisch alle 2 Sekunden nach deiner letzten Änderung. Achte vor dem Schließen auf das **✓ Gespeichert**-Symbol neben dem Titel — wenn es zu sehen ist, sind alle Änderungen sicher.

**F: Kann ich offline arbeiten?**
A: Aktuell nicht. MetroViz speichert nur, wenn der Browser Nextcloud erreicht. Bei Verbindungsabbruch erscheint eine NC-Standard-Fehlermeldung; deine Änderungen bleiben im Browser-Speicher, bis die Verbindung zurück ist.

**F: Was ist der Unterschied zwischen Visual Editor und JSON?**
A: Inhaltlich nichts. Der Visual Editor bietet strukturierte Eingabe-Felder; der JSON-Tab zeigt dieselben Daten als Roh-Text. Power-User mit JSON-Routine sind im JSON-Tab schneller; alle anderen bleiben besser im Visual Editor.

**F: Kann ich meine Roadmap auch anderen mit ohne Nextcloud zeigen?**
A: Ja — exportiere sie über das ⋮-Menü als SVG, PNG oder PDF, oder als Markdown / JSON.

**F: Mein Kollege hat eine Roadmap mit mir geteilt, aber ich sehe sie nicht in der Dateienliste.**
A: Die linke Liste zeigt nur Dateien aus deinem eigenen `MetroViz/`-Ordner. Geteilte Dateien öffnest du über die Nextcloud-Dateien-App (Klick auf die `.metro`-Datei dort öffnet sie in MetroViz).

**F: Die Karte schneidet Inhalte ab, wenn ich auf dem Handy arbeite.**
A: Wechsle in den Querformat-Modus, oder nutze die **Textfassung** statt der Map-Ansicht — die ist linear und passt sich der Bildschirmbreite an.

**F: Wie lösche ich eine Roadmap?**
A: In der Nextcloud-Dateien-App: Rechtsklick auf die `.metro`-Datei → **Löschen**. Die Datei landet wie üblich in NC's Papierkorb.

---

## Englische Version

[English](../en/README.md)
