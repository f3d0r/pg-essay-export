var request = require('request');
var pdf = require('html-pdf');
var fs = require('fs');
var cheerio = require('cheerio');
var pLimit = require('p-limit');
var pdfmerger = require('pdfmerger');
var del = require('del');

const pdfOptions = {
    format: 'Letter'
};
const limit = pLimit(20);
const baseURL = 'http://paulgraham.com/'
execute();

async function execute() {
    var mainPage = await getURL(baseURL + 'articles.html');
    const $ = cheerio.load(mainPage);
    var childNum = $('body > table > tbody > tr > td:nth-child(3) > table:nth-child(5) > tbody').children().length;
    var reqs = [];
    var essayNames = []
    for (var i = 2; i <= childNum; i += 2) {
        var essayURL = $('body > table > tbody > tr > td:nth-child(3) > table:nth-child(5) > tbody > tr:nth-child(' + i + ') > td > font > a').attr('href');
        var essayName = $('body > table > tbody > tr > td:nth-child(3) > table:nth-child(5) > tbody > tr:nth-child(' + i + ') > td > font > a').text();
        if (essayURL.length >= 5 && essayURL.substring(essayURL.length - 5, essayURL.length) == ".html") {
            reqs.push(limit(() => getURL(baseURL + essayURL)));
            essayNames.push(essayName
                .toLowerCase()
                .split(' ').join('_')
                .split('/').join('_'));
        }
    }
    var essays = await Promise.all(reqs);
    console.log("ESSAYS: " + essays.length);

    var essayConversionReqs = [];
    for (var i = 0; i < essays.length; i++) {
        essayConversionReqs.push(limit(() => new Promise(function (resolve, reject) {
            pdf.create(essays[i], pdfOptions).toFile('./exports/' + essayNames[i] + '.pdf', function (err, res) {
                if (err) {
                    console.log("HERE!");
                    reject(err);
                } else {
                    resolve(res);
                }
            });
        })));
    }
    resultPaths = [];
    for (var i = 0; i < essayConversionReqs.length; i++) {
        try {
            var path = await essayConversionReqs[i];
            resultPaths.push(path);
        } catch (e) {
            console.log("HERE!")
        }
    }
    var pdfStream = pdfmerger(resultPaths);
    var writeStream = fs.createWriteStream('all_essays.pdf');
    pdfStream.pipe(writeStream);
    pdfmerger(resultPaths, 'all_essays.pdf');
    pdfStream.on('close', function (code) {
        del(['exports/*.pdf']).then(paths => {
            console.log('Completed!');
        });
    });
}

function getURL(url) {
    var options = {
        method: 'GET',
        url: url,
    };
    return new Promise(function (resolve, reject) {
        request(options, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        });
    });
}