import Faiss from 'faiss-node';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * FAISS Store - Functional API
 * No LangChain, no classes
 */

const createDocument = (pageContent, metadata = {}) => ({
  pageContent,
  metadata
});

const normalizeEmbedding = (embedding) => {
  const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return embedding;
  return embedding.map(v => v / norm);
};

const createFaissStore = async (documents, embeddings, persistPath = null) => {
  let index = null;
  let storedDocs = [];
  let dimension = 0;

  // Initialize index from documents
  if (documents && documents.length > 0) {
    const texts = documents.map(doc => doc.pageContent);
    const embeddingsList = await embeddings.embedDocuments(texts);

    if (embeddingsList.length > 0) {
      dimension = embeddingsList[0].length;
      index = new Faiss.IndexFlatIP(dimension);

      for (let i = 0; i < embeddingsList.length; i++) {
        const normalizedEmbedding = normalizeEmbedding(embeddingsList[i]);
        index.add(normalizedEmbedding);
        storedDocs.push({
          pageContent: documents[i].pageContent,
          metadata: documents[i].metadata,
          embedding: normalizedEmbedding
        });
      }
    }
  }

  const similaritySearchVectorWithScore = async (queryEmbedding, k) => {
    if (!index) {
      throw new Error('FAISS index not initialized');
    }

    const normalizedQuery = normalizeEmbedding(queryEmbedding);
    const actualK = Math.min(k, index.ntotal);
    const distances = new Float32Array(actualK);
    const labels = new Int32Array(actualK);

    index.search(normalizedQuery, actualK, distances, labels);

    const results = [];
    for (let i = 0; i < actualK; i++) {
      const idx = labels[i];
      if (idx >= 0 && idx < storedDocs.length) {
        results.push([
          createDocument(storedDocs[idx].pageContent, storedDocs[idx].metadata),
          distances[i]
        ]);
      }
    }

    return results;
  };

  const addDocuments = async (newDocuments) => {
    const texts = newDocuments.map(doc => doc.pageContent);
    const embeddingsList = await embeddings.embedDocuments(texts);

    if (!index && embeddingsList.length > 0) {
      dimension = embeddingsList[0].length;
      index = new Faiss.IndexFlatIP(dimension);
    }

    for (let i = 0; i < embeddingsList.length; i++) {
      const normalizedEmbedding = normalizeEmbedding(embeddingsList[i]);
      index.add(normalizedEmbedding);
      storedDocs.push({
        pageContent: newDocuments[i].pageContent,
        metadata: newDocuments[i].metadata,
        embedding: normalizedEmbedding
      });
    }
  };

  const save = async (savePath) => {
    if (!index) {
      throw new Error('No index to save');
    }

    const absolutePath = path.isAbsolute(savePath) ? savePath : path.join(__dirname, savePath);
    
    if (!fs.existsSync(absolutePath)) {
      fs.mkdirSync(absolutePath, { recursive: true });
    }

    const indexPath = path.join(absolutePath, 'faiss.index');
    const docsPath = path.join(absolutePath, 'documents.json');

    index.write(indexPath);
    fs.writeFileSync(docsPath, JSON.stringify(storedDocs, null, 2));
  };

  const asRetriever = (options = {}) => {
    const k = options.k || 4;
    return {
      invoke: async (query) => {
        const queryEmbedding = await embeddings.embedQuery(query);
        const results = await similaritySearchVectorWithScore(queryEmbedding, k);
        return results.map(([doc, score]) => doc);
      }
    };
  };

  return {
    addDocuments,
    similaritySearchVectorWithScore,
    save,
    asRetriever
  };
};

const loadFaissStore = async (persistPath, embeddings) => {
  const absolutePath = path.isAbsolute(persistPath) ? persistPath : path.join(__dirname, persistPath);
  const indexPath = path.join(absolutePath, 'faiss.index');
  const docsPath = path.join(absolutePath, 'documents.json');

  if (!fs.existsSync(indexPath)) {
    throw new Error('FAISS index file not found');
  }

  const index = Faiss.IndexFlatIP.load(indexPath);
  
  let storedDocs = [];
  if (fs.existsSync(docsPath)) {
    const docsData = fs.readFileSync(docsPath, 'utf8');
    storedDocs = JSON.parse(docsData);
  }

  const similaritySearchVectorWithScore = async (queryEmbedding, k) => {
    const normalizedQuery = normalizeEmbedding(queryEmbedding);
    const actualK = Math.min(k, index.ntotal);
    const distances = new Float32Array(actualK);
    const labels = new Int32Array(actualK);

    index.search(normalizedQuery, actualK, distances, labels);

    const results = [];
    for (let i = 0; i < actualK; i++) {
      const idx = labels[i];
      if (idx >= 0 && idx < storedDocs.length) {
        results.push([
          createDocument(storedDocs[idx].pageContent, storedDocs[idx].metadata),
          distances[i]
        ]);
      }
    }

    return results;
  };

  const addDocuments = async (newDocuments) => {
    const texts = newDocuments.map(doc => doc.pageContent);
    const embeddingsList = await embeddings.embedDocuments(texts);

    for (let i = 0; i < embeddingsList.length; i++) {
      const normalizedEmbedding = normalizeEmbedding(embeddingsList[i]);
      index.add(normalizedEmbedding);
      storedDocs.push({
        pageContent: newDocuments[i].pageContent,
        metadata: newDocuments[i].metadata,
        embedding: normalizedEmbedding
      });
    }
  };

  const save = async (savePath) => {
    const saveAbsolutePath = path.isAbsolute(savePath) ? savePath : path.join(__dirname, savePath);
    
    if (!fs.existsSync(saveAbsolutePath)) {
      fs.mkdirSync(saveAbsolutePath, { recursive: true });
    }

    const indexPath = path.join(saveAbsolutePath, 'faiss.index');
    const docsPath = path.join(saveAbsolutePath, 'documents.json');

    index.write(indexPath);
    fs.writeFileSync(docsPath, JSON.stringify(storedDocs, null, 2));
  };

  const asRetriever = (options = {}) => {
    const k = options.k || 4;
    return {
      invoke: async (query) => {
        const queryEmbedding = await embeddings.embedQuery(query);
        const results = await similaritySearchVectorWithScore(queryEmbedding, k);
        return results.map(([doc, score]) => doc);
      }
    };
  };

  return {
    addDocuments,
    similaritySearchVectorWithScore,
    save,
    asRetriever
  };
};

export { createFaissStore, loadFaissStore, createDocument };
