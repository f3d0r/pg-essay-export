//LOCAL IMPORTS
var puppeteer = require('puppeteer');
var cheerio = require('cheerio');
var pdfmerger = require('pdfmerger');
var path = require('path');
var fs = require('fs');
var del = require('del');
var pdfjsLib = require('pdfjs-dist');

//CONSTANTS
const baseURL = 'http://paulgraham.com/';
const essaySelector = 'body > table > tbody > tr > td:nth-child(3) > table:nth-child(5) > tbody';
const finalExportPath = 'All_PG_Essays.pdf';
const exportPath = path.join(__dirname, finalExportPath);

//MAIN SCRIPT
execute();

async function execute() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(baseURL + 'articles.html', {
        waitUntil: 'networkidle2'
    });
    var bodyHTML = await page.evaluate(() => document.body.innerHTML);
    await browser.close();
    const $ = cheerio.load(bodyHTML);
    var childNum = $(essaySelector).children().length;
    console.log("EXPORTING " + (childNum / 2) + " PAUL GRAHAM ESSAYS. :)");
    var pdfs = [];
    for (var i = 2; i <= childNum / 16; i += 2) {
        var essayURL = $(essaySelector + ' > tr:nth-child(' + i + ') > td > font > a').attr('href');
        if (essayURL.length >= 5 && essayURL.substring(essayURL.length - 5, essayURL.length) == ".html") {
            var currentPdfPath = await exportPDF(baseURL + essayURL, i);
            pdfs.push(currentPdfPath);
            console.log("DONE WITH ESSAY " + (i / 2) + " OUT OF " + (childNum / 32) + ".");
        }
    }

    var pdfStream = pdfmerger(pdfs);
    var writeStream = fs.createWriteStream(exportPath);
    pdfStream.pipe(writeStream);
    pdfmerger(pdfs, exportPath);
    pdfStream.on('close', function (code) {
        del(['exports/*.pdf']).then(paths => {
            pdfjsLib.getDocument(exportPath).then(function (doc) {
                var numPages = doc.numPages;
                console.log("COMPLETED! EXPORTED " + pdfs.length + " PAUL GRAHAM ESSAYS WITH " + numPages + " TOTAL PAGES.");
            });
        });
    });
}

async function exportPDF(url, index) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url, {
        waitUntil: 'networkidle2'
    });
    var currentPath = path.join(__dirname, 'exports/' + index + '.pdf');
    await page.pdf({
        path: currentPath,
        format: 'A4'
    });
    await browser.close();
    return currentPath;
}