# Development Plan: app-templates (claude/brave-hypatia-6fue7s branch)

*Generated on 2026-11-15 by Vibe Feature MCP*
*Workflow: [qrspi](https://codemcp.github.io/workflows/workflows/qrspi)*

## Goal
Für Lernapps.net eine Umgebung bereitstellen, in der vorkonfigurierte Agenten Lehrkräften erlauben, Lernapps zu bauen, ohne lokale Einrichtung. npm-Installation und Netzwerkeinstellungen sind bisher die Hürde. Zu klären: Optionen und Architektur (Browser/WebContainer wie bolt.diy vs. Docker wie Gizmos).
## Key Decisions
- Zielgruppe: Lehrkräfte ohne Technikwissen und technikaffine Nutzer. Einfacher Einstieg, dazu Zugang zum Code.
- Modellkosten: Nutzer bringen ein eigenes KI-Abo oder eigene API-Schlüssel mit. lernapps.net zahlt keine Tokens.
- Veröffentlichung: über ein GitHub-Repository der Person (Autor behält sein Repo).
- Betrieb: entweder vollständig im Browser, oder konfiguriert auf einem SaaS/PaaS, das der Creator selbst bezahlt. Kein von lernapps.net betriebener Server.

- Design, Container-Weg: Richtung A mit B gewählt (Dev-Container im App-Repository, gemeinsames vorgebautes Image). Agenten: Claude Code und Codex vorinstalliert. Host: GitHub Codespaces zuerst. Claude Code im Web bleibt eine mögliche Ergänzung für Personen mit Claude-Abo. Der Browser-Weg (bolt.diy) und das Homelab (`opencode-router`) sind nicht Teil dieser Richtung und bleiben spätere Optionen.

- Anforderung (Nutzer): Der Container muss für Recherche auf das gesamte Internet zugreifen können. Es gibt keine Erlaubnisliste für ausgehenden Verkehr. Das ersetzt die Firewall der Anthropic-Referenz im Design.

- Anforderung (Nutzer): Die Agenten laufen im Dev-Container ohne Einschränkungen (keine Rückfragen, keine Befehlsfilter). Die Sicherheit der veröffentlichten App liegt in der GitHub-Actions-Pipeline (`lernapps check`, Prüfung vor dem Listen). Das ersetzt die Vorgabe „Rückfragen an" aus Schnitt 3.

## Notes
Kontext aus docs: Vision und arc42 legen fest: statisch, kein Server, keine laufenden Kosten, keine Datenerhebung, GitHub als Produktionsmittel. Ein Docker-Backend widerspricht dem Betriebsprinzip; WebContainer passt dazu. Das ist nur eine Hypothese und noch keine Entscheidung.

## Questions
*Entrance: Nutzerauftrag liegt vor.*

### Tasks

### Completed
- [x] Created development plan file
- [x] Vier Fragen an den Nutzer gestellt und Antworten in Key Decisions festgehalten

## Research
*Entrance: offene Fragen sind benannt.*

### Tasks
- [ ] Offen: Läuft ein Agent in WebContainer? Claude Code nicht (siehe Spikes). Ein Agent in JavaScript mit Modell-API-Aufruf aus dem Browser ist ungeprüft (CORS, Schlüssel im Browser).
- [ ] Offen: Aktuelle Ona-Preise und Bedingungen direkt bei Ona erfragen (Preisseite verweist auf den Vertrieb).
- [ ] Offen: Aktuelle WebContainer-Lizenzbedingungen und Preis bei StackBlitz erfragen.
- [ ] Offen: Dev-Container in Codespaces selbst (Firewall mit NET_ADMIN, Start per Link, Abo-Anmeldung) prüfen. Der Spike lief nur in Docker.

### Completed
- [x] Fakten zu WebContainer, bolt.diy, Codespaces/Dev-Container, Docker-Sandboxen, Abo-Nutzung gesammelt (siehe Findings)

### Findings (Fakten, Quellen teils sekundär)
**WebContainer / bolt.diy (Browser-Architektur)**
- Nur Node.js. Keine nativen Binärdateien, kein Python/Ruby/Go. [StackBlitz-Dokumentation](https://developer.stackblitz.com/platform/webcontainers/), [Bitsrc-Artikel](https://blog.bitsrc.io/running-node-js-in-your-browser-with-webcontainers-48ada077518e)
- Produktive kommerzielle Nutzung der WebContainer-API braucht eine Lizenz. Prototypen und Proof of Concepts nicht. Kein öffentlicher Preis. Die Seite ist alt. [Commercial Usage](https://webcontainers.io/enterprise). Die bolt.diy-README bestätigt das für den MIT-Code. [bolt.diy README](https://github.com/stackblitz-labs/bolt.diy/blob/main/README.md)
- Offen ist, ob eine gemeinnützige, kostenlose Plattform als „kommerziell, gewinnorientiert" gilt.
- Browser: Chromium-Browser voll, Firefox und Safari mit Einschränkungen (Cross-Origin-Isolation). Speicherlimits auf Mobilgeräten. Die offizielle Seite stammt von 2023. [StackBlitz zu Firefox](https://blog.stackblitz.com/posts/supporting-firefox/)
- Das Hosting braucht die Header COOP und COEP (Cross-Origin-Isolation). Für GitHub Pages ist das offen, da sich dort keine Header setzen lassen.
- npm-Installation läuft im Browser über die Registry mit CORS. Fehlerantworten (404) ohne CORS-Header sind bekannt. Private Registries sind ein Problem. Der Netzwerkzugriff unterliegt CORS. [CORS-Proxy-Beitrag](https://blog.stackblitz.com/posts/cors-proxy)
- bolt.diy: Eigener API-Schlüssel, 19+ Anbieter, Schlüssel im Browser gespeichert. Der CORS-Proxy aus bolt.new fehlt in Forks. Die Umgebung ist flüchtig, node_modules werden je Sitzung neu installiert. [Railway-Anleitung](https://railway.com/deploy/bolt-diy)

**Cloud-Entwicklungsumgebung (Dev-Container)**
- Codespaces: 120 Kernstunden und 15 GB Speicher pro Monat für kostenlose persönliche Konten. Auf 2 Kernen sind das etwa 60 Stunden. [GitHub-Abrechnung](https://docs.github.com/en/billing/managing-billing-for-your-products/managing-billing-for-github-codespaces/about-billing-for-codespaces). Der Creator bezahlt selbst, wenn er mehr braucht.
- Anthropic bietet eine Referenz-Dev-Container-Vorlage mit Firewall-Skript (`init-firewall.sh`) und ein Dev-Container-Feature `ghcr.io/anthropics/devcontainer-features/claude-code`. [Anthropic-Dokumentation](https://docs.anthropic.com/en/docs/claude-code/devcontainer). Mit `--dangerously-skip-permissions` schützt der Container nicht vor Datenabfluss.
- Zur Nutzung in Codespaces fand die Suche nichts. Das ist ungeprüft.

**Docker-basierte Baukästen**
- Open-Source-Beispiel: sandboxd (Go-Binary, Docker, Traefik, SQLite, MIT). Ausgehender Netzverkehr ist standardmäßig offen. [GIGAZINE](https://gigazine.net/news/20260808-sandboxd/). Ein Selbstbetrieb widerspricht der Entscheidung „kein Server von lernapps.net".

**Gitpod / Ona (Cloud-Entwicklungsumgebung mit Agenten)**
- Gitpod heißt seit September 2025 Ona und ist auf KI-Agenten ausgerichtet. [Ona-Ankündigung](https://ona.com/stories/gitpod-is-now-ona), [The Register](https://www.theregister.com/2025/09/03/gitpod_rebrands_as_ona/)
- Die Preisseite von ona.com zeigt „Contact sales". Drittquellen nennen Core ab 20 USD pro Monat (Rechenzeit und Agent-Token in „OCUs") und melden, dass der Gratis-Tarif entfallen ist. Die Quellen widersprechen sich. [Softwr](https://www.softwr.com/pricing/gitpod), [Preisänderungen](https://pricingsaas.com/companies/gitpod/diffs/2026Q2)
- Kostenlose Guthaben (bis 200 USD pro Monat) gibt es laut Sekundärquelle für Open-Source-Maintainer. [foropensource](https://foropensource.com/company/gitpod-ona/)
- Eigene Modellschlüssel (BYOK): Anthropic-API-Schlüssel pro Runner, außerdem OpenAI und Bedrock. [Ona-Dokumentation](https://ona.com/docs/ona/agents/llm-providers/anthropic.md). Für ein Claude-Abo gibt es keinen Beleg.
- Ona kann in der eigenen VPC betrieben werden. Zu Dev-Containern und Netzwerkregeln fand die Suche nichts Belastbares.
- Eine Coder-Marketingseite behauptet, Ona Cloud sei im Oktober 2026 eingestellt worden. Ona-Seiten und Dokumentation bestehen weiter. Der Widerspruch ist ungeklärt. [Coder](https://coder.com/solutions/workspaces/ona-alternative)

**Eigenes Abo oder eigener Schlüssel**
- Anthropic erlaubt Abo-OAuth-Token nur in Claude Code und nativen Anthropic-Anwendungen. Die Nutzung in Drittprodukten (auch im Agent SDK) ist verboten, seit Februar 2026 durchgesetzt. [Rechtliches zu Claude Code](https://code.claude.com/docs/en/legal-and-compliance.md), [Winbuzzer](https://winbuzzer.com/2026/02/19/anthropic-bans-claude-subscription-oauth-in-third-party-apps-xcxwbn/)
- Folge: Ein Browser-Baukasten wie bolt.diy braucht einen API-Schlüssel (pay per use). Ein Abo funktioniert nur, wenn der offizielle Claude Code läuft, etwa in einem Dev-Container.

### Spikes (am 2026-11-15, Wegwerf-Code außerhalb des Repositories)
**Spike A: Browser (WebContainer in Headless-Chromium, Seite mit COOP/COEP-Headern)**
- `WebContainer.boot()` gelingt in 1,6–3,6 s.
- `npm install vue` dauert etwa 12 s. `npm install vue vite @vitejs/plugin-vue` (33 Pakete) dauert etwa 30 s.
- `vite build` einer kleinen Vue-App gelingt in etwa 13 s nach der Installation. Vite nutzt dabei einen WASI-Ersatz für die native Binärdatei (Warnung „WASI is an experimental feature").
- `npm install @anthropic-ai/claude-code` gelingt, aber `claude --version` liefert keine Version, nur das Banner der WebContainer-Shell. Claude Code läuft damit nicht im Browser. Es ist eine native Binärdatei.
- Der Boot lädt Ressourcen von `w-corp-staticblitz.com` und `t.staticblitz.com`. Eine Anfrage an `t.staticblitz.com` schlug fehl (Paket-Cache, unkritisch). Der Browser-Weg hängt also von StackBlitz-Servern ab.
- Nicht geprüft: Safari und Firefox, Mobilgeräte, Modell-Aufrufe aus dem Browser, der echte Scaffold des `app-templates`-Repositories (`vite-plus`), Hosting mit COOP/COEP auf GitHub Pages.

**Spike B: Dev-Container (Docker, Image mit Node 22, git, iptables, Claude Code)**
- Die Anthropic-Referenz (`.devcontainer/Dockerfile`) baut hinter dem Proxy nicht. Der Download des Pakets `git-delta` von GitHub schlägt fehl (Exit 5). Ein minimales Image mit Node 22 und Claude Code 2.1.325 baut in etwa 60 s. Dafür sind der Host-Netzmodus, das Proxy-Zertifikat und die Proxy-Variablen nötig.
- Im Container: `npm ci` des Repositories `app-templates` dauert 13 s (270 Pakete). `npm test`: 134 von 143 Tests bestehen. Die Fehlschläge stammen von einer fehlenden Peer-Abhängigkeit (`@lernapps/tooling`), nicht von der Umgebung.
- Die Firewall der Referenz (`init-firewall.sh`) erlaubt GitHub (Netzbereiche über die API), `registry.npmjs.org`, `api.anthropic.com`, `sentry.io`, `statsig.com` und VS-Code-Hosts. Sie braucht `NET_ADMIN` und `NET_RAW`. Nicht geprüft, weil der Spike hinter einem Proxy lief.
- Nicht geprüft: Start in Codespaces oder Ona, Anmeldung mit Abo im Container, der Start im Browser ohne lokale Installation.

**Folgerungen für das Design (Fakten, noch keine Entscheidung)**
- Der Browser-Weg trägt Installation und Build der Web-Pakete. Er trägt keinen Claude-Code-Agenten. Der Agent müsste ein eigener, in JavaScript geschriebener sein, mit API-Schlüssel (kein Abo).
- Der Dev-Container-Weg trägt den echten Claude Code und damit auch Abo-Anmeldung. Er braucht ein Konto bei einem Anbieter der Cloud-Umgebung.

### bolt.diy im Detail (Quelle: [README](https://github.com/stackblitz-labs/bolt.diy/blob/main/README.md), nicht in einem Spike geprüft)
- Browser-Arbeitsfläche mit WebContainer, Editor, Terminal, Vorschau. 22+ Modellanbieter, Anthropic standardmäßig aktiv. Schlüssel werden in der Oberfläche eingegeben und laut README in Browser-Cookies gespeichert.
- Git: Klonen, Pushen, Snapshots, ZIP-Export. Ein-Klick-Bereitstellung bei Netlify, Vercel und GitHub Pages. Das Pushen in ein GitHub-Repository passt zum Veröffentlichungsweg „Repository der Person".
- Betrieb: Node.js 22.12 oder neuer und pnpm, Build mit `react-router build`, Docker-Profile, Cloudflare-Pages-Anleitungen aus der Community. Es ist also eine Anwendung mit Server-Anteil und keine rein statische Seite. Das ist aus dem Aufbau abgeleitet und noch nicht geprüft.
- Pflegestatus: Das README sagt, es seien nur Fehlerbehebungen und Abhängigkeits-Updates geplant, „no new features". Neue Versionen von bolt.diy bringen also kaum neue Funktionen.
- Lizenz: Der Code ist MIT. Für produktiven kommerziellen Einsatz verlangt das README zusätzlich eine WebContainer-Lizenz.
- Agent: Es ist ein Chat-Agent im Browser, kein Claude Code. Ein Claude-Abo lässt sich dort nicht nutzen (siehe Regeln von Anthropic).
- Offen: Läuft die Plattform-Vorlage (`vite-plus`, Vue) dort? Wer betreibt den Server-Anteil (Creator selbst)? Wie viel Wartung braucht eine eigene Instanz?

### Spike C: bolt.diy lokal ausprobiert (Stand des geklonten Repositories: letzter Commit 14.10.2026)
- Die Annahme „kaum gepflegt" ist damit nur teilweise belegt: Der letzte Commit im Hauptzweig ist von Oktober 2026, das README spricht aber von „no new features".
- `pnpm install` dauert 11 s, `pnpm run build` 20 s. Das Ergebnis enthält `build/client` und `build/server`. Es ist also eine Anwendung mit Server-Anteil (react-router, Server-Routen wie `api.chat`). Eine reine statische Auslieferung ist nach diesem Befund nicht möglich.
- `pnpm run start` bindet an `::` und scheitert ohne IPv6. Mit `vite preview --host 127.0.0.1` läuft es.
- Die Seite setzt selbst `Cross-Origin-Opener-Policy: same-origin` und `Cross-Origin-Embedder-Policy: credentialless`. Der Browser meldet `crossOriginIsolated: true`. Eigene Header-Konfiguration beim Hosting ist nicht nötig.
- Beim ersten Aufruf erscheint ein Willkommensdialog mit vier Schritten (Name, Avatar und weitere).
- Ein Prompt löst zuerst einen Modell-Aufruf zur Wahl des Starters aus. Der Starter „Vue" wurde in WebContainer angelegt (Dateibaum, Editor). Danach scheiterte der eigentliche Aufruf mit „Server Error", weil als Anbieter Anthropic ohne Schlüssel voreingestellt war. Die Oberfläche zeigt die Meldung „Not Set (Please set via UI or ENV_VAR)" und einen Link für den Schlüssel.
- Nicht erreicht: der vollständige Ablauf Agent schreibt Dateien, `npm install`, `npm run build` im Workbench. Ein simulierter OpenAI-kompatibler Server wurde vom Dienst nicht aufgerufen (Anbieter „OpenAILike" erschien nicht in der Modellliste). Für diesen Ablauf fehlt ein echter Schlüssel oder weitere Konfiguration.
- Beim Setzen der Einstellungen per `localStorage` mit unvollständigem Objekt stürzte die Oberfläche ab (Fehler „Cannot read properties of undefined (reading 'enabled')"). Das betrifft nur mein Vorgehen im Spike.
- Abo-Anmeldung in bolt.diy (Quelltext geprüft): Es gibt keine Anmeldung mit ChatGPT- oder Claude.ai-Konto. Alle Anbieter in `app/lib/modules/llm/providers/` lesen einen API-Schlüssel (UI oder Umgebungsvariable). Treffer zu „codex" sind nur Modellnamen. Der Anbieter „Github" nutzt einen GitHub-Token für GitHub Models. Dessen Limits und Bedingungen sind nicht geprüft.

### Hosting über `digitaleraluhut/homelab-apps` (Fakten aus dem geklonten Repository)
- Das Repository enthält Pulumi-Projekte, die auf einem eigenen k3s-Cluster („homelab") laufen: Apps wie `opencode`, `opencode-router`, `librechat`, `gitea`. Hosting dort ist kostenlos im Sinne von „eigene Hardware", aber es ist ein selbst betriebener Server. Die Entscheidung „kein Server von lernapps.net" gilt damit nur, wenn dieser Server als der des Owners verstanden wird.
- `opencode-router` startet pro Nutzer isolierte OpenCode-Instanzen bei Bedarf und baut sie bei Leerlauf ab. Anmeldung über OAuth2-Proxy (Erlaubnisliste für Entwickler), Modelle über das lokale `local-ai` des Owners. Das ist eine bestehende Docker-Variante mit Agenten pro Nutzer.
- Offen: Kapazität und Betriebsverantwortung des Homelabs, Datenschutz bei Daten von Lehrkräften, Verfügbarkeit, wer die Modellkosten trägt (lokale Modelle wären kostenlos, aber schwächer).

### Dev-Container mit OpenAI Codex (ChatGPT-Abo)
- Codex CLI ist Open Source (Apache-2.0, [Repository](https://github.com/openai/codex)). Die Anmeldung mit ChatGPT-Konto (Plus, Pro, Team, Edu, Enterprise) rechnet gegen das Abo ab. Ein API-Schlüssel rechnet zu API-Preisen ab. [Authentifizierung](https://developers.openai.com/codex/auth)
- Für Umgebungen ohne Browser nennt die offizielle Dokumentation die Geräte-Code-Anmeldung (`codex login --device-auth`, Status „beta"). Sie muss in den ChatGPT-Sicherheitseinstellungen oder vom Workspace-Admin freigeschaltet sein. Ohne Freischaltung blockiert das den Zugang in Umgebungen ohne Browser ([Issue #9253](https://github.com/openai/codex/issues/9253)).
- Eine offizielle OpenAI-Vorlage für Dev-Container oder Codespaces habe ich nicht gefunden. Die Suche ergab nur Anleitungen Dritter. Codex läuft als Node-/Native-Programm in einem Container wie Claude Code. Das ist nicht geprüft.
- Ob Drittprodukte (wie bolt.diy) die ChatGPT-Anmeldung nutzen dürfen, ist nicht geklärt. Ona bewirbt eine Anbindung eines Codex-Abos ([Preisänderungen](https://pricingsaas.com/companies/gitpod/diffs/2026Q2)).
- Die Nutzungsgrenzen des Plus-Tarifs nennen nur Sekundärquellen. Sie sind unbelegt.

**Was Designentscheidungen braucht**
1. Lizenzfrage WebContainer und Hosting mit COOP/COEP.
2. Ob eine Lehrkraft einen API-Schlüssel beschaffen kann oder ein Abo nutzen muss.
3. Ob der Browser-Weg und der Cloud-Weg beide gebaut werden.
4. Wie die Netzwerkregeln (npm, Modell-API, GitHub) vorkonfiguriert werden.

## Design
*Entrance: Recherche zu Optionen abgeschlossen.*

### Tasks

### Completed
- [x] Richtung, Agenten und Host mit dem Nutzer abgestimmt und in Key Decisions festgehalten
- [x] Einordnung in die bestehende Architektur (docs/arc42): Das Repository `lernapps/tooling` liefert Anleitungen, Skills und die Befehlszeile `@lernapps/tooling` (an einen Commit gepinnt). `app-templates` liefert Archetypen und Scaffold. Renovate reicht Änderungen als Pull Requests weiter (`dec-pinned-by-commit`, `dec-guidance-for-assistants`). Ein Dev-Container passt dort als weiterer Baustein: Er enthält Tooling und Agenten vorinstalliert und kommt über den Scaffold in jedes App-Repository.

### Optionen für den Container-Weg (Entwurf zur Abstimmung)
**A: Dev-Container-Konfiguration im App-Repository (Codespaces als erster Host)**
- Der Scaffold legt `.devcontainer/` an. Ein Klick auf „Open in Codespaces" startet die Umgebung. Agent (Claude Code oder Codex), Tooling und Netzwerkregeln sind vorbereitet.
- Passt zu „Creator zahlt selbst", „kein Server von lernapps.net" und „GitHub ist das Produktionsmittel". Der Standard ist portabel (VS Code lokal, Ona, andere Hosts).
- Nachteile: GitHub-Konto nötig. Kostenlose Stunden sind begrenzt. Anmeldung im Container (Geräte-Code) ist eine Hürde für Lehrkräfte. Firewall mit `NET_ADMIN` in Codespaces ungeprüft.

**B: Wie A, aber mit gemeinsamem, vorgebautem Image von lernapps (öffentlich bei ghcr.io)**
- Die `devcontainer.json` im App-Repository bleibt klein und verweist auf das Image. Das Image enthält Node, Agenten, `@lernapps/tooling` und einen gefüllten npm-Cache. Das löst das npm- und Netzwerkproblem an der Wurzel: Installation ist schon geschehen. Renovate pinnt das Image per Digest.
- Nachteil: ein Image muss gebaut, getestet und gepflegt werden (GitHub Actions in `tooling`). Ein Image mit Agenten wird groß.

**C: Mehrnutzer-Dienst auf Ihrem Homelab (`opencode-router`)**
- Niedrigste Hürde (nur Anmeldung per OAuth, kein GitHub- oder Codespaces-Konto nötig). Passt aber nicht zu „kein Server von lernapps.net" und trägt Betrieb, Kapazität, Datenschutz und Modellkosten beim Owner. Als Pilot für eine kleine Gruppe denkbar.

**Host-Kandidaten für A mit B**
- GitHub Codespaces: kostenlos in Grenzen (120 Kernstunden und 15 GB pro Monat für kostenlose persönliche Konten). Dev-Container-Standard, daher portabel.
- Claude Code im Web (Anthropic, claude.ai/code): Cloud-Sitzungen auf Anthropics Infrastruktur, verbunden mit einem GitHub-Repository. Verfügbar ab Pro (Pro, Max, Team, Enterprise), kein Gratis-Tarif. Nutzung zählt gegen das Claude-Kontingent der Person. Die Umgebung ist konfigurierbar (Netzwerkregeln, Umgebungsvariablen, Setup-Skript). Das ist die Umgebung dieser Sitzung. Sie nutzt kein Dev-Container-Image, sondern eigene Konfiguration. Quellen: [Anthropic-Hilfe](https://support.claude.com/en/articles/11145838-use-claude-code-with-your-pro-or-max-plan) und Drittquellen, Limits nicht belegt.
- Nur Claude, kein Codex. Für ChatGPT-Abo bliebe Codespaces.

**Vorläufige Einschätzung (zur Diskussion, keine Entscheidung):** A mit B als Baustein. C bleibt ein optionaler Pilot.

## Structure
*Entrance: Entwurf ist abgestimmt.*

### Tasks

### Completed
- [x] Schnitte mit dem Nutzer abgestimmt (Schnitt 3 wegen offenem Netz geändert)
- [x] Schnitte entworfen (siehe unten)

### Schnitte (vertikal, jeder für sich nutzbar und testbar)
Reihenfolge nach Risiko: Zuerst die ungeprüften Punkte (Codespaces, Anmeldung), dann Optimierung.

**Schnitt 1: „Ein Klick, der Agent startet" (Gerüst)**
- Liefert: Der Scaffold jedes Archetyps enthält `.devcontainer/devcontainer.json` mit Standard-Node-Image und Funktionen für Claude Code und Codex. „Open in Codespaces" startet die Umgebung. Der Agent meldet sich per Geräte-Code mit dem Abo an. `npm ci` und der Build der Vorlage laufen.
- Berührt: `app-templates` (Scaffold, Archetypen).
- Test: Ende-zu-Ende in einem echten Codespace mit einem Testkonto. Er klärt die ungeprüften Punkte: Start, Anmeldung für Claude und Codex, Build, Netzwerk.

**Schnitt 2: Gemeinsames Image**
- Liefert: Ein öffentliches Image bei ghcr.io mit Node, Claude Code, Codex, `@lernapps/tooling` und gefülltem npm-Cache. Die `devcontainer.json` verweist darauf per Digest. Renovate hält den Digest aktuell.
- Berührt: `tooling` (Image-Bau mit GitHub Actions), `app-templates` (Verweis im Scaffold).
- Test: Kaltstartzeit, Größe, `npm ci` ohne Netz aus dem Cache, Aktualisierung per Renovate-PR.

**Schnitt 3: Offenes Netz, Schutz durch andere Mittel**
- Liefert: Der Container erreicht das gesamte Internet (Recherche). Es gibt keine Firewall mit Erlaubnisliste. Der Schutz vor Missbrauch läuft über andere Wege: Agenten laufen mit Rückfrage, nicht im Modus „alle Rechte" (`--dangerously-skip-permissions` und Entsprechungen bleiben aus). Im Container liegen nur das Anmelde-Token des Agenten und das auf das Repository begrenzte GitHub-Token. Die Regel „Apps laden nichts von Dritten" gilt weiter und wird von `tooling check` an der fertigen App geprüft, nicht am Netz des Containers. Der npm-Cache aus Schnitt 2 bleibt für Geschwindigkeit, nicht für das Sperren.
- Berührt: Image und `devcontainer.json`, Guidance (Hinweis an Lehrkräfte).
- Test: Ein Aufruf beliebiger öffentlicher Seiten aus dem Agenten gelingt. Der Agent fragt vor riskanten Befehlen. Die App besteht die Prüfung (nichts von Dritten).
- Risiko (Fakt): Anthropics Dokumentation warnt, dass bei offenem Netz und abgeschalteten Rückfragen eine bösartige Seite oder ein bösartiges Projekt Zugangsdaten im Container abziehen kann. Offenes Netz erhöht das Risiko durch eingeschleuste Anweisungen auf besuchten Seiten (Prompt Injection). [Anthropic-Dokumentation](https://docs.anthropic.com/en/docs/claude-code/devcontainer)

**Schnitt 4: Anleitung im Container**
- Liefert: Die Anleitungen und Skills für Agenten (Archetypen, Prüfungen) sind im Image vorinstalliert und für Claude Code und Codex lesbar. Die Person beschreibt die App, der Agent baut sie nach den Regeln.
- Berührt: `tooling` (Guidance), `app-templates` (AGENTS.md im Scaffold).
- Test: Ein festes Beispiel-Prompt führt zu einer App, die `tooling check` besteht.

**Schnitt 5: Von der Umgebung zur Veröffentlichung**
- Liefert: Eine Schritt-für-Schritt-Anleitung in einfacher Sprache für Lehrkräfte (Konto, Start, Anmeldung, Beschreiben, Prüfen, Veröffentlichen). Das App-Repository kommt in den Katalog über den bestehenden Weg (Pull Request, Einreichungsformular).
- Berührt: `tooling` (Guidance), `website`/`practice` (Seite), `docs`.
- Test: Eine Lehrkraft ohne Vorwissen kommt in einer Sitzung von der Idee zur gelisteten App. Beobachtung statt Automatisierung.

### Zuordnung zu Repositories
- `app-templates` (dieses Repository): Scaffold mit `.devcontainer/`, `AGENTS.md`.
- `tooling`: Image, GitHub Actions, Guidance, CLI. Dieses Repository gehört nicht zu dieser Sitzung.
- `docs`: Zieltext der Architektur (Baustein, Entscheidung). Er beschreibt den Zielzustand ohne Verlauf.
- Die Arbeit an `tooling` und `docs` braucht eigene Branches und Zugriff.

## Plan
*Entrance: Struktur ist abgestimmt.*

### Tasks

### Completed
- [x] Plan mit dem Nutzer abgestimmt
- [x] Aufgaben, Abhängigkeiten und Risiken je Schnitt festgelegt (siehe unten)

### Widerspruch zur Struktur (dokumentiert)
- In `docs/arc42/09-decisions.arc42.md` (`dec-scaffold`) steht: `lernapps create` aus `@lernapps/tooling` kopiert nur den Scaffold des Archetyps (Inhalt der Beispiel-App) in eine neue App. Das Gerüst des App-Repositories (Paketdatei, Workflows, README) schreibt `tooling`. Ein `.devcontainer/` im Scaffold von `app-templates` würde dazu nicht passen.
- Folge: `.devcontainer/` und `AGENTS.md` gehören zu dem, was `lernapps create` im App-Repository anlegt und `lernapps update` pflegt. Die Arbeit liegt damit überwiegend in `tooling`. In `app-templates` fällt nur wenig an (Hinweise in der Architektur, ggf. Archetyp-Hinweise für den Agenten). Die Designrichtung bleibt unverändert, daher kein `need_design_changes`. Die Zuordnung in „Structure" ist entsprechend zu lesen.
- Zugriff: Für `tooling` und `docs` braucht die Umsetzung eigene Branches. In dieser Sitzung sind nur `app-templates` und `docs` angebunden (`docs` mit Branch). `tooling` müsste mit `add_repo` (push) angebunden werden.

### Plan je Schnitt
**Schnitt 1: Ein Klick, der Agent startet** (Repository `tooling`, Stütze in `app-templates`)
- [ ] Minimale `devcontainer.json` entwerfen: Node-22-Image, Funktionen für Claude Code (`ghcr.io/anthropics/devcontainer-features/claude-code`) und Codex, `postCreateCommand` mit `npm ci`.
- [ ] `lernapps create` schreibt `.devcontainer/` und einen „Open in Codespaces"-Hinweis in die README der neuen App.
- [ ] Manuell in einem Codespace mit Testkonto prüfen: Start, `codex login --device-auth`, Claude-Anmeldung, `npm ci`, Build, Vorschau-Port.
- Abhängigkeiten: keine. Risiken: Geräte-Code-Anmeldung deaktiviert in Schul-Workspaces. Codespaces-Free-Kontingent für Lehrkräfte knapp.

**Schnitt 2: Gemeinsames Image** (`tooling`)
- [ ] Dockerfile für das Image (Node, Agenten, `@lernapps/tooling`, npm-Cache).
- [ ] GitHub Action baut und veröffentlicht öffentlich bei ghcr.io (Mehrarchitektur, Tag und Digest).
- [ ] `devcontainer.json` verweist per Digest. Renovate-Regel für den Digest in App-Repositories.
- [ ] Größe und Kaltstart messen. Ein Codespace-Prebuild nur als Ausweichlösung prüfen.
- Abhängigkeit: Schnitt 1. Risiken: Image zu groß (Startzeit). Pflegeaufwand beim Owner (Updates der Agenten). Der Grundsatz „nichts läuft, was Pflege braucht" (arc42) wird dadurch berührt: Renovate und Actions müssen die Pflege tragen.

**Schnitt 3: Offenes Netz, Agenten ohne Einschränkungen, Schutz in der Pipeline** (`tooling`, Guidance, Pipeline)
- [ ] Agenten starten ohne Rückfragen (Claude Code: Modus ohne Berechtigungsabfragen, Codex: Genehmigung „nie" und freier Zugriff). Der Container-Nutzer ist kein Root. Claude Code verweigert den Modus meines Wissens als Root. Zu prüfen im Test.
- [ ] Der Schutz sitzt in der Pipeline: `lernapps check` und die Prüfung vor dem Listen sehen die fertige App (nichts von Dritten, keine Daten, Barrierefreiheit). Die Workflows verarbeiten den Quelltext fremder Repositories als nicht vertrauenswürdig: keine Geheimnisse für Läufe auf fremdem Code, Rechte der Workflows minimal (`permissions`), Aktionen an Commits gepinnt (bereits `dec-pinned-by-commit`).
- [ ] Im Container liegen nur das Anmelde-Token des Agenten und das auf das Repository begrenzte GitHub-Token. Keine weiteren Geheimnisse im Image.
- [ ] Hinweis in der Anleitung für Lehrkräfte: Der Agent darf im Container alles. Das Konto der Person und ihre Tokens sind das, was dort auf dem Spiel steht.
- [ ] Test: Recherche im Netz klappt. Der Agent führt Befehle ohne Rückfrage aus. Eine App mit einem absichtlich eingebauten Aufruf an Dritte besteht `lernapps check` nicht.
- Abhängigkeit: Schnitt 1. Risiko (Fakt): Ohne Rückfragen und mit offenem Netz kann eine besuchte Seite oder ein Projekt dem Agenten Anweisungen unterschieben und Zugangsdaten im Container abziehen ([Anthropic-Dokumentation](https://docs.anthropic.com/en/docs/claude-code/devcontainer)). Die Pipeline schützt die Plattform und die Apps, nicht die Konten der Person. Betroffen wären ein Claude- oder ChatGPT-Abo und ein Token mit Rechten auf das eine Repository. Der Schaden bleibt auf die Person begrenzt, solange der Container nur ihr gehört (ein Codespace pro Person).

**Schnitt 4: Anleitung im Container** (`tooling`, Guidance; `app-templates` Archetyp-Hinweise)
- [ ] `AGENTS.md` und Skills (Claude und Codex) werden mit `lernapps create` angelegt, verweisen auf die Guidance unter lernapps.net/tooling.
- [ ] Festes Beispiel-Prompt je Archetyp. Skript prüft: Ergebnis besteht `lernapps check`.
- Abhängigkeit: Schnitt 1 und 2. Risiko: Codex und Claude lesen Anleitungen unterschiedlich (AGENTS.md vs. CLAUDE.md).

**Schnitt 5: Von der Umgebung zur Veröffentlichung** (`tooling`, Website, `docs`)
- [ ] Anleitung in einfacher Sprache (ISO 24495) für Lehrkräfte: Konten, Start, Anmeldung, Beschreiben, Prüfen, Veröffentlichen.
- [ ] Zieltext in `docs/arc42`: Baustein „Entwicklungsumgebung", Entscheidung (Dev-Container mit gemeinsamem Image, offenes Netz, Host Codespaces), Risiken. Der Text beschreibt den Zielzustand ohne Verlauf.
- [ ] Beobachtung mit einer Lehrkraft ohne Vorwissen.
- Abhängigkeit: Schnitte 1 bis 4. Risiko: Zu viele Schritte (Konto, Abo, Anmeldung) schrecken Lehrkräfte ab.

### Reihenfolge
1 → (2, 3 parallel) → 4 → 5. Der Test in Schnitt 1 entscheidet, ob die Richtung hält. Scheitert die Anmeldung oder der Start in Codespaces, geht es zurück in „Design" (`need_design_changes`).

## Implement
*Entrance: Plan ist freigegeben.*

### Tasks
- [ ] Schnitt 1, Rest: Test in einem echten Codespace mit Testkonto (Start, Anmeldung Claude und Codex, Build). Nur manuell möglich, vom Nutzer oder einem Testkonto auszuführen.
- [ ] (Nutzer: Weg a) Vorlagen-Repository `lernapps/start` anlegen. Das Repository existiert noch nicht. Der Inhalt ist vorbereitet (README in einfacher Sprache, `.devcontainer/`, `AGENTS.md`, `CLAUDE.md`, `LICENSE`) und lokal im Test mit `lernapps init` geprüft. Ich darf laut Sitzungsregeln kein Repository anlegen: Der Nutzer legt `lernapps/start` an (öffentlich, als Vorlage markiert), dann binde ich es an und lade den Inhalt hoch.
- [x] Erledigt: `lernapps/start` angelegt (Nutzer), Inhalt auf dem Branch `claude/brave-hypatia-6fue7s` gepusht. Auf Freigabe des Nutzers danach direkt auf `main` gepusht (`9b6cc10`). Der erste Versuch wurde vom Berechtigungsprüfer blockiert, der zweite nach der erneuten Freigabe nicht. Das Repository ist als Vorlage markiert (Angabe des Nutzers). Ob „Use this template" und der Start eines Codespace damit funktionieren, ist ungeprüft.
- [ ] Veraltet, ersetzt durch den Punkt davor: Lücke zu klären: Der Einstieg einer Lehrkraft vor `lernapps create`. Ein Codespace braucht schon vorher ein Repository mit `.devcontainer/`. Optionen: (a) GitHub-Vorlagen-Repository „lernapps/start" mit `.devcontainer/` und `AGENTS.md`, (b) `lernapps init` schreibt `.devcontainer/` (setzt ein lokales Terminal voraus). Entscheidung beim Nutzer.
- [ ] `lernapps update` soll `.devcontainer/devcontainer.json` nachziehen.
- [ ] Schnitte 2 bis 5 laut Plan.

### Completed
- [x] Schnitt 1, Code: `lernapps create` schreibt `.devcontainer/devcontainer.json` (Node-22-Image, Claude-Code-Feature, Codex per `postCreateCommand`, `npm ci`). `lernapps init` und `create` lassen einen vorhandenen `.devcontainer/` zu. Test ergänzt. In `tooling` auf dem Branch `claude/brave-hypatia-6fue7s`: `create.test.ts` (19), `cli.test.ts`, `conventions.test.ts` und `guidance.test.ts` (171) laufen grün.
- [x] Geprüft: Das Claude-Code-Feature `ghcr.io/anthropics/devcontainer-features/claude-code` (Tags 1 bis 1.0.5) und das Basis-Image `mcr.microsoft.com/devcontainers/javascript-node:22-bookworm` sind abrufbar.
- [x] Schnitt 2 (Teil): `devcontainer/Dockerfile` in `tooling`: Node 22, Claude Code 2.1.325, Codex 0.169.0, Playwright-Chromium 1.65.0 mit Systembibliotheken (`/ms-playwright`), `@playwright/cli` 0.1.24 mit Skill im Home-Verzeichnis für Claude Code (`~/.claude/skills`) und `.agents` (`~/.agents/skills`), `PLAYWRIGHT_MCP_BROWSER=chromium`. Lokal gebaut (etwa 2 Minuten) und getestet: Versionen, Skills, `playwright-cli open` und `screenshot` gegen eine lokale Seite funktionieren. Größe auf der Platte etwa 5,8 GB (Schichten: Browser und Bibliotheken etwa 1,1 GB, Agenten etwa 1,2 GB).
- [x] Workflow `.github/workflows/devcontainer-image.yml`: baut mit Rauchtest und veröffentlicht nach `ghcr.io/lernapps/devcontainer` bei Änderung auf `main` und wöchentlich. Noch nicht gelaufen. Nach der ersten Veröffentlichung muss das Paket einmal öffentlich geschaltet werden.
- [x] `lernapps init` und `create` akzeptieren README.md, LICENSE und `.devcontainer/` (Starter-Repository). Getestet: Tests grün, `init` im Ordner mit den Starter-Dateien läuft und ersetzt die `AGENTS.md`.
- [x] Pull Request für `tooling`: https://github.com/lernapps/tooling/pull/301 (ein Commit, auf `main` neu aufgesetzt). Die Ende-zu-Ende-Tests laufen in der CI. Nach dem Merge: Paket bei ghcr.io öffentlich schalten.
- [ ] Nach der ersten Veröffentlichung: `devcontainer.json` auf das Image per Digest umstellen und Renovate-Regel anlegen. Bis dahin Standard-Image.
- [ ] Image verkleinern prüfen (5,8 GB auf der Platte). Messung der Pull-Größe und der Startzeit in Codespaces fehlt.
- Nicht geprüft: Start in Codespaces, die Installation von Codex per `npm install --global` als Nutzer ohne Root im Image, die Anmeldung per Geräte-Code.


### Browser, Vorschau und Screenshots im Container (Befunde aus `tooling` und Recherche)
- Vorhanden in `tooling`: Playwright 1.65.0 als Abhängigkeit. `lernapps check` und `lernapps screenshots` starten Chromium über `launch()` (`check/visit.ts`): zuerst Playwrights eigenes, sonst ein installiertes Chromium, sonst wird Playwrights Chromium einmalig geladen. Fehlen Systembibliotheken, scheitert der Start („NoBrowser"). Die Ende-zu-Ende-Tests laufen in Chromium bei Desktop-Breite und bei 360 px.
- `lernapps screenshots` erzeugt je Seite und je Abbildung ein Bild und eine `index.html`. Es unterstützt nur Explainer und Quiz, nicht die interaktive App (`SUPPORTED` in `src/screenshots.ts`).
- Die Anleitung (`guidance/AGENTS.md`, „early-preview") verlangt eine Vorschau mit `npm run dev` im Hintergrund und eine Prüfung durch einen Unter-Agenten im Browser als Lernende. Sie nennt die Adresse „auf dem Rechner der Person". In Codespaces gilt eine andere Adresse.
- `playwright-cli` (`@playwright/cli`, Microsoft): Befehlszeile für Browser-Automatisierung durch Coding-Agenten. Sie spart Kontext gegenüber MCP, bietet Snapshots mit Elementreferenzen, Screenshots und installiert Skills (`playwright-cli install --skills`). Node 20 oder neuer nach der offiziellen Dokumentation. Ob Codex sie unterstützt, ist unbelegt. [Playwright CLI](https://playwright.dev/agent-cli/introduction). In `tooling` kommt sie bisher nicht vor.
- Codespaces: Weitergeleitete Ports sind standardmäßig privat und liegen unter `CODESPACENAME-PORT.app.github.dev`, der Zugriff braucht die GitHub-Anmeldung der Person. Ein Dev-Server, der nur an `localhost` bindet, ist über die Weiterleitung oft nicht erreichbar (`--host` nötig). [GitHub-Dokumentation](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace). Ob die Vorschau im VS-Code-Browser funktioniert, ist ungeprüft.
- Unabhängig vom Container gibt es die Vorschau-Aktion (`lernapps/tooling/actions/app-preview`), die Vorschauen von Pull Requests veröffentlicht.

**Aufgaben (ergänzen die Schnitte, noch nicht umgesetzt)**
- [ ] Schnitt 2: Test, dass `lernapps check` und `lernapps screenshots` im Image ohne Download laufen (Chromium und `playwright-cli` sind bereits im Image, Nutzer entschied: ja, mit Skill).
- Entschieden (Nutzer): `@playwright/cli` und sein Skill kommen ins Image. `lernapps screenshots` für die interaktive App wird nicht erweitert.
- [ ] Schnitt 4 (Anleitung): Abschnitt „Codespaces" in der Vorschau-Anleitung: Dev-Server an alle Schnittstellen binden, Adresse aus `CODESPACE_NAME` und dem Port bilden, Port öffnen, Bilder aus `lernapps screenshots` über den Dateibaum oder die weitergeleitete `index.html` zeigen.
- [ ] Offen: `lernapps screenshots` für die interaktive App erweitern oder die Prüfung dort über `@playwright/cli` führen.
- [ ] Test im echten Codespace: Vorschau öffnen, Screenshot ansehen.

### Erster Test im echten Codespace (Nutzer, mit Bildschirmfotos)
- Die Vorlage `lernapps/start` und der Codespace liefen. Das Paket `ghcr.io/lernapps/devcontainer` war dafür nicht nötig: Die `devcontainer.json` nutzt noch das Standard-Image von Microsoft und das Claude-Code-Feature von Anthropic, beide öffentlich. Das Image-Paket gehört der Organisation (github.com/orgs/lernapps/packages), nicht dem Repository `start`. Der erste Lauf des Image-Workflows war erfolgreich. Anonymes Abrufen des Pakets scheitert noch (vermutlich noch privat).
- Anmeldung bei Claude: Der Rückruf auf `localhost:<Port>/callback` erreicht den Container nicht („ERR_CONNECTION_REFUSED"). Nach erneutem Öffnen des Links zeigte claude.ai einen Code, der im Terminal eingefügt werden konnte. Das deckt sich mit bekannten Meldungen zu Codespaces und SSH (Anthropic nennt das Einfügen des Codes als Ausweg). Es gibt auch Berichte über „Invalid code" in Codespaces, noch offen.
- Irritierende Rückfragen des Editors: „Vertrauen Sie den Autoren der Dateien in diesem Ordner?" und „Möchten Sie, dass Code die externe Website öffnet?". Gegenmaßnahme: Einstellungen `security.workspace.trust.enabled=false` und `http.linkProtectionTrustedDomains` in `customizations.vscode.settings` (tooling und start). Ob ein Codespace sie aus der `devcontainer.json` übernimmt, ist ungeprüft. Die README der Vorlage beschreibt die Schritte.
- AGENTS.md: `lernapps init` und `lernapps create` schreiben beide die `AGENTS.md` aus `guidance/AGENTS.md` (immer neu) und `CLAUDE.md` mit `@AGENTS.md` (nur wenn sie fehlt). Die `AGENTS.md` der Vorlage ist eine kurze Starthilfe, die `init` ersetzt. Ob die Vorlage dieselbe Datei tragen soll, ist mit dem Nutzer zu klären.

### Entscheidungen und Änderungen nach dem ersten Codespace-Test
- Entschieden (Nutzer): Variante B für die `AGENTS.md`. `guidance/AGENTS.md` in `tooling` hat einen Block „Before `lernapps init`" (fragen, `init` einmal im Ordner ausführen, nie in einem Unterordner). Die Vorlage `start` trägt dieselbe Datei. Der Abgleich geschieht bisher von Hand (offen: Automatisierung).
- Das Image `ghcr.io/lernapps/devcontainer` ist öffentlich (anonymer Abruf der Tags klappt). Die `devcontainer.json` nutzt es mit Digest (`sha256:9ef5095b…`) und installiert die Agenten nicht mehr selbst. Renovate soll den Digest nachziehen (ungeprüft: die Regel für `devcontainer.json` in den Apps).
- Einstellungen für eine ruhigere Oberfläche (ungeprüft, ob ein Codespace sie aus der Datei übernimmt): README öffnet sich beim Start (`customizations.codespaces.openFiles`), `chat.disableAIFeatures` (blendet die KI-Funktionen des Editors aus, es gibt einen Bericht, dass das in VS Code 1.105 den Chat nicht verbarg), `terminal.integrated.hideOnStartup=always`, `claudeCode.preferredLocation=sidebar`, Vertrauens- und Link-Rückfragen aus. Die Claude-Code-Erweiterung (`anthropic.claude-code`) war schon installiert. Sie zeigt einen grafischen Chat statt des Terminals, bringt ihre eigene Befehlszeile mit und ist über das Funken-Symbol erreichbar. Das Symbol in der Editor-Werkzeugleiste erscheint nur bei geöffneter Datei, das in der Seitenleiste immer. Eine Erweiterung für Codex habe ich nicht eingetragen: Ihre Kennung ist nicht belegt.
- Die Berechtigungsstufe der Claude-Code-Erweiterung (`claudeCode.initialPermissionMode`) liest VS Code nur aus den Benutzereinstellungen und ignoriert Werte der Arbeitsumgebung. „Agenten ohne Einschränkungen" (Schnitt 3) lässt sich also nicht über die `devcontainer.json` voreinstellen. Die Erweiterung bietet den Modus nur mit `allowDangerouslySkipPermissions` an und rät, ihn nur in Umgebungen ohne Internetzugang zu nutzen.
- Codespace pausieren: Er hält nach 30 Minuten ohne Eingabe an (einstellbar, eine Organisationsrichtlinie kann es begrenzen). Dateien bleiben erhalten, auch nicht gespeicherte Änderungen. Angehaltene Codespaces kosten nur Speicher. Nach 30 Tagen ohne Nutzung wird er gelöscht (einstellbar von 0 bis 30 Tage). [GitHub-Dokumentation](https://docs.github.com/en/codespaces/about-codespaces/understanding-the-codespace-lifecycle). Das steht in der README der Vorlage.

### Startzeit des Codespace (Messungen am veröffentlichten Image und am lokalen Bau)
- Das Image ist komprimiert 1,77 GB groß (amd64). Größte Schichten: Agenten 694 MB (Claude Code 349 MB und Codex 404 MB entpackt, je eine native Datei), Playwright-Chromium mit Systembibliotheken 451 MB (Chromium 413 MB, Headless-Shell 283 MB), Basis-Image etwa 600 MB. Entpackt etwa 5,8 GB. Jeder neue Codespace holt das Image neu auf eine frische Maschine.
- Die Claude-Code-Erweiterung bringt ihre eigene Befehlszeile mit (350 MB), die im Image ein zweites Mal liegt. Für Codex gilt vermutlich dasselbe (unbelegt).
- Versuch lokal: Mit der Headless-Shell allein läuft Playwright als Bibliothek (`lernapps check`), aber `playwright-cli` verlangt das volle Chromium. Das volle Chromium muss im Image bleiben.
- Nicht gemessen: Zeit je Schritt im Codespace (Maschine anlegen, Image holen, Erweiterungen installieren, `postCreateCommand`). Das Erstellungsprotokoll des Codespace zeigt sie (Befehlspalette: „Codespaces: View Creation Log").
- Prebuilds (vorgebaute Codespaces) sind eine Einstellung je Repository, brauchen GitHub-Actions-Zeit und Speicher. Ich nehme an, dass Repositories, die aus der Vorlage entstehen, sie nicht erben (ungeprüft). Für Lehrkräfte daher kein Weg.

### Anleitung mit Bildern, Befehlszeilen aus dem Image, Zwischenstand
- Messung aus dem Erstellungsprotokoll eines Codespace (Nutzer): Container anlegen 105 s von 110 s insgesamt, der Rest etwa 4 s. Das Image holen ist fast die ganze Zeit. Fehlermeldung „Could not parse image name" bei der Angabe `name:tag@sha256:…` (nicht kritisch, Codespaces versteht Tag und Digest zusammen nicht).
- Entschieden (Nutzer): Die Befehlszeilen von Claude Code und Codex kommen aus dem Image. Wer sie will, installiert sie nachträglich. Beide Erweiterungen brauchen Umwege bei der Anmeldung (Claude: Adresse kopieren und im eigenen Browser öffnen; Codex: Anmeldung per Gerätecode, die in ChatGPT erlaubt sein muss). `tooling`: Dockerfile, Test, Workflow angepasst.
- Entschieden (Nutzer): Die Bilder kommen in eine Seite „Mit Codespaces bauen" in der Apps-Dokumentation (`lernapps/apps`, neben `/build/` und `/practice/`). Umgesetzt in `lernapps/apps` auf dem Branch `claude/brave-hypatia-6fue7s`: Seite `/build/codespaces/` auf Deutsch und Englisch, acht Bilder als WebP in `src/assets/codespaces/`, Hinweis-Kasten auf `/build/`, Link zur Vorlage in `site.tooling.start`. Seitenprüfung (`npm run check`) und alle Tests (114 bestanden, 1 übersprungen) laufen grün. Layout bei 1280 und 360 px geprüft (kein seitliches Überlaufen).
- Die README der Vorlage trägt keine Bilder, sondern verlinkt die Seite (damit die Bilder nicht in jedem App-Repository liegen). Sie liegt auf dem Branch von `start`, aber noch nicht auf `main`: Der Link auf `lernapps.net/apps/build/codespaces/` geht erst nach der Veröffentlichung der Seite.
- Offen: Pull Requests für `tooling` (7 Commits plus 1, vor dem Merge zusammenführen) und `apps`. Danach: README von `start` auf `main`, neues Image abwarten, Digest umstellen. Der Test im Codespace für `extensions.supportUntrustedWorkspaces` und das Verhalten der README-Vorschau steht aus.

### Ergebnis (Stand 2026-11-16)
- Gemergt: `lernapps/tooling` #301 (Dev-Container, Image-Dockerfile, Workflow, Starter-Dateien), #303 (schlankes Image, Erweiterungen, ruhigere Oberfläche, Renovate, Block vor `lernapps init`) und #304 (Digest des neuen Images). `lernapps/apps` #312 (Seite „Mit Codespaces bauen", `/build/codespaces/`, live). `lernapps/start` #2 (README mit Verweis auf die Seite) und #3 (Digest). Vorlage `lernapps/start` ist als Vorlage markiert und öffentlich.
- Das neue Image `ghcr.io/lernapps/devcontainer` (Digest `sha256:4e33870f…`) ist komprimiert 1,09 GB groß (vorher 1,77 GB) und enthält Node, Playwright-Chromium und `playwright-cli` mit Skills, keine Befehlszeilen von Claude Code und Codex.
- Ungeprüft und zu testen in einem neuen Codespace aus der Vorlage: Erstellungszeit mit dem neuen Image, ob die README wieder als Vorschau erscheint, ob die Erweiterungen für Claude und Codex vor dem Vertrauen des Ordners erscheinen (`extensions.supportUntrustedWorkspaces`), ob das Copilot-Fenster und das Terminal ausgeblendet sind (`chat.disableAIFeatures`, `terminal.integrated.hideOnStartup`), und die Anmeldung per Gerätecode mit Codex.
- Offen: Abgleich der `AGENTS.md` von `start` mit `guidance/AGENTS.md` in `tooling` (bisher von Hand). Ob Renovate den Digest ohne Tag in den `devcontainer.json` führt. Zieltext in `docs/arc42` (Baustein und Entscheidung zur Entwicklungsumgebung) und Beobachtung mit einer Lehrkraft (Schnitt 5). Agenten ohne Einschränkungen (Schnitt 3): Die Berechtigungsstufe der Claude-Erweiterung lässt sich nicht aus der `devcontainer.json` voreinstellen.

## Commit
*Entrance: Umsetzung ist verifiziert.*

### Tasks
- [ ] *To be added when this phase becomes active*

### Completed
*None yet*



---
*This plan is maintained by the LLM. Tool responses provide guidance on which section to focus on and what tasks to work on.*
