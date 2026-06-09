import Parser from 'rss-parser';

const parser = new Parser();

const SUBSTACK_FEEDS = [
  'https://truppi.substack.com/feed',
  'https://francescaforno.substack.com/feed'
];

export async function fetchSubstackArticles() {
  const articles = [];
  
  for (const feed of SUBSTACK_FEEDS) {
    try {
      const data = await parser.parseURL(feed);
      articles.push(...data.items);
    } catch (error) {
      console.error(`Errore feed ${feed}:`, error);
    }
  }
  
  return articles;
}