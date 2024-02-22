import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const api = axios.create({
    baseURL: process.env.API_BASE_URL,
});

export default {
    torrentsList() {
        return api.post('/torrents', {
            action: 'list'
        });
    },
    downloadFileStream(url) {
        return api.get(url, {
            responseType: 'stream'
        });
    },
}
