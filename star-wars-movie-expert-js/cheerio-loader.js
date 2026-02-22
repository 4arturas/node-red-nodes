/**
 * Cheerio Web Loader - Functional API using fetch
 * No LangChain, no classes, no http/https boilerplate
 */

import * as cheerio from 'cheerio';

const fetchUrl = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }

  return await response.text();
};

const createCheerioLoader = (webPath) => {
  const load = async () => {
    const html = await fetchUrl(webPath);
    const $ = cheerio.load(html);
    
    // Extract text content, removing scripts and styles
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
    
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();

    return [{
      pageContent: text,
      metadata: {
        source: webPath,
        url: webPath
      }
    }];
  };

  return {
    load
  };
};

export { createCheerioLoader, fetchUrl };
