# Kapitel 2 – Prompt Engineering

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

## Prüfungsrelevante Schwachstellen

| Thema | Kernaussage |
|-------|------------|
| Testorakel vs. Testdaten | Orakel = erwartete Ergebnisse \| Testdaten = Eingabewerte |
| System-Prompt | Statisch + versteckt \| Benutzer-Prompt = dynamisch + sichtbar |
| Regressionstestanalyse | Soll/Ist trennen + gruppieren + Diskrepanzen hervorheben |
