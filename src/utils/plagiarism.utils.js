const fs = require('fs');
const crypto = require('crypto');

const MIN_WORDS_FOR_TEXT_CHECK = 12;
const SHINGLE_SIZE = 5;

const normalizeText = (value) => {
    return (value || '')
        .toString()
        .toLowerCase()
        .replace(/[’`]/g, "'")
        .replace(/[^a-zа-яё0-9ўқғҳ'\s]/giu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const tokenize = (value) => {
    return normalizeText(value)
        .split(' ')
        .map(item => item.trim())
        .filter(item => item.length > 2);
};

const makeShingles = (tokens) => {
    if (tokens.length < SHINGLE_SIZE) return new Set(tokens);
    const shingles = new Set();
    for (let i = 0; i <= tokens.length - SHINGLE_SIZE; i++) {
        shingles.add(tokens.slice(i, i + SHINGLE_SIZE).join(' '));
    }
    return shingles;
};

const setIntersectionSize = (a, b) => {
    let count = 0;
    a.forEach(item => {
        if (b.has(item)) count++;
    });
    return count;
};

const calculateTextSimilarity = (leftText, rightText) => {
    const leftTokens = tokenize(leftText);
    const rightTokens = tokenize(rightText);

    if (leftTokens.length < MIN_WORDS_FOR_TEXT_CHECK || rightTokens.length < MIN_WORDS_FOR_TEXT_CHECK) {
        return { score: 0, sharedUnits: 0, method: 'insufficient_text' };
    }

    const leftShingles = makeShingles(leftTokens);
    const rightShingles = makeShingles(rightTokens);
    const intersection = setIntersectionSize(leftShingles, rightShingles);
    const union = new Set([...leftShingles, ...rightShingles]).size || 1;
    const jaccard = intersection / union;
    const containment = intersection / Math.min(leftShingles.size || 1, rightShingles.size || 1);
    const score = Math.round(Math.max(jaccard, containment * 0.92) * 100);

    return {
        score: Math.min(100, score),
        sharedUnits: intersection,
        method: 'text_similarity'
    };
};

const hashBuffer = (buffer) => {
    if (!buffer || !buffer.length) return null;
    return crypto.createHash('sha256').update(buffer).digest('hex');
};

const extractPrintableText = (buffer) => {
    if (!buffer || !buffer.length) return '';
    const latinText = buffer.toString('latin1')
        .replace(/\(([^()]{3,})\)\s*Tj/g, ' $1 ')
        .replace(/\(([^()]{3,})\)/g, ' $1 ')
        .replace(/[^\x20-\x7E\n\r\tА-Яа-яЁёЎўҚқҒғҲҳ]/g, ' ');
    const utf16Text = buffer.toString('utf16le')
        .replace(/[^\x20-\x7E\n\r\tА-Яа-яЁёЎўҚқҒғҲҳ]/g, ' ');

    return `${latinText} ${utf16Text}`
        .replace(/\\n|\\r|\\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const readAttachmentBuffer = (attachment) => {
    if (!attachment?.filePath || !fs.existsSync(attachment.filePath)) return null;
    try {
        return fs.readFileSync(attachment.filePath);
    } catch (e) {
        return null;
    }
};

const buildContentFingerprint = (submission) => {
    const attachment = submission.attachment || null;
    const buffer = readAttachmentBuffer(attachment);
    const fileHash = hashBuffer(buffer);
    const extractedFileText = extractPrintableText(buffer);
    const text = [
        submission.textAnswer || '',
        extractedFileText
    ].filter(Boolean).join('\n');

    return {
        contentHash: fileHash,
        extractedText: normalizeText(text),
        extractedFileTextLength: extractedFileText.length,
        hasAttachment: Boolean(attachment),
        fileName: attachment?.fileName || null
    };
};

const getStudentName = (submission) => {
    const student = submission.student || {};
    return `${student.lastname || ''} ${student.firstname || ''}`.trim() || `Talaba #${submission.studentId}`;
};

const comparePreparedSubmissions = (left, right) => {
    const sameFile = Boolean(left.contentHash && right.contentHash && left.contentHash === right.contentHash);
    const textSimilarity = calculateTextSimilarity(left.extractedText, right.extractedText);
    const score = sameFile ? 100 : textSimilarity.score;

    return {
        submissionId: right.id,
        studentId: right.studentId,
        studentName: right.studentName,
        score,
        sameFile,
        textSimilarity: textSimilarity.score,
        sharedUnits: textSimilarity.sharedUnits,
        method: sameFile ? 'same_file_hash' : textSimilarity.method,
        fileName: right.fileName
    };
};

const buildPlagiarismReport = (submission, allPreparedSubmissions) => {
    const matches = allPreparedSubmissions
        .filter(item => Number(item.id) !== Number(submission.id))
        .map(item => comparePreparedSubmissions(submission, item))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

    const highestScore = matches[0]?.score || 0;

    return {
        score: highestScore,
        checkedAt: new Date().toISOString(),
        checkedSubmissions: Math.max(0, allPreparedSubmissions.length - 1),
        matches,
        source: {
            hasAttachment: submission.hasAttachment,
            fileName: submission.fileName,
            extractedTextLength: submission.extractedText.length,
            extractedFileTextLength: submission.extractedFileTextLength
        }
    };
};

const prepareSubmissionForCheck = (submission) => {
    const json = typeof submission.toJSON === 'function' ? submission.toJSON() : submission;
    const fingerprint = buildContentFingerprint(submission);
    return {
        ...json,
        ...fingerprint,
        studentName: getStudentName(json)
    };
};

module.exports = {
    buildPlagiarismReport,
    prepareSubmissionForCheck
};
