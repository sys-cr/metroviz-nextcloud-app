# Datei aus Nextcloud Files öffnen

## Was ist das?

Ab Version 0.1.0 ist MetroViz als nativer Datei-Viewer für `.metro`-Dateien
registriert. Ein Doppelklick auf eine `.metro`-Datei in der Nextcloud-
Dateien-App öffnet MetroViz direkt im Viewer-Panel — ohne Umweg über das
Top-Menü.

## So funktioniert es

1. Öffne die **Dateien**-App in Nextcloud.
2. Navigiere zu deinem Ordner mit `.metro`-Dateien (Standard: `MetroViz/`,
   aber jede Ablage funktioniert).
3. **Doppelklick** auf eine `.metro`-Datei.
4. MetroViz öffnet die Roadmap im Vollbild-Viewer.
5. Schließen mit **Esc** oder dem **×** in der Viewer-Kopfzeile.

Bearbeitung und Speichern funktionieren identisch zum Standalone-Aufruf
über das Top-Menü — alle Änderungen landen in derselben Datei am gleichen
Pfad. Der Auto-Save-Indikator zeigt den aktuellen Status (`● dirty`,
`⊙ saving`, `✓ saved`).

## Häufige Fragen

**F: Mein `.metro`-File wird als rohes JSON statt in MetroViz geöffnet.**
A: Die MIME-Typ-Datenbank der Nextcloud-Instanz ist veraltet. Der Admin
muss einmalig laufen lassen:

```bash
sudo -u www-data php occ maintenance:mimetype:update-db
sudo -u www-data php occ files:scan --all
```

**F: Geteilte `.metro`-Dateien — funktioniert der Doppelklick auch dort?**
A: Ja. Sobald die App auf dem Account des Empfängers aktiv ist, öffnet
sich MetroViz auch für geteilte Dateien (NC's normales Berechtigungs-
modell greift; Schreibrechte richten sich nach dem Share).

**F: Muss ich `.metro`-Dateien zwingend im `MetroViz/`-Ordner ablegen?**
A: Nein. Der Pfad ist beliebig — der Viewer löst über die Nextcloud-
File-ID auf, nicht über den Ordnernamen. Der `MetroViz/`-Ordner ist nur
die Default-Ablage für neu im Top-Menü-Modus erstellte Roadmaps.

**F: Funktioniert der Viewer auf dem Tablet?**
A: Ja. Das Viewer-Panel passt sich an die Bildschirmbreite an und nutzt
die Touch-Gesten von Nextcloud's eigenem Viewer-Framework (Wischen zum
Schließen, Doppeltipp für Vollbild).

## Hilfe-Kurztext (für In-App-Hilfe)

> Doppelklick auf eine `.metro`-Datei in den Nextcloud-Dateien öffnet
> MetroViz im Viewer-Panel. Mit Escape oder dem ×-Knopf schließen.
> Speichern erfolgt automatisch im ursprünglichen Datei-Pfad.
