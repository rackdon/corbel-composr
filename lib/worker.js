'use strict';

var phraseLoader = require('./phraseLoader'),
    express = require('express'),
    router = express.Router(),
    amqp = require('amqplib');

var worker = function() {
    amqp.connect('amqp://localhost').then(function(conn) {

        function doWork(msg) {
            var body = msg.content.toString();
            console.log(body);
            var phrase = JSON.parse(body);
            phraseLoader(router, phrase);
        }

        return conn.createChannel().then(function(ch) {
            process.once('SIGINT', function() {
                conn.close();
                process.exit();
            });

            var ok = ch.assertQueue('composer', {
                durable: true
            });

            ok = ok.then(function() {
                ch.prefetch(1);
            });

            ok = ok.then(function() {
                ch.consume('composer', doWork, {
                    noAck: false
                });
                console.log('Worker up');
            });

            return ok;
        });
    }).then(null, console.warn);
};

worker();

module.exports = router;