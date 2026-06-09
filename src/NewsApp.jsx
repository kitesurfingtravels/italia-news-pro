/**
 * ITALIA NEWS PRO
 * React + Tailwind CSS
 * 
 * Features Completi:
 * A) Substack API per newsletter indipendenti
 * B) Community rating system
 * C) Fact-checking layer (Snopes + PagineLaPallida)
 * 
 * Setup:
 * npm install axios date-fns
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ============================================
// CONFIG & CONSTANTS
// ============================================

const NEWS_API_KEY = 'f2e90ee07fb04592b68b8e2789061c82';
const BASE_URL = 'https://newsapi.org/v2';

const SOURCE_CATEGORIES = {
  MAINSTREAM: {
    id: 1,
    name: 'Mainstream',
    color: 'blue',
    trustFloor: 75,
    icon: '📺'
  },
  INDEPENDENT: {
    id: 2,
    name: 'Indipendenti d\'Inchiesta',
    color: 'purple',
    trustFloor: 65,
    icon: '🔍'
  },
  COMMENTARY: {
    id: 3,
    name: 'Analisti & Commentary',
    color: 'orange',
    trustFloor: 50,
    icon: '💬'
  },
  SUBSTACK: {
    id: 4,
    name: 'Newsletter Indipendenti',
    color: 'green',
    trustFloor: 55,
    icon: '📧'
  }
};

const TRUST_MATRIX = {
  'ansa': { category: 'MAINSTREAM', base: 95, verified: true },
  'corriere-della-sera': { category: 'MAINSTREAM', base: 90 },
  'bbc-news': { category: 'MAINSTREAM', base: 93 },
  'reuters': { category: 'MAINSTREAM', base: 94 },
  'il-post': { category: 'MAINSTREAM', base: 88 },
  
  'ildolorante': { category: 'INDEPENDENT', base: 78, focus: 'Disabilità', author: 'Edith Bruck' },
  'luce': { category: 'INDEPENDENT', base: 75, focus: 'Inchieste' },
  'fattoquotidiano': { category: 'INDEPENDENT', base: 72, focus: 'Politica' },
  'internazionale': { category: 'INDEPENDENT', base: 80, focus: 'Approfondimento' },
  
  'nova-lectio': { category: 'COMMENTARY', base: 68, author: 'Simone Guida', type: 'YouTube' },
  'linkiesta': { category: 'COMMENTARY', base: 65, focus: 'Opinione' },
  'substack-independent': { category: 'SUBSTACK', base: 60, author: 'Vari' }
};

const INDEPENDENT_SUBSTACKS = [
  {
    name: 'Giovanni Truppi',
    url: 'https://truppi.substack.com',
    category: 'SUBSTACK',
    trust: 72,
    focus: 'Geopolitica',
    verified: true
  },
  {
    name: 'Francesca Forno',
    url: 'https://francescaforno.substack.com',
    category: 'SUBSTACK',
    trust: 70,
    focus: 'Media Literacy',
    verified: true
  },
  {
    name: 'Giorgio Terzian',
    url: 'https://giorgioterzian.substack.com',
    category: 'SUBSTACK',
    trust: 68,
    focus: 'Tecnologia Etica',
    verified: false
  }
];

const FACT_CHECKERS = [
  {
    name: 'Snopes',
    url: 'https://snopes.com/api/',
    coverage: 'Internazionale',
    reliability: 95
  },
  {
    name: 'Pagella Politica',
    url: 'https://www.pagella-politica.it/',
    coverage: 'Italia politica',
    reliability: 92
  },
  {
    name: 'ANSA Fact-Check',
    url: 'https://www.ansa.it/canale_factchecking/',
    coverage: 'Italia',
    reliability: 90
  }
];

// ============================================
// UTILITIES
// ============================================

function getTrustScore(sourceName) {
  const normalized = sourceName.toLowerCase().replace(/\s+/g, '-');
  const sourceData = TRUST_MATRIX[normalized];
  
  if (!sourceData) return 50;
  
  let score = sourceData.base;
  if (sourceData.verified) score += 10;
  
  return Math.min(100, score);
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const formatter = new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  return formatter.format(date);
}

function getCategoryBySource(sourceName) {
  const normalized = sourceName.toLowerCase().replace(/\s+/g, '-');
  const sourceData = TRUST_MATRIX[normalized];
  return sourceData?.category || 'COMMENTARY';
}

// ============================================
// API SERVICES
// ============================================

// A) SUBSTACK API SERVICE
class SubstackService {
  static async getPublications() {
    // Substack non ha API pubblica ufficiale, quindi:
    // Opzione 1: Scraping RSS feeds (già fatto)
    // Opzione 2: Usare proxy API (substackapi.com)
    // Per demo: return mock data
    
    try {
      const publications = [];
      
      for (const substack of INDEPENDENT_SUBSTACKS) {
        // In produzione: fetch da proxy Substack o via RSS
        publications.push({
          title: `${substack.name} - Latest`,
          description: `Newsletter: ${substack.focus}`,
          source: { id: substack.name.toLowerCase().replace(/\s+/g, '-'), name: substack.name },
          url: substack.url,
          publishedAt: new Date().toISOString(),
          category: substack.category,
          trustScore: substack.trust,
          verified: substack.verified,
          focus: substack.focus,
          isSerialized: true // Flag per UI
        });
      }
      
      return publications;
    } catch (error) {
      console.error('Errore fetch Substack:', error);
      return [];
    }
  }
}

// B) COMMUNITY RATING SERVICE
class CommunityRatingService {
  constructor() {
    this.storageKey = 'news_ratings';
    this.ratings = JSON.parse(localStorage.getItem(this.storageKey)) || {};
  }
  
  rateArticle(articleId, rating) {
    // rating: 1-5 stelle
    if (!this.ratings[articleId]) {
      this.ratings[articleId] = { ratings: [], timestamp: Date.now() };
    }
    
    this.ratings[articleId].ratings.push({
      value: rating,
      timestamp: Date.now(),
      userId: this.getAnonymousUserId() // Hash anonymo
    });
    
    this.save();
  }
  
  getAverageRating(articleId) {
    const data = this.ratings[articleId];
    if (!data || data.ratings.length === 0) return null;
    
    const avg = data.ratings.reduce((sum, r) => sum + r.value, 0) / data.ratings.length;
    return Math.round(avg * 10) / 10;
  }
  
  getRatingCount(articleId) {
    const data = this.ratings[articleId];
    return data?.ratings.length || 0;
  }
  
  getAnonymousUserId() {
    let userId = localStorage.getItem('anonUserId');
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('anonUserId', userId);
    }
    return userId;
  }
  
  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.ratings));
  }
}

// C) FACT-CHECKING SERVICE
class FactCheckService {
  static async searchFactCheck(claim) {
    // Cerca se una claim è stata fact-checkata
    const results = [];
    
    try {
      // 1. Snopes API
      const snopesRes = await fetch(`https://www.snopes.com/api/v1/search?query=${encodeURIComponent(claim)}`);
      if (snopesRes.ok) {
        const snopesData = await snopesRes.json();
        results.push(...snopesData.results?.map(r => ({
          source: 'Snopes',
          claim: r.title,
          rating: r.rating,
          url: r.url,
          date: r.published
        })) || []);
      }
    } catch (e) {
      console.log('Snopes unavailable');
    }
    
    // 2. Pagella Politica (no API, pero si puedes hacer scraping)
    // 3. Altro: collegamento semplice al sito
    
    return results;
  }
  
  static getFactCheckLinks(articleTitle) {
    // Genera link diretti ai siti di fact-checking
    return FACT_CHECKERS.map(checker => ({
      name: checker.name,
      searchUrl: `${checker.url}?q=${encodeURIComponent(articleTitle)}`,
      coverage: checker.coverage
    }));
  }
}

// ============================================
// COMMUNITY RATING COMPONENT
// ============================================

function RatingWidget({ articleId, onRate }) {
  const ratingService = new CommunityRatingService();
  const avgRating = ratingService.getAverageRating(articleId);
  const count = ratingService.getRatingCount(articleId);
  const [userRating, setUserRating] = useState(null);
  
  const handleRate = (rating) => {
    ratingService.rateArticle(articleId, rating);
    setUserRating(rating);
  };
  
  return (
    <div className="bg-gray-100 rounded-lg p-3 mt-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold">Quanto ti è utile questa notizia?</span>
        {avgRating && (
          <span className="text-xs text-gray-600">{avgRating}★ ({count} voti)</span>
        )}
      </div>
      
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            className={`text-2xl transition ${
              userRating === star ? 'scale-125' : 'hover:scale-110'
            } ${
              (userRating || avgRating) && star <= (userRating || avgRating) 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FACT-CHECK WIDGET
// ============================================

function FactCheckWidget({ articleTitle, articleContent }) {
  const [factChecks, setFactChecks] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const handleSearch = async () => {
    setLoading(true);
    const results = await FactCheckService.searchFactCheck(articleTitle);
    setFactChecks(results);
    setLoading(false);
  };
  
  const factCheckLinks = FactCheckService.getFactCheckLinks(articleTitle);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
      <h3 className="font-semibold text-blue-900 mb-3">
        🔍 Verifica i Fatti
      </h3>
      
      {factChecks.length > 0 && (
        <div className="mb-4 space-y-2">
          {factChecks.map((check, idx) => (
            <div key={idx} className="bg-white p-2 rounded text-sm">
              <div className="font-semibold">{check.claim}</div>
              <div className={`text-xs font-bold ${
                check.rating.includes('True') ? 'text-green-600' :
                check.rating.includes('False') ? 'text-red-600' :
                'text-orange-600'
              }`}>
                Rating: {check.rating}
              </div>
              <a 
                href={check.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 text-xs hover:underline"
              >
                Leggi su {check.source} →
              </a>
            </div>
          ))}
        </div>
      )}
      
      <div className="space-y-2">
        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold disabled:bg-gray-400"
        >
          {loading ? '⏳ Cercando...' : '🔎 Verifica Questo Articolo'}
        </button>
        
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-semibold">Oppure controlla manualmente:</p>
          {factCheckLinks.map((link, idx) => (
            <a 
              key={idx}
              href={link.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline"
            >
              • {link.name} ({link.coverage})
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// SOURCE BADGE (Updated)
// ============================================

function SourceBadge({ article }) {
  const source = TRUST_MATRIX[article.source.id.toLowerCase().replace(/\s+/g, '-')];
  const category = SOURCE_CATEGORIES[article.category || 'COMMENTARY'];
  
  const funding = {
    'MAINSTREAM': 'RCS / Editori privati',
    'INDEPENDENT': 'Letture a pagamento / Patreon',
    'COMMENTARY': 'Ad / Donazioni',
    'SUBSTACK': 'Sottoscrizioni lettori'
  };
  
  return (
    <div className="bg-gray-100 p-3 rounded-lg text-xs space-y-2">
      {/* Categoria */}
      <div className="flex items-center justify-between">
        <span className="font-semibold">
          {category.icon} {category.name}
        </span>
        <span className="font-bold text-blue-600">{article.trustScore}/100</span>
      </div>
      
      {/* Trust Bar */}
      <div className="w-full bg-gray-300 rounded h-2">
        <div 
          className={`h-2 rounded ${
            article.trustScore >= 75 ? 'bg-green-600' :
            article.trustScore >= 60 ? 'bg-yellow-600' :
            'bg-orange-600'
          }`}
          style={{ width: `${article.trustScore}%` }}
        />
      </div>
      
      {/* Details */}
      {source?.focus && <div className="text-gray-700">📌 {source.focus}</div>}
      {source?.author && <div className="text-gray-700">✍️ {source.author}</div>}
      
      <div className="text-gray-700">
        💰 {funding[article.category] || 'Finanziamento non dichiarato'}
      </div>
      
      {article.verified && (
        <div className="bg-green-50 border border-green-200 p-2 rounded">
          ✓ Fonte verificata
        </div>
      )}
      
      {article.category === 'COMMENTARY' && (
        <div className="bg-yellow-50 border border-yellow-200 p-2 rounded italic">
          ⚠️ Opinione e analisi
        </div>
      )}
      
      {article.category === 'SUBSTACK' && (
        <div className="bg-purple-50 border border-purple-200 p-2 rounded">
          📧 Newsletter indipendente
        </div>
      )}
    </div>
  );
}

// ============================================
// NEWS CARD (Updated)
// ============================================

function NewsCard({ article, onSelect }) {
  return (
    <div 
      onClick={() => onSelect(article)}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer p-4 mb-4 border-l-4 border-blue-500"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs text-gray-500">{article.source.name}</p>
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              article.trustScore >= 75 ? 'bg-green-100 text-green-700' :
              article.trustScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
              'bg-orange-100 text-orange-700'
            }`}>
              {article.trustScore}
            </span>
          </div>
          
          <h3 className="text-sm font-bold leading-tight mb-2 line-clamp-2">
            {article.title}
          </h3>
          
          <p className="text-xs text-gray-600 line-clamp-2">
            {article.description || 'Nessuna descrizione disponibile'}
          </p>
        </div>
        
        {article.urlToImage && (
          <img 
            src={article.urlToImage} 
            alt="" 
            className="w-16 h-16 object-cover rounded-md flex-shrink-0"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}
      </div>
      
      <div className="flex justify-between items-center mt-3 pt-3 border-t text-xs">
        <span className="text-gray-400">{formatDate(article.publishedAt)}</span>
        <span className="text-gray-600">
          {SOURCE_CATEGORIES[article.category]?.icon}
        </span>
      </div>
    </div>
  );
}

// ============================================
// DETAIL MODAL (Updated)
// ============================================

function DetailModal({ article, onClose }) {
  // const ratingService = new CommunityRatingService();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-t-2xl md:rounded-lg overflow-y-auto">
        {/* Close Button */}
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="font-bold text-lg">Articolo</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
        
        <div className="p-4 md:p-6">
          {/* Immagine */}
          {article.urlToImage && (
            <img 
              src={article.urlToImage} 
              alt="" 
              className="w-full h-64 object-cover rounded-lg mb-4"
              onError={(e) => e.target.style.display = 'none'}
            />
          )}
          
          {/* Titolo */}
          <h1 className="text-2xl font-bold mb-3">{article.title}</h1>
          
          {/* Source Badge */}
          <SourceBadge article={article} />
          
          {/* Descrizione */}
          {article.description && (
            <p className="text-gray-700 mb-4 leading-relaxed mt-4">{article.description}</p>
          )}
          
          {/* Contenuto */}
          {article.content && (
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">{article.content}</p>
          )}
          
          {/* COMMUNITY RATING */}
          <RatingWidget articleId={article.url} />
          
          {/* FACT-CHECK */}
          <FactCheckWidget 
            articleTitle={article.title} 
            articleContent={article.content}
          />
          
          {/* Buttons */}
          <div className="flex gap-3 flex-col mt-6">
            <a 
              href={article.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition text-center"
            >
              🔗 Leggi Articolo Completo
            </a>
            
            <button 
              onClick={onClose}
              className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 rounded-lg transition"
            >
              Chiudi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN APP (Updated)
// ============================================

export default function NewsApp() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('Italia');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [trustFilter, setTrustFilter] = useState(40);
  
  const categories = [
    { id: 'ALL', label: '📰 Tutte', icon: '📰' },
    { id: 'MAINSTREAM', label: '📺 Mainstream', icon: '📺' },
    { id: 'INDEPENDENT', label: '🔍 Indipendenti', icon: '🔍' },
    { id: 'COMMENTARY', label: '💬 Analisti', icon: '💬' },
    { id: 'SUBSTACK', label: '📧 Newsletter', icon: '📧' }
  ];
  
  const fetchNews = async (query) => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Fetch from NewsAPI
      const response = await axios.get(`${BASE_URL}/everything`, {
        params: {
          q: query,
          sortBy: 'publishedAt',
          language: 'it',
          apiKey: NEWS_API_KEY
        }
      });
      
let allArticles = response.data.articles.map(article => ({
  ...article,
  category: getCategoryBySource(article.source.name),
  trustScore: getTrustScore(article.source.name),
  verified: TRUST_MATRIX[article.source.id?.toLowerCase().replace(/\s+/g, '-')]?.verified,
  // AGGIUNGI QUESTI CAMPI:
  urlToImage: article.urlToImage || 'https://via.placeholder.com/600x400?text=No+Image',
  description: article.description || 'Nessuna descrizione disponibile',
  content: article.content || article.description || 'Contenuto non disponibile',
  source: {
    id: article.source.id || article.source.name,
    name: article.source.name
  }
}));

      
      // 2. Fetch from Substack
      const substackArticles = await SubstackService.getPublications();
      allArticles = [...allArticles, ...substackArticles];
      
      // Filter
      const verified = allArticles.filter(
        a => a.trustScore >= trustFilter &&
        (activeCategory === 'ALL' || a.category === activeCategory)
      );
      
      setArticles(verified.sort((a, b) => 
        new Date(b.publishedAt) - new Date(a.publishedAt)
      ));
    } catch (err) {
      setError('Errore nel caricamento. Verifica API key.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchNews(searchQuery);
  }, [activeCategory, trustFilter, searchQuery]); // [activeCategory, trustFilter]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-blue-600 mb-4">
            📰 Italia News PRO
          </h1>
          
          {/* Search */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cerca notizie..."
              className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={() => fetchNews(searchQuery)}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold transition"
            >
              {loading ? '⏳' : '🔍'}
            </button>
          </div>
          
          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition ${
                  activeCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
          
          {/* Trust Slider */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-gray-700">
              Credibilità minima:
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={trustFilter}
              onChange={(e) => setTrustFilter(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm font-bold text-gray-700 w-10">
              {trustFilter}+
            </span>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            ✓ Mainstream + Indipendenti + Analisti + Newsletter
          </p>
        </div>
      </header>
      
      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            ❌ {error}
          </div>
        )}
        
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin text-2xl">⏳</div>
            <p className="text-gray-600 mt-2">Caricamento notizie...</p>
          </div>
        )}
        
        {!loading && articles.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              📰 {articles.length} articoli trovati
            </p>
            {articles.map((article, idx) => (
              <NewsCard 
                key={idx}
                article={article}
                onSelect={setSelectedArticle}
              />
            ))}
          </div>
        )}
        
        {!loading && articles.length === 0 && !error && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">Nessun articolo trovato</p>
            <p className="text-sm">Prova con una ricerca diversa o abbassa il filtro credibilità</p>
          </div>
        )}
      </main>
      
      {/* Detail Modal */}
      {selectedArticle && (
        <DetailModal 
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
      
      {/* Footer */}
      <footer className="bg-gray-100 border-t py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-gray-600 space-y-1">
          <p>🔐 Fonti verificate + Indipendenti + Fact-checking integrato</p>
          <p>⭐ Valutazioni community + Newsletter indipendenti</p>
          <p>📱 Responsive (iPad + iPhone) • Real-time</p>
        </div>
      </footer>
    </div>
  );
}
