# GitHub Synchronisation bei Freigabe / Release

Sobald eine Version fertiggestellt und vom Benutzer abgenommen / abgesegnet wird, muss das Projekt automatisch zu GitHub synchronisiert werden.

## Ablauf bei Freigabe:
1. **Versionsprüfung**: Sicherstellen, dass die Versionsnummer gemäß [versioning.md](versioning.md) in `index.html` (Header, Mini-Header, Changelog) angehoben wurde.
2. **Git Status & Stage**:
   ```bash
   git add .
   ```
3. **Commit mit prägnanter Release-Nachricht**:
   ```bash
   git commit -m "release: vX.Y.Z - <Kurze Beschreibung der Änderungen>"
   ```
4. **Push zum GitHub-Remote**:
   ```bash
   git push origin main
   ```
5. **Erfolgsmeldung**: Den Benutzer über den erfolgreichen Push und Commit informieren.
