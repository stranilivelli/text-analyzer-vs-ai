"""
Flask App con Frontend Integrato
Backend API + Pagine HTML servite da Flask
Integrazione NLTK + Gemini AI
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sys
import os
from dotenv import load_dotenv

# Importa NLTK
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize

# Importa Gemini
import google.generativeai as genai

# Carica variabili d'ambiente
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configura Gemini
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Scarica risorse NLTK (solo la prima volta)
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
except:
    pass

# ========== FUNZIONI ANALISI ==========

def analyze_text(text, filter_short_words=True, min_word_length=4):
    """
    Analizza il testo e restituisce metriche
    
    Args:
        text (str): Il testo da analizzare
        filter_short_words (bool): Se filtrare parole brevi nelle frequenze
        min_word_length (int): Lunghezza minima parole da considerare
    """
    
    if not text or text.strip() == "":
        return {"error": "Testo vuoto"}
    
    # Tokenizzazione
    sentences = sent_tokenize(text, language='italian')
    words = word_tokenize(text, language='italian')
    words_clean = [w.lower() for w in words if w.isalpha()]
    
    # Statistiche base
    total_words = len(words_clean)
    total_sentences = len(sentences)
    total_chars = len(text)
    
    if total_words == 0 or total_sentences == 0:
        return {"error": "Testo non valido"}
    
    avg_word_length = sum(len(w) for w in words_clean) / total_words
    avg_sentence_length = total_words / total_sentences
    
    # Gulpease
    lettere = sum(len(w) for w in words_clean)
    gulpease = 89 + (300 * total_sentences - 10 * lettere) / total_words
    
    # Type-Token Ratio
    unique_words = len(set(words_clean))
    ttr = unique_words / total_words
    
    # Classificazione lunghezza frasi
    sentence_lengths = [len(word_tokenize(s, language='italian')) for s in sentences]
    short = sum(1 for l in sentence_lengths if l < 10)
    medium = sum(1 for l in sentence_lengths if 10 <= l <= 20)
    long_sent = sum(1 for l in sentence_lengths if l > 20)
    
    # Punteggio complessità
    complexity = 100 - gulpease
    if ttr > 0.7:
        complexity += 10
    if avg_sentence_length > 25:
        complexity += 15
    elif avg_sentence_length > 20:
        complexity += 10
    
    complexity = min(100, max(0, complexity))
    
    if complexity < 30:
        category = "Molto Semplice"
        color = "#22c55e"
    elif complexity < 50:
        category = "Semplice"
        color = "#84cc16"
    elif complexity < 70:
        category = "Medio"
        color = "#eab308"
    elif complexity < 85:
        category = "Complesso"
        color = "#f97316"
    else:
        category = "Molto Complesso"
        color = "#ef4444"
    
    # Parole più frequenti - CON FILTRO
    from collections import Counter
    
    if filter_short_words:
        # Filtra parole brevi per avere parole più significative
        words_filtered = [w for w in words_clean if len(w) >= min_word_length]
        word_freq = Counter(words_filtered)
    else:
        # Usa tutte le parole
        word_freq = Counter(words_clean)
    
    most_common = word_freq.most_common(10)
    
    return {
        "success": True,
        "statistics": {
            "total_words": total_words,
            "total_sentences": total_sentences,
            "total_chars": total_chars,
            "avg_word_length": round(avg_word_length, 2),
            "avg_sentence_length": round(avg_sentence_length, 2),
            "unique_words": unique_words
        },
        "gulpease": round(gulpease, 2),
        "ttr": round(ttr, 3),
        "sentence_complexity": {
            "short": short,
            "medium": medium,
            "long": long_sent
        },
        "complexity_score": {
            "score": round(complexity, 2),
            "category": category,
            "color": color
        },
        "most_common_words": most_common[:5],
        "filter_applied": {
            "enabled": filter_short_words,
            "min_length": min_word_length if filter_short_words else None
        }
    }


def analyze_with_gemini(text):
    """
    Analizza il testo usando Gemini AI
    Replica le metriche NLTK + aggiunge analisi semantica
    """
    
    if not GEMINI_API_KEY:
        return {"error": "API Key Gemini non configurata"}
    
    if not text or text.strip() == "":
        return {"error": "Testo vuoto"}
    
    try:
        # Configura il modello
        model = genai.GenerativeModel('gemini-flash-latest')
        
        # Prompt strutturato per ottenere analisi completa
        prompt = f"""Analizza questo testo italiano e fornisci una risposta JSON strutturata.

TESTO DA ANALIZZARE:
{text}

Fornisci l'analisi nel seguente formato JSON (SOLO JSON, nessun testo aggiuntivo):
{{
  "statistics": {{
    "total_words": <numero>,
    "total_sentences": <numero>,
    "avg_sentence_length": <numero decimale>,
    "unique_words": <numero>
  }},
  "gulpease": <numero tra 0-100>,
  "ttr": <numero decimale tra 0-1>,
  "complexity_score": {{
    "score": <numero tra 0-100>,
    "category": "<Molto Semplice|Semplice|Medio|Complesso|Molto Complesso>"
  }},
  "semantic_analysis": {{
    "conceptual_difficulty": "<Bassa|Media|Alta>",
    "school_level": "<Elementare|Media|Superiore|Università>",
    "register": "<Informale|Formale|Tecnico|Divulgativo>",
    "technical_terms": [<lista di termini tecnici trovati>],
    "reasoning_complexity": "<descrizione breve>"
  }},
  "suggestions": [
    "<suggerimento 1>",
    "<suggerimento 2>",
    "<suggerimento 3>"
  ],
  "critical_points": [
    "<punto critico 1>",
    "<punto critico 2>"
  ]
}}

ISTRUZIONI:
- Gulpease: usa la formula italiana (89 + (300 * frasi - 10 * lettere) / parole)
- TTR: rapporto parole unique/totali
- Complessità: considera sia sintassi che semantica
- Sii preciso nei calcoli statistici
- Identifica termini tecnici specifici del testo
- Fornisci suggerimenti pratici e concreti
"""
        
        # Genera risposta
        response = model.generate_content(prompt)
        
        # Estrai JSON dalla risposta
        response_text = response.text.strip()
        
        # Rimuovi eventuali markdown
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        response_text = response_text.strip()
        
        # Parse JSON
        import json
        result = json.loads(response_text)
        
        # Aggiungi colore basato su complessità
        score = result['complexity_score']['score']
        if score < 30:
            result['complexity_score']['color'] = "#22c55e"
        elif score < 50:
            result['complexity_score']['color'] = "#84cc16"
        elif score < 70:
            result['complexity_score']['color'] = "#eab308"
        elif score < 85:
            result['complexity_score']['color'] = "#f97316"
        else:
            result['complexity_score']['color'] = "#ef4444"
        
        result['success'] = True
        result['source'] = 'gemini'
        
        return result
        
    except Exception as e:
        return {
            "error": f"Errore nell'analisi Gemini: {str(e)}",
            "details": str(e)
        }


# ========== ROUTES ==========

@app.route('/')
def home():
    """Pagina principale - serve index.html da templates/"""
    return render_template('index.html')

@app.route('/gemini')
def gemini_page():
    """Pagina analisi con Gemini AI"""
    return render_template('gemini.html')

@app.route('/compare')
def compare_page():
    """Pagina confronto NLTK vs Gemini"""
    return render_template('compare.html')

@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    """API endpoint per analizzare il testo"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        # Ricevi parametri filtro (con valori default)
        filter_short = data.get('filter_short_words', True)
        min_length = data.get('min_word_length', 4)
        
        # Validazione parametri
        if not isinstance(filter_short, bool):
            filter_short = True
        
        try:
            min_length = int(min_length)
            # Limita tra 2 e 10 caratteri
            min_length = max(2, min(10, min_length))
        except (ValueError, TypeError):
            min_length = 4
        
        # Analizza con parametri
        results = analyze_text(text, filter_short, min_length)
        return jsonify(results)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/health')
def health():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "API is running"})

@app.route('/api/analyze-gemini', methods=['POST'])
def api_analyze_gemini():
    """API endpoint per analizzare il testo con Gemini"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        
        if not text or text.strip() == "":
            return jsonify({"error": "Testo vuoto"}), 400
        
        # Analizza con Gemini
        results = analyze_with_gemini(text)
        
        if 'error' in results:
            return jsonify(results), 400
            
        return jsonify(results)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/compare', methods=['POST'])
def api_compare():
    """API endpoint per confrontare NLTK vs Gemini"""
    try:
        data = request.get_json()
        text = data.get('text', '')
        filter_short = data.get('filter_short_words', True)
        min_length = data.get('min_word_length', 4)
        
        if not text or text.strip() == "":
            return jsonify({"error": "Testo vuoto"}), 400
        
        # Analisi NLTK
        nltk_results = analyze_text(text, filter_short, min_length)
        
        # Analisi Gemini
        gemini_results = analyze_with_gemini(text)
        
        # Confronto
        comparison = {
            "nltk": nltk_results,
            "gemini": gemini_results,
            "success": True
        }
        
        # Calcola differenze se entrambe hanno successo
        if nltk_results.get('success') and gemini_results.get('success'):
            comparison["differences"] = {
                "gulpease_diff": abs(nltk_results['gulpease'] - gemini_results['gulpease']),
                "complexity_diff": abs(nltk_results['complexity_score']['score'] - gemini_results['complexity_score']['score']),
                "agreement": "Alta" if abs(nltk_results['complexity_score']['score'] - gemini_results['complexity_score']['score']) < 15 else "Media" if abs(nltk_results['complexity_score']['score'] - gemini_results['complexity_score']['score']) < 30 else "Bassa"
            }
        
        return jsonify(comparison)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ========== RUN ==========

if __name__ == '__main__':
    # Porta dinamica per Render
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)