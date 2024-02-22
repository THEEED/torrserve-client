import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { nanoid } from 'nanoid';
import api from './api.js';
import fs from 'fs';
import path from 'path';

async function openDb() {
    return open({
        filename: 'database.db',
        driver: sqlite3.Database
    });
}
async function initDb() {
    const db = await openDb();
    await db.exec(`CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY,
    torrentInfo TEXT NOT NULL,
    files TEXT NOT NULL, /* JSON string of files */
    status TEXT NOT NULL,
    createdAt INTEGER NOT NULL
  )`);
}

export async function startDownloading(torrentInfo, files) {
    const downloadId = nanoid();
    const db = await openDb();
    await db.run(`INSERT INTO downloads (id, torrentInfo, files, status, createdAt) VALUES (?, ?, ?, ?, ?)`, [
        downloadId,
        JSON.stringify(torrentInfo),
        JSON.stringify(files),
        'added',
        Date.now()
    ]);
    console.log(`Загрузка ${downloadId} начата.`);
    return downloadId;
}

export async function deleteDownload(downloadId) {
    const db = await openDb();
    // Delete the download entry with the specified ID
    const result = await db.run(`DELETE FROM downloads WHERE id = ?`, downloadId);
    if (result.changes > 0) {
        console.log(`Загрузка с ID ${downloadId} удалена.`);
    } else {
        console.log(`Загрузка с ID ${downloadId} не найдена.`);
    }
}


export async function getDownloads() {
    const db = await openDb();
    const downloads = await db.all(`SELECT * FROM downloads`);
    return downloads.map(download => ({
        ...download,
        torrentInfo: JSON.parse(download.torrentInfo),
        files: JSON.parse(download.files)
    }));
}

export async function resetFileStatus(downloadId, fileId) {
    await setFileStatus(downloadId, fileId, 'started');
}

async function updateFileProgress(downloadId, fileId, downloadedBytes, downloadSpeed) {
    const db = await openDb();
    const download = await db.get(`SELECT * FROM downloads WHERE id = ?`, downloadId);
    if (download) {
        const files = JSON.parse(download.files);
        const file = files.find(f => f.id === fileId);
        if (file) {
            file.downloadedBytes = downloadedBytes;
            file.downloadSpeed = downloadSpeed;
            await db.run(`UPDATE downloads SET files = ? WHERE id = ?`, [JSON.stringify(files), downloadId]);
        }
    }
}

async function getDownloadById(downloadId) {
    const db = await openDb();
    return db.get(`SELECT * FROM downloads WHERE id = ?`, downloadId);
}


async function safeCreateWriteStream(filePath) {
    const dir = path.dirname(filePath);
    await fs.promises.mkdir(dir, { recursive: true });
    return fs.createWriteStream(filePath);
}

async function downloadFile(download, file, attempt = 0) {
    const maxAttempts = 3;
    const streamUrl = getStreamUrl(file, JSON.parse(download.torrentInfo).hash);
    await setFileStatus(download.id, file.id, 'started');

    if (attempt >= maxAttempts) {
        console.log(`Достигнуто максимальное количество попыток для файла: ${file.path}`);
        await setFileStatus(download.id, file.id, 'failed');
        return;
    }

    try {
        const response = await api.downloadFileStream(streamUrl);
        await processDownload(response, file, download);
        await setFileStatus(download.id, file.id, 'downloaded');
    } catch (error) {
        console.error(`Ошибка загрузки файла: ${error}. Попытка ${attempt + 1} из ${maxAttempts}`);
        await setFileStatus(download.id, file, 'error');
        await new Promise(resolve => setTimeout(resolve, 5000));
        setTimeout(() => downloadFile(download, file.id, attempt + 1), 2000);
    }
}

function getStreamUrl(file, hash) {
    return `/stream/${encodeURIComponent(file.path)}?link=${hash}&index=${file.id}&play`;
}

async function setFileStatus(downloadId, fileId, status) {
    const db = await openDb();
    const download = await db.get(`SELECT * FROM downloads WHERE id = ?`, downloadId);
    if (download) {
        const files = JSON.parse(download.files);
        const fileIndex = files.findIndex(f => f.id == fileId);
        if (fileIndex !== -1) {
            files[fileIndex].status = status;
            const updatedFilesString = JSON.stringify(files);
            await db.run(`UPDATE downloads SET files = ? WHERE id = ?`, [updatedFilesString, downloadId]);
            console.log(`Записано (${fileId}:${status}) :`, files[fileIndex].path);
        }
    }
}

async function processDownload(response, file, download) {
    const destinationPath = `downloads/${file.path}`;
    const destination = await safeCreateWriteStream(destinationPath);

    await trackDownloadProgress(response.data, file, download);
}

async function trackDownloadProgress(dataStream, file, download) {
    let downloadedBytes = 0;
    let lastUpdate = Date.now();

    const destinationPath = `downloads/${file.path}`;
    const destination = await safeCreateWriteStream(destinationPath);

    await new Promise((resolve, reject) => {
        dataStream.on('data', async (chunk) => {
            downloadedBytes += chunk.length;
            const now = Date.now();
            const currentDownload = await getDownloadById(download.id);

            if (!currentDownload) {
                console.log(`Загрузка ${download.id} отменена.`);
                dataStream.destroy();
                resolve();
                return;
            }

            if (now - lastUpdate >= 1000) {
                updateFileProgress(download.id, file.id, downloadedBytes, calculateDownloadSpeed(chunk.length, now, lastUpdate));
                lastUpdate = now;
            }
        });

        dataStream.pipe(destination);

        destination.on('finish', async () => {
            console.log('Загрузка файла завершена...:', file.path);
            await setFileStatus(download.id, file.id, 'downloaded');
            resolve();
        });

        dataStream.on('error', (error) => {
            console.error('Ошибка при загрузке файла:', error);
            reject(error);
        });
        destination.on('error', (error) => {
            console.error('Ошибка при записи файла:', error);
            reject(error);
        });
    });


}

function calculateDownloadSpeed(bytes, now, lastUpdate) {
    return bytes / ((now - lastUpdate) / 1000);
}

async function processDownloads() {
    while (true) {
        const db = await openDb();
        const downloads = await db.all(`SELECT * FROM downloads`);
        for (const download of downloads) {
            const files = JSON.parse(download.files);
            files.sort((a, b) => a.id - b.id);

            for (const file of files) {

                const currentDownload = await getDownloadById(download.id);

                if (!currentDownload) {
                    console.log(`Загрузка ${download.id} отменена.`);

                } else if (!file.status || file.status === 'error' || file.status === 'started') {

                        await downloadFile(download, file);
                }
            }
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}



async function main() {
    await initDb();
    processDownloads().catch(console.error);
    // Proceed with the rest of your application logic
}

main().catch(console.error);