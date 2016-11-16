var fs = require('fs');
var querystring = require('querystring');
var https = require('https');
var async = require('async');

var defaultOptions = {
    host: 'www.googleapis.com',
    port: 443,
    path: '/language/translate/v2',
    method: 'GET',
    headers: {
        'Content-Type': 'application/json'
    }
};
var counter = 0;

//Parse single files
fs.readFile('./origin.json', 'utf8', (err, origins) => {
    if (err) {
        return console.error(err);
    }

    origins = origins && JSON.parse(origins) || [];

    // translate to spanish
    var langsToTranslateTo = [
        'spanish',
        'italian',
        'japanese',
        'korean',
        'russian',
        'portuguese',
        'french'
    ];
    var langCodeAPI = {
        spanish: 'es',
        english: 'en',
        irish: 'ga',
        italian: 'it',
        japanese: 'ja',
        kannada: 'kn',
        korean: 'ko',
        dutch: 'nl',
        russian: 'ru',
        portuguese: 'pt',
        french: 'fr',
        german: 'de',
        greek: 'el',
        creole: 'ht',
        vietnamese: 'vi'
    };
    var translations = {
        spanish: [],
        english: [],
        irish: [],
        italian: [],
        japanese: [],
        kannada: [],
        korean: [],
        dutch: [],
        russian: [],
        portuguese: [],
        french: [],
        german: [],
        greek: [],
        creole: [],
        vietnamese: []
    };

    async.eachSeries(origins,
        (origin, cb1)=> {
            async.eachSeries(langsToTranslateTo,
                (lang, cb2) => {

                        var option = JSON.parse(JSON.stringify(defaultOptions));
                        var optionQueryString = {
                            key: 'AIzaSyCVA7xsRHiyq3nb30injngfY00zpsy3t2M',
                            q: origin.text
                        };

                        optionQueryString.source = langCodeAPI[origin.language];
                        optionQueryString.target = langCodeAPI[lang];

                        option.path += ('?' + querystring.stringify(optionQueryString));
                        var req = https.request(option, (res) => {
                            var output = '';
                            res.setEncoding('utf8');

                            res.on('data', (chunk) => {
                                output += chunk;
                            });

                            res.on('end', () => {
                                var t= JSON.parse(output).data;
                                t = t && t.translations[0];
                                t = t && t.translatedText;
                                t && translations[lang].push({
                                    text: t,
                                    language: lang,
                                    originalId: origin.id,
                                    id: langCodeAPI[lang] + '_' + origin.id
                                });

                                cb2();
                            });
                        });

                        req.on('error', function (err) {
                            console.error('error: ', err);
                        });

                        req.end();

                },
                (err) => {
                    cb1(err);
                }
            );
        },
        (err)=> {
            if (err) {
                console.error(err);
            } else {
                console.log('writting file');

                var total = [];
                total = total.concat(origins);
                langsToTranslateTo.forEach((lang)=> {
                    total = total.concat(translations[lang])
                });

                fs.writeFile('translations.json', JSON.stringify(total), (err) => {
                    if (err) return console.error(err);
                    console.log('It\'s saved!');
                });
            }
        }
    );
});
