# ISTQB CT-GenAI – Zusammenfassung aller Kapitel

---

## Kapitel 1 – Einführung in generative KI für den Softwaretest

### 1.1.1 KI-Spektrum

- **Symbolische KI** – regelbasiert; Wissen über Symbole + logische Regeln; ahmt menschliche Entscheidungen nach
- **Klassisches ML** – datengetrieben; manuelle Feature-Auswahl + Modelltraining (z. B. Fehlerkategorisierung)
- **Deep Learning** – neuronale Netze; lernt Features automatisch aus komplexen Daten (Bilder, Audio, Text)
- **Generative KI** – nutzt Deep Learning; erzeugt neue Inhalte (Text, Code, Bilder) aus Trainingsmustern

### 1.1.2 Grundlagen LLM

- **LLM (Large Language Model)** – auf riesigen Textkorpora vortrainiert; bestimmt Kontext, generiert Antworten
- **Tokenisierung** – Zerlegung von Text in kleinste Verarbeitungseinheiten (Tokens)
- **Kontextfenster** – max. Informationsmenge pro Anfrage, gemessen in Tokens; kein dauerhafter Speicher
- **Embedding** – numerische Vektordarstellung von Bedeutung/Kontext; semantisch ähnliche Tokens liegen räumlich nah
- **Transformer** – Architektur hinter modernen LLMs
- **GPT** – Generativer vortrainierter Transformer; generiert Text sequenziell

> ⚠️ **Merke:** Tokenisierung ≠ Embedding ≠ Textgenerierung → drei verschiedene Konzepte!

### 1.1.3 LLM-Typen

| Typ | Beschreibung | Einsatz |
|-----|-------------|---------|
| **Foundation LLM** | Breit vortrainiert, flexibel, braucht weitere Anpassung | Allgemeine Aufgaben |
| **Instruction-Tuned LLM** | Feinabgestimmt auf Anweisungsbefolgung | Reale Testanwendungen |
| **Reasoning LLM** | Trainiert auf logisches Schließen, Chain-of-Thought | Mehrstufige Testplanung, Aufwandsschätzung |

### 1.1.4 Multimodale Modelle

- **Multimodales Modell** – verarbeitet mehrere Datentypen gleichzeitig: Text, Bild, Audio
- **Vision-Language-Modell** – Untertyp; kombiniert speziell Bild + Text

### 1.2 Nutzung im Softwaretest

- **KI-Chatbot** – direkte, sofortige Interaktion auf Anfrage
- **LLM-gestütztes Testtool** – in Testinfrastruktur integriert, automatisiert Testaufgaben

**LLM-Funktionen im Test:**

| Funktion | Beschreibung |
|----------|-------------|
| Anforderungsanalyse | Mehrdeutigkeiten + Inkonsistenzen identifizieren, Klärungsfragen generieren |
| Testorakel-Generierung | Erwartete Ergebnisse aus Anforderungen ableiten |
| Testdatengenerierung | Eingabewerte, Grenzwerte, Kombinationen erstellen |
| Testfallerstellung | Testfälle aus User Stories generieren |
| Fehlerberichterstattung | Fehlermuster analysieren, Dokumentation erstellen |

> ⚠️ **Merke:** Testorakel = erwartete Ergebnisse | Testdaten = Eingabewerte

---

## Kapitel 2 – Prompt-Engineering für effektives Softwaretesten

### 2.1.1 Prompt-Struktur (6 Komponenten)

| Komponente | Beschreibung | Beispiel |
|------------|-------------|---------|
| **Rolle** | Persona/Perspektive des LLM | „Agiere als Testautomatisierungs-Ingenieur" |
| **Kontext** | Hintergrundinformationen zum Testobjekt | Beschreibung der Banking-App |
| **Anweisungen** | Konkrete Aufgabenbeschreibung | „Generiere Testfälle für das Login-Modul" |
| **Eingabedaten** | Spezifische Datenquellen | Testberichte, Logs, Benchmarks |
| **Einschränkungen** | Regeln/Bedingungen | „Kosmetische Fehler ausschließen" |
| **Ausgabeformat** | Wie das Ergebnis präsentiert wird | Markdown-Tabelle mit Spalten ID, Fehlerzustand... |

### 2.1.2 Prompting-Techniken

| Technik | Beschreibung | Einsatz |
|---------|-------------|---------|
| **Zero-Shot** | Keine Beispiele, direkte Aufgabe | Einfache, klare Aufgaben |
| **One-Shot** | Ein Beispiel zur Orientierung | Einfache Formatvorgaben |
| **Few-Shot** | Mehrere Beispiele zur Anleitung | Wiederholbare Formate (z. B. Gherkin) |
| **Prompt Chaining** | Ausgabe eines Prompts wird Eingabe des nächsten | Mehrstufige Testplanung |
| **Meta-Prompting** | LLM generiert/verfeinert eigene Prompts | Flexible, dynamische Aufgaben |

### 2.1.3 System-Prompt vs. Benutzer-Prompt

| | System-Prompt | Benutzer-Prompt |
|--|--------------|----------------|
| **Sichtbarkeit** | Versteckt | Sichtbar |
| **Anpassung** | Statisch | Dynamisch |
| **Funktion** | Rahmen für gesamte Konversation | Spezifische Aufgabe pro Interaktion |

### 2.2 Anwendung im Softwaretest

- **Testanalyse** – Testbedingungen generieren, risikobasiert priorisieren, Abdeckungslücken identifizieren
- **Testentwurf** – Testfälle, Testskripte, Akzeptanzkriterien generieren
- **Testdaten** – synthetische Daten, Grenzwerte, Kombinationen erstellen
- **Regressionstests** – Testergebnisse analysieren mit drei Pflichtschritten:
  1. Soll- und Ist-Ergebnisse trennen
  2. Probleme gruppieren und priorisieren
  3. Diskrepanzen hervorheben

### 2.3 Bewertung & Verfeinerung

**Evaluationsmetriken:**
- Relevanz der Ausgabe in Bezug auf die Aufgabe
- Vollständigkeit in Bezug auf die Testbasis

**Iterative Prompt-Verfeinerung:**
- Prompts schrittweise optimieren auf Basis der Ausgabequalität

---

## Kapitel 3 – Management von Risiken bei generativer KI

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

## Kapitel 4 – LLM-gestützte Testinfrastruktur

### 4.1.1 Architekturkomponenten

| Komponente | Funktion |
|------------|---------|
| **Frontend** | Benutzeroberfläche; Eingabe/Ausgabe für Tester |
| **Backend** | Orchestrator: Authentifizierung, Datenabruf, Prompt-Vorbereitung, LLM-Interaktion |
| **Authentifizierung** | Sicherer Zugriff auf das System |
| **Post-Processing** | Verfeinert LLM-Ausgabe vor Weitergabe ans Frontend |
| **Relationale DB** | Strukturierte Daten, tabellenbasiert (z. B. historische Testfälle) |
| **Vektordatenbank** | Embeddings; semantischer Ähnlichkeitsabruf (z. B. API-Specs, Anforderungen) |

### 4.1.2 RAG (Retrieval-Augmented Generation)

**Zweistufiger Prozess zur Laufzeit:**

1. **Retrieval** – semantisch ähnliche Chunks aus Vektordatenbank abrufen
2. **Generierung** – abgerufene Chunks + Prompt → LLM kombiniert eigenes Wissen mit abgerufenen Daten

**Drei RAG-Kernmerkmale:**
- **Automatisch** – kein manuelles Prüfen zwischen Retrieval und Generierung
- **Spezifisch** – gezielte Abfragen, nicht alles auf einmal
- **Aktuell** – Echtzeit-Zugriff auf externe Daten, kein veraltetes Trainingswissen

**RAG vs. Fine-Tuning:**

| | RAG | Fine-Tuning |
|--|-----|------------|
| **Zeitpunkt** | Laufzeit | Training (einmalig) |
| **Ideal für** | Sich ändernde Specs/Anforderungen | Festes Vokabular/Format |
| **Nachtraining** | Nein | Ja |

### 4.1.3 LLM-gestützte Agenten

- **LLM-Agent** – halbautonome/autonome Aufgabenverarbeitung; handelt statt nur zu antworten
- **Semiautonomer Agent** – menschliche Aufsicht bei kritischen Schritten → Qualitätssicherung
- **Autonomer Agent** – minimaler menschlicher Eingriff → maximale Effizienz
- **Multi-Agenten-Architektur** – mehrere spezialisierte Agenten kommunizieren koordiniert (Orchestrierung)

> ⚠️ **Merke:** LLM-Agenten leiden unter denselben Problemen wie LLMs (Halluzinationen, Denkfehler) → bei kritischen Aufgaben immer semiautonomer Agent!

### 4.2.1 Fine-Tuning

- Vortrainiertes Modell wird auf domänenspezifischen Datensatz **weitertrainiert**
- **Ergänzt** allgemeines Wissen → ersetzt es **nicht**
- Auch auf SLMs anwendbar (ressourceneffizienter)
- Herausforderung: Overfitting (zu stark auf Trainingsdaten spezialisiert → versagt bei neuen Daten)

### 4.2.2 LLMOps

- Analog zu DevOps/MLOps, aber spezifisch für LLMs
- Umfasst: Deployment, Monitoring, Versionierung, Performance-Überwachung
- Berücksichtigt: Datenschutz, Sicherheit, Kosten

---

## Kapitel 5 – Einsatz und Integration von GenAI in Testorganisationen

### 5.1.1 Schatten-KI (Shadow AI)

Nutzung von GenAI-Tools **ohne formelle Genehmigung** der Organisation → drei Risiken:

| Risiko | Beschreibung |
|--------|-------------|
| **Informationssicherheit & Datenschutz** | Ungesicherte Tools → Datenpannen, unbefugter Zugriff |
| **Compliance & regulatorische Probleme** | Nicht zugelassene Tools → Nichteinhaltung von Standards → rechtliche Konsequenzen |
| **Vages geistiges Eigentum** | Unklare Lizenzvereinbarungen → IP-Streitigkeiten |

> ⚠️ **Merke:** Schatten-KI **unterläuft** Unternehmensrichtlinien – sie setzt sie nicht durch!

### 5.1.2 Schlüsselaspekte einer GenAI-Strategie

- **Messbare Testziele** – Testproduktivität, Testzyklusverkürzung, Qualitätsverbesserung
- **LLM-Auswahl** – kompatibel mit bestehender Testinfrastruktur + Skalierbarkeitsanforderungen
- **Datenqualität** – hochwertige, relevante Eingabedaten (Qualität > Quantität!)
- **Schulungsprogramme** – technische + ethische Fähigkeiten (keine LLM-Zertifikate!)
- **Metriken** – aufgabenspezifische Metriken (keine Standard-ML-Metriken!)
- **Prozessrichtlinien** – Regeln für sensible Daten, Transparenzpflichten, Quality Gates

### 5.1.3 LLM-Auswahlkriterien

- Ausrichtung auf Testziele
- Kompatibilität mit bestehender Testinfrastruktur
- Skalierbarkeitsanforderungen
- **Wiederkehrende Kosten** (laufend: Token, Rechenressourcen) – explizites Syllabus-Kriterium
- Datenschutz- und Sicherheitsanforderungen

> ⚠️ **Merke:** Wiederkehrende Kosten (laufend) ≠ Einmalige Kosten (Proof of Concept)

### 5.2.1 Schlüsselkompetenzen für Tester

- Prompt Engineering Techniken beherrschen
- LLM-Ausgaben bewerten + verifizieren
- Domänen- + Testexpertise mit KI-Fähigkeiten kombinieren
- Datenschutz: Datenbereinigung + datenschutzfreundliches Prompt Engineering
- Energiebewusstsein: Modellgröße + Nutzungsmuster optimieren

### 5.2.2 Fähigkeitsaufbau im Team

- **Prompt-Musterbibliotheken** – wiederverwendbare Vorlagen für konsistente Ausgaben
- **Communities of Practice** – regelmäßiger Wissensaustausch, Best Practices, Herausforderungen diskutieren
- Strukturierte Lernpfade + Peer-Learning

### 5.2.3 Rollenwandel

| Rolle | Vorher | Nachher |
|-------|--------|---------|
| **Tester** | Testdesign-Spezialist | KI-gestützter Testspezialist: LLM-Ausgaben verifizieren, Prompts verfeinern, Prompt-Bibliotheken pflegen |
| **Testmanager** | Traditionelle Führung | Hybrides Teammanagement: KI-Strategie, KI-Risikomanagement, Koordination Mensch + GenAI-Agent |

> ⚠️ **Merke:** Tester werden **nicht ersetzt** → sie werden zu KI-gestützten Testspezialisten mit erweiterter Verantwortung!

---

## Prüfungsrelevante Schwachstellen – Übersicht

| Thema | Kernaussage |
|-------|------------|
| Reasoning LLM | Für mehrstufige, komplexe Aufgaben (Testplanung, Schätzung) |
| Testorakel vs. Testdaten | Orakel = erwartete Ergebnisse \| Testdaten = Eingabewerte |
| System-Prompt | Statisch + versteckt \| Benutzer-Prompt = dynamisch + sichtbar |
| Regressionstestanalyse | Soll/Ist trennen + gruppieren + Diskrepanzen hervorheben |
| Data Poisoning | Trainingsdaten (dauerhaft) \| Manipulation = Laufzeit (temporär) |
| Training vs. Inferenz | Training ändert Modell \| Inferenz ändert Modell nicht |
| Fine-Tuning | Ergänzt allgemeines Wissen, ersetzt es nicht |
| RAG | Automatisch + spezifisch + aktuell |
| LLM-Agent kritisch | Semiautonomer Agent mit menschlicher Aufsicht |
| Wiederkehrende Kosten | Laufend (Token, Rechenressourcen) ≠ Proof of Concept (einmalig) |
| Schatten-KI | Unterläuft Richtlinien, setzt sie nicht durch |
