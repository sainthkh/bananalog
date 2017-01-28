const fs = require('fs');
const http = require('http');
const https = require('https')
const qs = require('querystring')

let config = JSON.parse(fs.readFileSync(`./config.json`).toString())

http.createServer((req, res) => {
	switch(req.url) {
		case '/subscribe':
			return subscribe(req, res)
		default:
			return servePosts(req.url, res)
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
			let { email, firstName } = qs.parse(body);
			addSubscriber(email, firstName)
			sendWelcomeMail(email, firstName)
		});
	}
	res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
	res.write(`<h1>Thank you for subscription. Welcome email has been sent to you.</h1>`)
	return res.end()
}

function addSubscriber(email, firstName) {
	let payload = qs.stringify({
		address: email,
		name: firstName,
	})

	let req = https.request({
		host: "api.mailgun.net",
		port: 443,
		path: `/v3/lists/all@${config.domain}/members`,
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

let emailContent = fs.readFileSync(`./themes/${config.theme}/email.html`).toString()

function sendWelcomeMail(email, firstName) {
	let payload = qs.stringify({
		from: config.from,
		to: email,
		subject: "Thank you for subscription",
		html: [
			`<div style="color:#222222;font-family:'Helvetica','Arial',sans-serif;font-size:14px;line-height:1.4;padding:25px;width:550px">`,
			emailContent.replace('${firstName}', firstName),
			`</div>`,
			`<div style="border-top-color:#ddd;border-top-style:solid;border-top-width:1px;color:#888;font-family:'Helvetica','Arial',sans-serif;font-size:12px;line-height:1.4;padding:25px;width:550px">`,
			`To make sure you keep getting these emails, please add admin@${config.domain} to your address book or whitelist us.<br>`,
			`Want out of the this email list? <a href="%mailing_list_unsubscribe_url%">Unsubscribe this list</a><br>`,		
			`Want to unsubscribe every email? <a href="%unsubscribe_url%">Click here</a><br>`,
			`Postal Address: ${config.postalAddress}`,
			`</div>`
		].join(``),
	})

	let req = https.request({
		host: "api.mailgun.net",
		port: 443,
		path: `/v3/${config.domain}/messages`,
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

function serveFav(res) {
	return res.end()
}

function servePosts(url, res) {
	try {
		var post = fs.readFileSync(`./posts/${url}.md`).toString()
		res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
		let html = layout.replace('{{{body}}}', `<div class="content">${parse(post)}</div>`)
		html = html.replace('{{{title}}}', `${post.match(/\$(.*)/)[1]} | ${config.title}`)
		res.write(html)
	}
	catch(e) {
		console.log(e)
		res.writeHead(404, {"Content-Type": "text/html; charset=utf-8"})
	}
	res.end()
}

function parse(text) {
	let lines = text.replace(/\r\n/, '\n').split('\n')

	let title = lines.shift()
	title = title.replace(/\$(.*)\n?/, '<div class="title">$1</div>') 
	let rules = [
		[/##(.*)/, '<h2>$1</h2>'],
		[/#(.*)/, '<h1>$1</h1>'],
		[/!\[(.*)\]\((.*)\)/, '<img alt="$1" src="$2" />'],
		[/^\s*$/, ''],
		[/(.*)/, '<p>$1</p>'],
	]
	text = lines.map((line) => {
		for(let i = 0; i < rules.length; i++) {
			if (line.match(rules[i][0])) {
				line = line.replace(rules[i][0], rules[i][1])
				break;
			}
		}
		line = line.replace(/\[(.*)\]\((.*)\)/, '<a href="$2">$1</a>')
		return line
	}).join('\n')

	return title + text
}