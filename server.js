import puppeteer from 'puppeteer';
import download from 'image-downloader';
import fs from 'fs';
import loadingBar from './modules/loading-bar.js'

const logs = [];

;(async () => {
    const site = {
        url: 'https://leakedzone.com/victoryaxo/photo',
        folder: 'victoryaxo',
        selector: '.light-gallery-item',
        type: {attr: 'data-src'}
    };

    await createFolder(site.folder);

    const browser = await puppeteer.launch({
        ignoreDefaultArgs: ['--disable-extensions'],
        // executablePath: '/usr/bin/chromium-browser',
        args: ["--no-sandbox"]
    });
    // https://erothots.co/album/uhMQvAJh/ruiva-braba
    const page = await browser.newPage();

    await log('Accessing: ' + site.url);
    await page.goto(site.url);


    // await page.setViewport({ width: 1920, height: 1080 });
    await autoScroll(page);
    // // await page.screenshot({path: 'images/1.png'});
    //
    // // if (site.type.includes('attr')) {
    await log('Searching for elements: ' + site.selector);
    const metaAttribute = await page.$$eval(
        site.selector, (el, site) => el.map(x => x.getAttribute(site.type.attr)),
        site
    );
    await log('Elements founded: ' + metaAttribute.length);
    //
    await downloadFromElements(metaAttribute, site);


    // await page.screenshot({path: 'images/2.png'});


    await browser.close();
})();

async function sleep() {
    await log('Just sleeping for 100 ms');
    await new Promise(resolve => setTimeout(resolve, 100));
}

async function getFolderFilesNames(folder) {
    await log('Getting files from: ' + folder);
    let files = fs.readdirSync(folder);
    await log('Files founded in ' + folder + ': ' + files.length);
    return files;
}

async function downloadFromElements(metaAttribute, site) {
    let downloadedFilesCount = 0;
    let existsFilesCount = 0;
    let files = await getFolderFilesNames('./images/' + site.folder);

    const loading = new loadingBar(metaAttribute.length);

    for( let att of metaAttribute ) {
        let xxx = att.split("/");
        let name = xxx[xxx.length - 1];

        if (site.type.split) {
            name = name.replace(site.type.split, '');
        }

        if (!files.includes(name)) {
            await sleep();
            await log('Downloading file: ' + name);
            await downloadImage(att, '../../images/' + site.folder + '/' + name)
                .then((value) => {
                    downloadedFilesCount++;
                })
                .catch(console.error);
        } else {
            await log('File already exists: ' + name);
            existsFilesCount++;
        }

        await loading.showProgress(existsFilesCount + downloadedFilesCount);
    }

    await log('Already exists ' + existsFilesCount + ' of ' + metaAttribute.length);
    await log('Downloaded ' + downloadedFilesCount + ' of ' + metaAttribute.length);
}

async function createFolder(folder) {
    var dir = './images/' + folder;

    if (fs.existsSync(dir)){
        await log('Folder already exists: ' + dir);
        return;
    }

    await log('Creating folder: ' + dir);
    fs.mkdirSync(dir);
}

async function downloadImage(url, filepath) {
    return download.image({url, dest: filepath});
}

async function autoScroll(page){
    await log('AutoScrolling...');
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, scrollHeight);
                totalHeight += distance;

                if(totalHeight >= scrollHeight - window.innerHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function log(message) {
    console.log(message);
    logs.push(message);
}