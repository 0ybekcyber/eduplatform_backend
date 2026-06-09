const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOADS_ROOT = path.join(__dirname, '../../uploads');

const ensureDir = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const sanitizeFileName = (name) => {
    const baseName = path.basename(name || 'file');
    return baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const saveBase64File = ({ dataUrl, fileName, targetFolder }) => {
    const matches = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
    if (!matches) {
        throw new Error('Invalid file data');
    }

    const folderName = targetFolder || 'common';
    const safeName = sanitizeFileName(fileName);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeName}`;
    const relativeDir = path.posix.join('uploads', folderName);
    const absoluteDir = path.join(UPLOADS_ROOT, folderName);
    const absolutePath = path.join(absoluteDir, uniqueName);

    ensureDir(absoluteDir);
    fs.writeFileSync(absolutePath, Buffer.from(matches[2], 'base64'));

    return {
        filePath: absolutePath,
        relativePath: path.posix.join(relativeDir, uniqueName),
        url: `/${path.posix.join(relativeDir, uniqueName)}`
    };
};

const removeStoredFile = (attachment) => {
    const filePath = attachment?.filePath;
    if (!filePath) return;

    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (e) {
        console.error('Could not delete file:', e.message);
    }
};

module.exports = {
    saveBase64File,
    removeStoredFile,
};
