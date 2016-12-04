let cheerio = require('cheerio');
let request = require('request');
let async = require('async');
let uuid = require('node-uuid');
let fs = require('fs');

let wikipediaRandomUrl = "https://en.wikipedia.org/wiki/Special:Random";
let langsToScrape = [
    'es',
    'fr',
    'pt',
    'de',
    'it',
    // 'ko',
    // 'ja',
    'ru',
    'el',
    'nl',
    'hi',
    'cs'
];

let sentences = {};
let sentenceArray = [];
langsToScrape.forEach(function (lang) {
    sentences[lang] = [];
});

const NUMBER_OF_RANDOMS_TO_DO = 500;
let complete = 0;
async.times(NUMBER_OF_RANDOMS_TO_DO, function (index, timesCb) {
    request(wikipediaRandomUrl, function (timesErr, timesResponse, timesBody) {
        if (timesErr) {
            return timesCb(timesErr);
        }

        let times$ = cheerio.load(timesBody);
        async.each(times$('.interlanguage-link-target'), function (langTarget, eachCb) {
            let $langTarget = times$(langTarget);
            let lang = $langTarget.attr('lang');
            let link = $langTarget.attr('href');

            if (langsToScrape.indexOf(lang) === -1) {
                return eachCb();
            }

            request(link, function (linkErr, linkResponse, linkBody) {
                let link$ = cheerio.load(linkBody);

                async.each(link$('#mw-content-text p'), function (p, itCallback) {
                    let text = link$(p).text();
                    //if it empty, leave
                    if (!text || !text.length) {
                        return itCallback();
                    }

                    //if its a link, leave
                    if (text.indexOf('http') > -1) {
                        return itCallback();
                    }

                    //remoev citations
                    text = text.replace(/\[[0-9]*\]/g, '');

                    if (!(/(\.|\?)$/.test(text))) {

                        return itCallback();
                    }

                    let textArray = getArrayOfSentencesFromText(text);
                    sentences[lang] = sentences[lang].concat(textArray);

                    itCallback();
                }, function (err) {
                    eachCb(err);
                })
            }, function (err) {
                eachCb(err);
            });
        }, function (err) {
            timesCb(err);

            complete++;

            if (!(complete % 5)) {
                console.log("" + parseInt(100 * complete / NUMBER_OF_RANDOMS_TO_DO) + "% - " + complete + "/" + NUMBER_OF_RANDOMS_TO_DO);
            }
        });
    });
}, function (err) {
    if (err) {
        console.error(err);
    }

    let total = 0;
    langsToScrape.forEach(function (lang) {
        total += sentences[lang].length;
        console.log(lang, ': ', sentences[lang].length);

        sentences[lang].forEach(function (sentence) {
            let languageName;
            switch (lang) {
                case 'es':
                    languageName = 'spanish';
                    break;
                case 'fr':
                    languageName = 'french';
                    break;
                case 'pt':
                    languageName = 'portuguese';
                    break;
                case 'de':
                    languageName = 'german';
                    break;
                case 'it':
                    languageName = 'italian';
                    break;
                case 'ko':
                    languageName = 'korean';
                    break;
                case 'ja':
                    languageName = 'japanese';
                    break;
                case 'ru':
                    languageName = 'russian';
                    break;
                case 'el':
                    languageName = 'greek';
                    break;
                case 'nl':
                    languageName = 'dutch';
                    break;
                case 'hi':
                    languageName = 'hindi';
                    break;
                case 'cs':
                    languageName = 'czech';
                    break;
                default:
                    console.error('UNKNOWN');
                    break;
            }

            let sentenceObject = {
                id: languageName + "_" + uuid.v4(),
                text: sentence,
                isActive: true,
                likes: 0,
                dislikes: 0,
                flagged: false,
                language: languageName,
                addedDate: new Date(),
                lastModifiedDate: new Date()
            };

            sentenceArray.push(sentenceObject);
        });
    });

    console.log('sentenceArray', sentenceArray);

    let scrappedSentences = JSON.parse(fs.readFileSync('scrapped.json', 'utf8'));
    let scrappedPartialSentences = JSON.parse(fs.readFileSync('scrapped-partial.json', 'utf8'));

    scrappedSentences = scrappedSentences.concat(sentenceArray);
    scrappedPartialSentences = scrappedPartialSentences.concat(sentenceArray);

    fs.writeFile('scrapped.json', JSON.stringify(scrappedSentences), function (err) {
        if (err) {
            return console.error(err);
        }

        fs.writeFile('scrapped-partial.json', JSON.stringify(scrappedPartialSentences), function (err) {
            if (err) {
                return console.error(err);
            }

            console.log('It\'s saved!');
        });
    });
});

function getArrayOfSentencesFromText(text) {
    text = text.trim();

    //split on period
    let textArray = text.split('.').map(function (sentence) {
        if (sentence.length) {
            sentence += '.';
        }

        return sentence.trim();
    }).filter(function (notEmpty) {
        return notEmpty && notEmpty.length;
    });

    return textArray;
}
