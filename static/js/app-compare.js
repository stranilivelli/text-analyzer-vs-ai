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

// ========== CONFRONTO NLTK vs GEMINI ==========

const textInput = document.getElementById('textInput');
const compareBtn = document.getElementById('compareBtn');
const clearBtn = document.getElementById('clearBtn');
const exampleBtn = document.getElementById('exampleBtn');
const loading = document.getElementById('loading');
const results = document.getElementById('results');
const comparisonSummary = document.getElementById('comparisonSummary');

const minWordLengthSlider = document.getElementById('minWordLength');
const lengthValue = document.getElementById('lengthValue');

minWordLengthSlider.addEventListener('input', (e) => {
    lengthValue.textContent = e.target.value;
});

const exampleText = `L'intelligenza artificiale rappresenta una delle più significative rivoluzioni tecnologiche del ventunesimo secolo. I sistemi di machine learning, attraverso algoritmi sempre più sofisticati, sono in grado di apprendere da grandi quantità di dati e di migliorare autonomamente le proprie prestazioni. Questa capacità trova applicazione in numerosi settori, dalla medicina alla finanza, dall'automotive all'intrattenimento. Tuttavia, l'implementazione di tali tecnologie solleva importanti questioni etiche relative alla privacy, alla trasparenza degli algoritmi e alle potenziali implicazioni occupazionali.`;

compareBtn.addEventListener('click', compareAnalysis);
clearBtn.addEventListener('click', clearAll);
exampleBtn.addEventListener('click', loadExample);

textInput.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') {
        compareAnalysis();
    }
});

async function compareAnalysis() {
    const text = textInput.value.trim();

    if (!text) {
        alert('Inserisci del testo da analizzare');
        return;
    }

    const filterShort = document.getElementById('filterShortWords').checked;
    const minLength = parseInt(document.getElementById('minWordLength').value);

    loading.classList.remove('hidden');
    results.classList.add('hidden');
    comparisonSummary.classList.add('hidden');
    compareBtn.disabled = true;

    try {
        const response = await fetch('/api/compare', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                filter_short_words: filterShort,
                min_word_length: minLength
            })
        });

        if (!response.ok) {
            throw new Error('Errore nella richiesta');
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        displayComparison(data);

    } catch (error) {
        alert('Errore durante l\'analisi: ' + error.message);
        console.error('Error:', error);
    } finally {
        loading.classList.add('hidden');
        compareBtn.disabled = false;
    }
}

function displayComparison(data) {
    const nltkData = data.nltk;
    const geminiData = data.gemini;

    // Display Summary
    if (data.differences) {
        document.getElementById('gulpeaseDiff').textContent = data.differences.gulpease_diff.toFixed(1) + ' punti';
        document.getElementById('complexityDiff').textContent = data.differences.complexity_diff.toFixed(1) + ' punti';
        
        const agreementEl = document.getElementById('agreement');
        agreementEl.textContent = data.differences.agreement;
        
        // Color code agreement
        if (data.differences.agreement === 'Alta') {
            agreementEl.style.color = 'var(--success)';
        } else if (data.differences.agreement === 'Media') {
            agreementEl.style.color = 'var(--warning)';
        } else {
            agreementEl.style.color = 'var(--error)';
        }
        
        comparisonSummary.classList.remove('hidden');
    }

    // Display NLTK Results
    if (nltkData.success) {
        document.getElementById('nltkComplexityScore').textContent = nltkData.complexity_score.score.toFixed(1);
        document.getElementById('nltkComplexityCategory').textContent = nltkData.complexity_score.category;
        document.getElementById('nltkComplexityScore').style.color = nltkData.complexity_score.color;

        document.getElementById('nltkGulpease').textContent = nltkData.gulpease.toFixed(1);
        const nltkGulpeaseProgress = Math.max(0, Math.min(100, nltkData.gulpease));
        document.getElementById('nltkGulpeaseProgress').style.width = nltkGulpeaseProgress + '%';

        document.getElementById('nltkWords').textContent = nltkData.statistics.total_words;
        document.getElementById('nltkSentences').textContent = nltkData.statistics.total_sentences;
        document.getElementById('nltkAvgLength').textContent = nltkData.statistics.avg_sentence_length.toFixed(1);
        document.getElementById('nltkTTR').textContent = nltkData.ttr.toFixed(3);
    }

    // Display Gemini Results
    if (geminiData.success) {
        document.getElementById('geminiComplexityScore').textContent = geminiData.complexity_score.score.toFixed(1);
        document.getElementById('geminiComplexityCategory').textContent = geminiData.complexity_score.category;
        document.getElementById('geminiComplexityScore').style.color = geminiData.complexity_score.color;

        document.getElementById('geminiGulpease').textContent = geminiData.gulpease.toFixed(1);
        const geminiGulpeaseProgress = Math.max(0, Math.min(100, geminiData.gulpease));
        document.getElementById('geminiGulpeaseProgress').style.width = geminiGulpeaseProgress + '%';

        if (geminiData.semantic_analysis) {
            document.getElementById('geminiConceptual').textContent = geminiData.semantic_analysis.conceptual_difficulty;
            document.getElementById('geminiSchoolLevel').textContent = geminiData.semantic_analysis.school_level;
            document.getElementById('geminiRegister').textContent = geminiData.semantic_analysis.register;
        }
        
        document.getElementById('geminiTTR').textContent = geminiData.ttr.toFixed(3);

        // Suggestions
        const suggestionsContainer = document.getElementById('geminiSuggestions');
        suggestionsContainer.innerHTML = '';
        
        if (geminiData.suggestions && geminiData.suggestions.length > 0) {
            geminiData.suggestions.slice(0, 3).forEach(suggestion => {
                const li = document.createElement('li');
                li.textContent = suggestion;
                suggestionsContainer.appendChild(li);
            });
        } else {
            suggestionsContainer.innerHTML = '<li style="color: var(--gray-600); list-style: none;">Nessun suggerimento</li>';
        }
    }

    // Show results
    results.classList.remove('hidden');
    results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function clearAll() {
    textInput.value = '';
    results.classList.add('hidden');
    comparisonSummary.classList.add('hidden');
    textInput.focus();
}

function loadExample() {
    textInput.value = exampleText;
    textInput.focus();
}

console.log('Confronto NLTK vs Gemini - Ready!');
console.log('Tip: Usa Ctrl+Enter per confrontare velocemente');
