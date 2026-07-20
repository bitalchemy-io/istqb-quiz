# Kapitel 3 – Risikomanagement bei generativer KI

### 3.1.1 Halluzinationen, Denkfehler und Verzerrungen

| Begriff | Beschreibung | Beispiel |
|---------|-------------|---------|
| **Halluzination** | Sachlich falsche, erfundene Ausgabe die plausibel klingt | Nicht existierende API-Endpunkte |
| **Denkfehler** | Fehlerhafte logische Schlussfolgerung | Falsche Testaufwandsschätzung |
| **Verzerrung (Bias)** | Systematischer Fehler durch unausgewogene Trainingsdaten | Unterrepräsentierte nicht-funktionale Tests |

### 3.1.3 Mitigationstechniken

- Strukturierte, präzise Prompts mit relevantem Kontext
- Menschliche Überprüfung der LLM-Ausgaben
- Temperatur-Parameter senken (→ reduziert nicht-deterministisches Verhalten)

### 3.1.4 Nicht-deterministisches Verhalten

- LLMs sind **nicht-deterministisch** → identischer Prompt kann variierende Ausgaben liefern
- Halluzinationen können in einer Session behoben scheinen, in der nächsten wiederkehren
- Ursache: Training ≠ Inferenz → LLM lernt nicht aus Korrekturen in einzelnen Sessions

> ⚠️ **Merke:** Training = Modellgewichtungen aktualisieren (einmalig/periodisch) | Inferenz = Ausgabe generieren (jede Konversation, ändert Modell nicht)

### 3.2 Datenschutz- und Sicherheitsrisiken

**Vier Angriffsvektoren:**

| Angriffsvektor | Beschreibung |
|---------------|-------------|
| **Datenexfiltration** | Prompts provozieren Preisgabe vertraulicher Trainingsdaten |
| **Manipulation von Anfragen** | Bösartige Laufzeit-Eingaben stören LLM-Ausgabe temporär |
| **Data Poisoning** | Trainingsdaten dauerhaft manipuliert → verfälschte Modellergebnisse |
| **Generierung von bösartigem Code** | LLM wird manipuliert, Backdoors/externe Befehlsaufrufe zu generieren |

> ⚠️ **Merke:** Data Poisoning = Trainingsdaten (dauerhaft) | Manipulation von Anfragen = Laufzeit (temporär)

**Mitigationsstrategien:**
- Sichere Datenverarbeitungspraktiken
- Robuste Zugriffskontrollen
- Einbindung von CISO/CTO/Rechtsberatern

### 3.3 Energieverbrauch

- Bildgenerierung >> Textgenerierung (deutlich mehr Energie)
- Aufgabenkomplexität + Modellgröße beeinflussen Energieverbrauch direkt
- Kumulative Wirkung über Millionen Nutzer → signifikante CO₂-Emissionen

### 3.4 KI-Vorschriften und Standards

- **DSGVO** – Datenschutz-Grundverordnung; schränkt Erhebung/Verarbeitung/Speicherung von Daten ein
- **EU AI Act** – reguliert KI-Systeme nach Risikoklassen
- **ISO/IEC 42001** – KI-Managementsystem
- **NIST AI RMF** – US-amerikanisches KI-Risikomanagement-Framework

---

## Prüfungsrelevante Schwachstellen

| Thema | Kernaussage |
|-------|------------|
| Data Poisoning | Trainingsdaten (dauerhaft) \| Manipulation = Laufzeit (temporär) |
| Training vs. Inferenz | Training ändert Modell \| Inferenz ändert Modell nicht |
