# Kapitel 4 – LLM-gestützte Testinfrastruktur

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

## Prüfungsrelevante Schwachstellen

| Thema | Kernaussage |
|-------|------------|
| Fine-Tuning | Ergänzt allgemeines Wissen, ersetzt es nicht |
| RAG | Automatisch + spezifisch + aktuell |
| LLM-Agent kritisch | Semiautonomer Agent mit menschlicher Aufsicht |
