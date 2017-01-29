const fs = require('fs');
const http = require('http');
const https = require('https')
const qs = require('querystring')

let config = JSON.parse(fs.readFileSync(`./config.json`).toString())

http.createServer((req, res) => {
	let url = require('url').parse(req.url, true)
	switch(url.pathname) {
		case '/subscribe':
			return subscribe(req, res)
		case '/unsubscribe':
			return unsubscribe(req, res, url.query)
		default:
			res.end()
	}
})
.listen(5000, function () {
	console.log('Server Running at http://127.0.0.1:5000');
})
.on('error', err => {
	console.log(err)
})

function subscribe(req, res) {
	if (req.method == 'POST') {
		var body = '';

		req.on('data', function (data) {
			body += data;

			// Too much POST data, kill the connection!
			// 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
			if (body.length > 1e6)
				request.connection.destroy();
		});

		req.on('end', function () {
			let { list, email, firstName } = qs.parse(body);
			
			addSubscriber(list, email, firstName)
			sendWelcomeMail(list, email, firstName)
		});
	}
	return res.end()
}

function addSubscriber(list, email, firstName) {
	let payload = qs.stringify({
		address: email,
		name: firstName,
		subscribed: "yes",
		upsert: "yes",
	})

	let req = https.request({
		host: "api.mailgun.net",
		port: 443,
		path: `/v3/lists/${list}/members`,
		auth: `api:${config.key}`,
		method: "POST",
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(payload),
		}
	}, (res) => {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		});
	})

	req.write(payload)
	req.end()
}

function sendWelcomeMail(list, email, firstName) {
	let emailContent = fs.readFileSync(`./email/${list}/welcome.html`).toString()
	
	let domain = list.split('@')[1]
	let payload = qs.stringify({
		from: config[domain].from,
		to: email,
		subject: "Thank you for subscription",
		html: [
			`<div style="color:#222222;font-family:'Helvetica','Arial',sans-serif;font-size:14px;line-height:1.4;padding:25px;width:550px">`,
			emailContent.replace('${firstName}', firstName),
			`</div>`,
			`<div style="border-top-color:#ddd;border-top-style:solid;border-top-width:1px;color:#888;font-family:'Helvetica','Arial',sans-serif;font-size:12px;line-height:1.4;padding:25px;width:550px">`,
			`To make sure you keep getting these emails, please add admin@${domain} to your address book or whitelist us.<br>`,
			`Want out of the this email list? <a href="http://${domain}/unsubscribe?${qs.stringify({list, email})}">Unsubscribe this list</a><br>`,		
			`Postal Address: ${config[domain].postalAddress}`,
			`</div>`
		].join(``),
	})

	let req = https.request({
		host: "api.mailgun.net",
		port: 443,
		path: `/v3/${domain}/messages`,
		auth: `api:${config.key}`,
		method: "POST",
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(payload),
		}
	}, (res) => {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		});
	})

	req.write(payload)
	req.end()
}

function unsubscribe(req, res, query) {
	unsubscribeUser(query.list, query.email)
	res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
	res.write(`Successfully unsubscribed from the list.`)
	res.end()
}

function unsubscribeUser(list, email) {
	let payload = qs.stringify({
		subscribed: "no",
	})

	let req = https.request({
		host: "api.mailgun.net",
		port: 443,
		path: `/v3/lists/${list}/members/${email}`,
		auth: `api:${config.key}`,
		method: "PUT",
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(payload),
		}
	}, (res) => {
		console.log('STATUS: ' + res.statusCode);
		console.log('HEADERS: ' + JSON.stringify(res.headers));
		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			console.log('BODY: ' + chunk);
		});
	})

	req.write(payload)
	req.end()
}