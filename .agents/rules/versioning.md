# Versionierung & Update Notes Richtlinien

Bei jeder Funktionsänderung, Fehlerbehebung oder jedem Release müssen folgende Regeln eingehalten werden:

1. **Versionsnummer aktualisieren**:
   - Die Versionsnummer muss bei neuen Funktionen (Minor) oder Bugfixes (Patch) stets in [index.html](file:///d:/Programming/Lerntracker/index.html) angehoben werden:
     - Im Haupt-Header (Suchbegriff: `title="Versionshinweise ansehen"`)
     - Im kompakten Mini-Header (Suchbegriff: `id="compactHeaderBar"`)
     - Im Changelog-Modal (`changelogModal`) als oberster Eintrag mit `(Aktuell)`

2. **Genaue Datumsangabe in den Update Notes**:
   - In den Versionshinweisen / Update Notes (`changelogModal`) **muss stets das exakte Veröffentlichungsdatum** im Format `DD.MM.YYYY` (z. B. `07.09.2026`) angegeben werden.
   - Vage Zeitangaben wie „Herbst 2026“ oder „September 2026“ sind **ausdrücklich untersagt**.
