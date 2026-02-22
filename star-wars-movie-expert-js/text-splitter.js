/**
 * Recursive Character Text Splitter - Functional API
 * No LangChain, no classes
 */

const createTextSplitter = (options = {}) => {
  const chunkSize = options.chunkSize || 1000;
  const chunkOverlap = options.chunkOverlap || 0;
  const separators = options.separators || ["\n\n", "\n", " ", ""];
  const addStartIndex = options.addStartIndex || false;

  const splitText = (text) => {
    const finalChunks = [];
    
    // Get the appropriate separator
    let separator = separators[separators.length - 1];
    for (const s of separators) {
      if (s === "") {
        separator = s;
        break;
      }
      if (text.includes(s)) {
        separator = s;
        break;
      }
    }

    // Split by separator
    let splits = separator ? text.split(separator) : [text];

    // Process splits
    const goodSplits = [];
    for (const split of splits) {
      if (split.length < chunkSize) {
        goodSplits.push(split);
      } else {
        // Merge good splits before processing large split
        if (goodSplits.length > 0) {
          const mergedText = mergeSplits(goodSplits, separator);
          finalChunks.push(...mergedText);
          goodSplits.length = 0;
        }
        
        // Recursively split the large text
        const subSplits = splitText(split);
        finalChunks.push(...subSplits);
      }
    }

    // Handle remaining good splits
    if (goodSplits.length > 0) {
      const mergedText = mergeSplits(goodSplits, separator);
      finalChunks.push(...mergedText);
    }

    return finalChunks;
  };

  const mergeSplits = (splits, separator) => {
    const merged = [];
    let currentChunk = '';
    let currentLength = 0;

    for (const split of splits) {
      const newLength = currentLength + split.length + (separator ? separator.length : 0);
      
      if (newLength > chunkSize && currentChunk) {
        merged.push(currentChunk.trim());
        currentChunk = split;
        currentLength = split.length;
      } else {
        if (currentChunk) {
          currentChunk += separator + split;
        } else {
          currentChunk = split;
        }
        currentLength = newLength;
      }
    }

    if (currentChunk) {
      merged.push(currentChunk.trim());
    }

    return merged;
  };

  const splitDocuments = async (documents) => {
    const allChunks = [];

    for (const doc of documents) {
      const chunks = splitText(doc.pageContent);
      
      for (const chunk of chunks) {
        allChunks.push({
          pageContent: chunk,
          metadata: { ...doc.metadata }
        });
      }
    }

    return allChunks;
  };

  return {
    splitText,
    splitDocuments
  };
};

export { createTextSplitter };
