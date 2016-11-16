var fs = require('fs');

fs.readFile('./translations.json', 'utf8', function (err, translations) {
    if (err) {
        return console.error(err);
    }

    var all = [];

    JSON.parse(translations).forEach((single) => {
        var x = {
            text: single.text,
            idUser: 1,
            isActive: 1,
            addedDate: new Date(),
            lastModifiedDate: new Date,
            language: single.language
        };

        if (single.originalId) {
            x.translationId = single.originalId
        }


        all.push(x);
    });

    fs.writeFile('seeder.json', JSON.stringify(all), (err) => {
        if (err) return console.error(err);
        console.log('It\'s saved!');
    });
});
