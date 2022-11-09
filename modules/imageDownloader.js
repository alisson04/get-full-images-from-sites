import puppeteer from 'puppeteer';
import fs from "fs";
import loadingBar from "./loading-bar.js";
import download from "image-downloader";

class ImageDownloader {
    constructor(site) {
        this.logs = [];
        this.site = site;
    }

    async run() {
        this.browser = await puppeteer.launch({ ignoreDefaultArgs: ['--disable-extensions'], args: ["--no-sandbox"] });

        await this.accessUrl();
        let urlsToDownload = await this.getUrlsToDownload();

        if (urlsToDownload.length) {
            await this.createFolder();
            urlsToDownload = await this.urlReplaces(urlsToDownload);

            await this.downloadFromElements(urlsToDownload);
        }

        await this.browser.close();
    }

    async accessUrl() {
        await this.log('Accessing: ' + this.site.url);
        this.page = await this.browser.newPage();
        await this.page.goto(this.site.url);
        await this.page.setViewport({ width: 1920, height: 1080 });
    }

    async log(message) {
        console.log(message);
        this.logs.push(message);
    }

    async getUrlsToDownload() {
        await this.autoScroll();

        let urlsToDownload = await this.getAttributesFromPage();
        let elsClickable = [];

        if (this.site.el_click_selector) {
            elsClickable = await this.page.$$(this.site.el_click_selector);
        }

        if (elsClickable.length) {
            await this.page.waitForSelector(this.site.el_click_selector);
            await this.page.click(this.site.el_click_selector);

            const othersPagesUrls = await this.getUrlsToDownload();

            urlsToDownload = urlsToDownload.concat(othersPagesUrls);
        }

        return urlsToDownload;
    }

    async autoScroll() {
        await this.log('AutoScrolling...');
        await this.page.evaluate(async () => {
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

    async getAttributesFromPage() {
        await this.log('Searching for elements: ' + this.site.el_selector);

        const metaAttributes = await this.page.$$eval(
            this.site.el_selector, (el, site) => el.map(x => x.getAttribute(site.el_source_url.attr)),
            this.site
        );

        await this.log('Elements founded: ' + metaAttributes.length);
        return metaAttributes;
    }

    async createFolder() {
        var dir = './images/' + this.site.folder;

        if (fs.existsSync(dir)){
            await this.log('Folder already exists: ' + dir);
            return;
        }

        await this.log('Creating folder: ' + dir);
        fs.mkdirSync(dir);
    }

    async urlReplaces(urls) {
        let replaces = this.site.urls_replaces;

        if (urls.length && replaces !== undefined && replaces.length) {
            for(let replace of replaces) {
                urls = urls.map(url => url.replace(replace.search_for, replace.replace_for));
            }
        }

        return urls;
    }

    async downloadFromElements(metaAttributes) {
        let downloadedFilesCount = 0;
        let existsFilesCount = 0;
        let files = await this.getFolderFilesNames('./images/' + this.site.folder);

        const loading = new loadingBar(metaAttributes.length);

        for( let att of metaAttributes ) {
            let xxx = att.split("/");
            let name = xxx[xxx.length - 1];

            // if (site.type.split) {
            //     name = name.replace(site.type.split, '');
            // }

            if (!files.includes(name)) {
                await this.sleep();
                await this.log('Downloading file: ' + name);
                await this.downloadImage(att, '../../images/' + this.site.folder + '/' + name)
                    .then((value) => {
                        downloadedFilesCount++;
                    })
                    .catch(console.error);
            } else {
                await this.log('File already exists: ' + name);
                existsFilesCount++;
            }

            await loading.showProgress(existsFilesCount + downloadedFilesCount);
        }

        await this.log('Already exists ' + existsFilesCount + ' of ' + metaAttributes.length);
        await this.log('Downloaded ' + downloadedFilesCount + ' of ' + metaAttributes.length);
    }

    async sleep() {
        setTimeout(() => {}, 2000);
    }

    async downloadImage(url, filepath) {
        return download.image({url, dest: filepath});
    }

    async getFolderFilesNames(folder) {
        await this.log('Getting files from: ' + folder);
        let files = fs.readdirSync(folder);
        await this.log('Files founded in ' + folder + ': ' + files.length);
        return files;
    }
}

export default ImageDownloader;
