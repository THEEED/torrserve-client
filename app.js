import express from 'express';
import api from './api.js';
import { startDownloading,deleteDownload,  getDownloads, resetFileStatus } from './downloadManager.js';

const app = express();
const port = 3000;

app.get('/downloads', async (req, res) => {
    try {
        const downloads = await getDownloads();
        res.json(downloads);
    } catch (error) {
        console.error(error);
        res.status(500).send('Произошла ошибка при получении списка загрузок');
    }
});
app.use(express.json());

app.use(express.static('public'));

app.get('/torrents', async (req, res) => {
    try {
        const { data } = await api.torrentsList();
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).send('Произошла ошибка на сервере');
    }
});

// Создание экземпляра адаптера и базы данных

app.get('/start-download/:hash', async (req, res) => {
    const { hash } = req.params; // Получаем hash из параметров запроса

    try {
        // const result = await api.startDownload(hash);
        const { data } = await api.torrentsList();
        const torrentInfo = data.find((i) => i.hash === hash);
        const files = JSON.parse(torrentInfo.data)?.TorrServer?.Files

        startDownloading(torrentInfo, files);

        res.json({ message: `Загрузка начата`});
    } catch (error) {
        console.error(error);
        res.status(500).send('Произошла ошибка при попытке начать загрузку');
    }
});

app.get('/delete-download/:hash', async (req, res) => {
    const { hash } = req.params;
    try {
        deleteDownload(hash);
        res.json({ message: `Загрузка удалена`});
    } catch (error) {
        console.error(error);
        res.status(500).send('Произошла ошибка при попытке начать загрузку');
    }
});

app.get('/reset-file-status/:hash/:id', async (req, res) => {
    const { hash, id } = req.params;
    try {
        const downloadId = await resetFileStatus(hash, id);
        res.json({ message: `Загрузка файла перезапущена`});
    } catch (error) {
        console.error(error);
        res.status(500).send('Произошла ошибка при попытке перезапустить загрузку');
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
