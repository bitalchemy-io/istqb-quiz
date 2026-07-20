# Kapitel 1 – Generative KI Grundlagen

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

---

## Prüfungsrelevante Schwachstelle

| Thema | Kernaussage |
|-------|------------|
| Reasoning LLM | Für mehrstufige, komplexe Aufgaben (Testplanung, Schätzung) |
