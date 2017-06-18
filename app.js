var fs = require('fs');
var https = require('https');
var scheduler = require('node-schedule');
var schedule = {};

function saveScheduleFromSheets(callback) {
    var sheets = {
        key: 'AIzaSyBFigFGRlBEAwOshi2jKsP5Ooh4R0YIk4U',
        spreadsheetId: '1LmEvCZ-9we9_5Vz_U4n8k3ZtsB4zV4z9xF0HQw3VEQA'
    }
    var req = https.get('https://sheets.googleapis.com/v4/spreadsheets/' + sheets.spreadsheetId + '/values/A:B?key=' + sheets.key, (res) => {
        var data = "";
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
            for(var row of JSON.parse(data).values) {
                schedule[row[0]] = row[1];
            }
            callback();
        });
    });
    req.setTimeout(5000);
}

function setSchedule() {
    for(date in schedule) {
        scheduler.scheduleJob(date, date + " +0900", function() {
            postToDiscord(schedule[this]);
        }.bind(date));
    }
}

function clearSchedule() {
    for(date in schedule) {
        scheduler.scheduledJobs[date].cancel();
    }
}

function postToDiscord(message) {
    var content = JSON.stringify({ "content" : message });
    var options = {
        hostname: 'discordapp.com',
        // path: '/api/webhooks/301279234473721856/J3btZlE7vAM1Vr1NZ62IT_vwdZM25w8gaGcbb4D7hI86VveoBZ77uPQYgw4H-pBqeIxY',
        path: '/api/webhooks/301361663448186882/NdGh4V-uuDAuN2jCJytLEYvuX8Bf3sIxSEcp-rGnaxpBRm7vrv4lb9-qgLDoyUkyMdLG',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': content.length
        }
    };
    var post = https.request(options, function(res) {
        if(res.statusCode != 204) {
            console.log(new Date(), "ERROR", res.statusCode, res.statusMessage, content);
        }
    });
    post.write(content);
    post.end();
}

require('http').createServer(function(req, res) {
    if(req.url == "/" && req.method == "GET") {
        res.writeHead(200, { "Content-Type" : "text/plain" });
        res.end("OK");
    } else if(req.url == "/sync" && req.method == "GET") {
        clearSchedule();
        saveScheduleFromSheets(setSchedule);
        res.writeHead(200, { "Content-Type" : "text/plain" });
        res.end("Synced.");
    } else if(req.url == "/schedule" && req.method == "GET") {
        res.writeHead(200, { "Content-Type" : "text/plain" });
        res.end(JSON.stringify(schedule, null, "\t"));
    } else if(req.url == "/send" && req.method == "GET") {
    	fs.readFile('send.html', (err, data) => {
    		if(err) throw err;
    		res.writeHead(200, { "Content-Type" : "text/html" });
        	res.end(data);
    	})
    } else if(req.url == "/sendMessage" && req.method == "POST") {
    	var body = '';
        req.on('data', function(data) {
            body += data;
        });
        req.on('end', function() {
            postToDiscord(body.toString());
	        res.writeHead(200, { "Content-Type" : "text/plain" });
	        res.end("Sent.");
        });
    } else {
        res.writeHead(404, { "Content-Type" : "text/plain" });
        res.end("404");
    }
}).listen(process.env.PORT || 8001);

saveScheduleFromSheets(setSchedule);