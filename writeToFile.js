'use strict';

var shortid = require('shortid'),
    fs = require('fs');

var pre = '<!doctype html><html><head><title>Lyssner Chatlog</title></head><style>body {color: #333; font-size: 16px; line-height: 1.5; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;} .statuslog {color: #555;margin: 0;padding: 0;font-weight: bold;font-size: 0.9em;} .youmsg, .strangermsg {margin: 0;padding: 0;} .msgsource {color: #369;} h1 { margin-top: 10px; margin-bottom: 20px;}</style><body><h1>Lyssner Chatlog</h1>';

module.exports = function (data, callback, error) {
    var url = shortid.generate();
    var post = '</body></html>';
    fs.writeFile("./logs/" + url + ".html", pre + data + post, function(err) {
        if(err) {
            error();
            return console.log(err);
        }
        callback(url);
    }); 
};