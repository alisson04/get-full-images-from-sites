import ImageDownloader from './modules/imageDownloader.js';
import site from './source.json' assert { type: 'json' };

;(async () => {
    const imageDownloader = new ImageDownloader(site);
    await imageDownloader.run();
})();
