var express = require('express');
var router = express.Router();
var request = require('request');
var winston = require('winston');
var properties = require ("properties");
var async = require ("async");
var fs = require('fs');
var lineReader = require('line-reader');
var HashMap = require('HashMap');

var zip2destinations;



router.get('/recommend', function(req, res) {

    var zip2destinationsFileName = 'routes/zip2destinations.txt'
    var zip = '98004'
    var jsonObj = {}

    if (!zip2destinations) {
        zip2destinations = new HashMap();
        lineReader.eachLine(zip2destinationsFileName, function(line, last) {
            console.log(line);
            var strSplit = line.split("=")
            winston.info(strSplit)
            zip2destinations.set(strSplit[0], strSplit[1])
              // do whatever you want with line...
            if(last){
                // or check if it's the last one
                console.log('Done parsing file')
                
                var listOfDestsStr = zip2destinations.get(zip)
                var recommendedDestinationsArray = listOfDestsStr.split("|")
                
                jsonObj = {'zip':zip, 'destinations': recommendedDestinationsArray}

                res.send(jsonObj)
            }
        });
    }
    else {
        
        var listOfDestsStr = zip2destinations.get(zip)
        var recommendedDestinationsArray = listOfDestsStr.split("|")
        
        jsonObj = {'zip':zip, 'destinations': recommendedDestinationsArray}

        res.send(jsonObj)

    }

});


router.get('/api', function(req, res) {

    var destination
    var thingsToDo

    async.series([
        function(callback){
            // do some stuff ...
            destination = getDestinations('94111')
            callback(null, destination);
        },
        function(callback){
            // do some more stuff ...
            winston.info('Async destination ' + destination)
            winston.info('About to call Foursquare api')

            // ===========================
            var FOURSQUARE_URI_PREFIX = 'https://api.foursquare.com/v2/venues/explore?near='
            var FOURSQUARE_URI_SUFFIX = '&oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var FOURSQUARE_URI = FOURSQUARE_URI_PREFIX + destination + FOURSQUARE_URI_SUFFIX
            var topVenues = []

            // Call Foursquare API to get things to do
            request({
                    uri: FOURSQUARE_URI,
                    method: 'GET',
                }, function (error, response) {

                  if (error) {
                    winston.error('===== Error While Getting Data from Foursquare====');
                    callback(null);
                  } 
                  else {
                    var foursquare_response = JSON.parse(response.body);
                    winston.info('======= Got Results from Foursquare ======== ');

                    var items = foursquare_response.response.groups[0].items
                  

                    // Get top venues
                    for(var i = 0; i < items.length; i++) {
                        topVenues.push(items[i].venue.name)

                    }
                    winston.info(topVenues)
                    winston.info('Async things to do ' + thingsToDo)
                    callback(null, topVenues);

                  }
                }).end();
            // ===========================
            
        }
    ],
    // optional callback
    function(err, results){
        // results is now equal to ['one', 'two']
        winston.info('Async ' + results)
        res.send(results)
    });






    //var thingsToDo = getDestinations('94111', getThingsToDo)
    //winston.info('Things to do = ' + thingsToDo)

});


function sendResponse(res, data) {
    res.send(data)
}

function getDestinations(userinput) {
    var destination = 'Seattle'
    //callback(destination)
    return destination
}

function getInspiration(destination) {
    // Step 1: Call Foursquare API and get things to do and pictures

}

function getThingsToDo(destination) {
    winston.info('About to call Foursquare api')
    var FOURSQUARE_URI_PREFIX = 'https://api.foursquare.com/v2/venues/explore?near='
    var FOURSQUARE_URI_SUFFIX = '&oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
    var FOURSQUARE_URI = FOURSQUARE_URI_PREFIX + destination + FOURSQUARE_URI_SUFFIX
    var topVenues = []

    // Call Foursquare API to get things to do
    request({
            uri: FOURSQUARE_URI,
            method: 'GET',
        }, function (error, response) {

          if (error) {
            winston.error('===== Error While Getting Data from Foursquare====');
            callback(null);
          } 
          else {
            var foursquare_response = JSON.parse(response.body);
            winston.info('======= Got Results from Foursquare ======== ');

            var items = foursquare_response.response.groups[0].items
          

            // Get top venues
            for(var i = 0; i < items.length; i++) {
                topVenues.push(items[i].venue.name)

            }
            winston.info(topVenues)
            return topVenues
            //callback(topVenues)

            //res.send(topVenues);
          }
        }).end();

    //callback(topVenues)
    //return topVenues
}

module.exports = router;
