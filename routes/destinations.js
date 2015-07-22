var express = require('express');
var router = express.Router();
var request = require('request');
var winston = require('winston');
var properties = require ("properties");
var async = require ("async");
var fs = require('fs');
var lineReader = require('line-reader');
var HashMap = require('HashMap');
var url = require('url');

var zip2destinations;



router.get('/recommend', function(req, res) {

    var url_parts = url.parse(req.url, true);
    var email = url_parts.query.email;


    var emailInput = req.body.email;
    var zip2destinationsFileName = 'routes/zip2destinations.txt'
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
                
                var listOfDestsStr = zip2destinations.get(email)
                var recommendedDestinationsArray = listOfDestsStr.split("|")
                
                jsonObj = {'email':email, 'destinations': recommendedDestinationsArray}

                res.send(jsonObj)
            }
        });
    }
    else {
        
        var listOfDestsStr = zip2destinations.get(email)
        var recommendedDestinationsArray = listOfDestsStr.split("|")
        
        jsonObj = {'email':email, 'destinations': recommendedDestinationsArray}

        res.send(jsonObj)

    }

});


router.get('/inspire', function(req, res) {

    var destination
    var thingsToDo

    async.series([
        function(callback){
            // do some stuff ...
            destination = getDestinations('abc')
            callback(null, destination);
        },
        function(callback){
            // do some more stuff ...
            var url_parts = url.parse(req.url, true);
            var destinationInput = url_parts.query.destination;
            destinationInput = 'Seattle'
            winston.info('Getting inspiration for destination ' + destinationInput)
            winston.info('About to call Foursquare api')

            // ===========================
            var FOURSQUARE_URI_PREFIX = 'https://api.foursquare.com/v2/venues/explore?near='
            var FOURSQUARE_URI_SUFFIX = '&oauth_token=K4CYK3B1Z4O0LXD0BYMX2S4YE0ZPACNYMGKWQCELDRE0KQVM&v=20150715'
            var FOURSQUARE_URI = FOURSQUARE_URI_PREFIX + destination + FOURSQUARE_URI_SUFFIX
            var topVenues = []
            var thingsToDo = []
            var venueIds = []

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
                    for(var i = 0; i < items.length && i < 5; i++) {
                        topVenues.push(items[i].venue.name)
                        venueInfo = {'name': items[i].venue.name, 'id': items[i].venue.id}
                        thingsToDo[i] = venueInfo
                    }

                    winston.info(thingsToDo)
                    callback(null, thingsToDo);

                  }
                }).end();
            // ===========================
            
        }
        // function(callback){
        //     // Get images.
            
        // }
    ],
    // optional callback
    function(err, results){
        // results is now equal to ['one', 'two']
        //winston.info('Async ' + results)
        res.send(results[1])
    });


});



function getDestinations(userinput) {
    var destination = 'Seattle'
    //callback(destination)
    return destination
}


module.exports = router;
