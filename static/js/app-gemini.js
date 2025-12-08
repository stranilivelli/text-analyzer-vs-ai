// ========== HAMBURGER MENU ==========
const hamburger = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu.classList.toggle('active');
});

const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

document.addEventListener('click', (e) => {
    if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// ========== ANALIZZATORE GEMINI ==========

const textInput = document.getElementById('textInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const exampleBtn = document.getElementById('exampleBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');

const exampleText = `L'intelligenza artificiale rappresenta una delle più significative rivoluzioni tecnologiche del ventunesimo secolo. I sistemi di machine learning, attraverso algoritmi sempre più sofisticati, sono in grado di apprendere da grandi quantità di dati e di migliorare autonomamente le proprie prestazioni. Questa capacità trova applicazione in numerosi settori, dalla medicina alla finanza, dall'automotive all'intrattenimento. Tuttavia, l'implementazione di tali tecnologie solleva importanti questioni etiche relative alla privacy, alla trasparenza degli algoritmi e alle potenziali implicazioni occupazionali.`;

analyzeBtn.addEventListener('click', analyzeText);
clearBtn.addEventListener('click', clearAll);
exampleBtn.addEventListener('click', loadExample);

textInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        analyzeText();
    }
});

async function analyzeText() {
    const text = textInput.value.trim();

    if (!text) {
        alert('Inserisci del testo da analizzare');
        return;
    }

    loading.classList.remove('hidden');
    results.classList.add('hidden');
    analyzeBtn.disabled = true;

    try {
        const response = await fetch('/api/analyze-gemini', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            throw new Error('Errore nella richiesta');
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        displayResults(data);

    } catch (error) {
        alert('Errore durante l\'analisi: ' + error.message);
        console.error('Error:', error);
    } finally {
        loading.classList.add('hidden');
        analyzeBtn.disabled = false;
    }
}

function displayResults(data) {
    // Complexity Score
    const scoreElement = document.getElementById('complexityScore');
    const categoryElement = document.getElementById('complexityCategory');
    const score = data.complexity_score.score;
    const category = data.complexity_score.category;
    const color = data.complexity_score.color;

    scoreElement.textContent = score.toFixed(1);
    categoryElement.textContent = category;
    scoreElement.style.color = color;

    // Statistics
    document.getElementById('totalWords').textContent = data.statistics.total_words;
    document.getElementById('totalSentences').textContent = data.statistics.total_sentences;
    document.getElementById('avgSentenceLength').textContent = data.statistics.avg_sentence_length.toFixed(1);
    document.getElementById('ttr').textContent = data.ttr.toFixed(3);

    // Gulpease
    const gulpease = data.gulpease;
    document.getElementById('gulpease').textContent = gulpease.toFixed(1);

    let gulpeaseDesc;
    if (gulpease >= 80) {
        gulpeaseDesc = 'Testo Facile ✅';
    } else if (gulpease >= 60) {
        gulpeaseDesc = 'Media Difficoltà ⚠️';
    } else {
        gulpeaseDesc = 'Testo Difficile ❌';
    }
    document.getElementById('gulpeaseDesc').textContent = gulpeaseDesc;

    const gulpeaseProgress = Math.max(0, Math.min(100, gulpease));
    document.getElementById('gulpeaseProgress').style.width = gulpeaseProgress + '%';

    // Semantic Analysis (NUOVO)
    if (data.semantic_analysis) {
        document.getElementById('conceptualDifficulty').textContent = data.semantic_analysis.conceptual_difficulty;
        document.getElementById('schoolLevel').textContent = data.semantic_analysis.school_level;
        document.getElementById('register').textContent = data.semantic_analysis.register;
        document.getElementById('reasoningComplexity').textContent = data.semantic_analysis.reasoning_complexity;
    }

    // Technical Terms (NUOVO)
    const technicalTermsContainer = document.getElementById('technicalTerms');
    technicalTermsContainer.innerHTML = '';
    
    if (data.semantic_analysis && data.semantic_analysis.technical_terms && data.semantic_analysis.technical_terms.length > 0) {
        data.semantic_analysis.technical_terms.forEach(term => {
            const termItem = document.createElement('div');
            termItem.className = 'word-item';
            termItem.innerHTML = `<span class="word-text">${term}</span>`;
            technicalTermsContainer.appendChild(termItem);
        });
    } else {
        technicalTermsContainer.innerHTML = '<p style="color: var(--gray-600);">Nessun termine tecnico rilevato</p>';
    }

    // Suggestions (NUOVO)
    const suggestionsContainer = document.getElementById('suggestions');
    suggestionsContainer.innerHTML = '';
    
    if (data.suggestions && data.suggestions.length > 0) {
        data.suggestions.forEach(suggestion => {
            const li = document.createElement('li');
            li.textContent = suggestion;
            suggestionsContainer.appendChild(li);
        });
    } else {
        suggestionsContainer.innerHTML = '<li style="color: var(--gray-600);">Nessun suggerimento disponibile</li>';
    }

    // Critical Points (NUOVO)
    const criticalPointsContainer = document.getElementById('criticalPoints');
    criticalPointsContainer.innerHTML = '';
    
    if (data.critical_points && data.critical_points.length > 0) {
        data.critical_points.forEach(point => {
            const li = document.createElement('li');
            li.textContent = point;
            criticalPointsContainer.appendChild(li);
        });
    } else {
        criticalPointsContainer.innerHTML = '<li style="color: var(--gray-600);">Nessun punto critico identificato</li>';
    }

    // Mostra risultati
    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAll() {
    textInput.value = '';
    results.classList.add('hidden');
    textInput.focus();
}

function loadExample() {
    textInput.value = exampleText;
    textInput.focus();
}

console.log('Analizzatore Gemini AI - Ready!');
console.log('Tip: Usa Ctrl+Enter per analizzare velocemente');
