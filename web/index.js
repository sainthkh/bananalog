const fs = require('fs');
const http = require('http');
const url = require('url')

let layout = fs.readFileSync(`./layout.html`).toString()

http.createServer((req, res) => {
	switch(req.url) {
		case '/style.css':
			return serveStyle(res)
		case '/':
			return serveIndex(res)
		case '/favicon.ico':
			return serveFav(res)
		default:
			return servePosts(req.url, res)
	}
	
})
.listen(5000, function () {
	console.log('Server Running at http://127.0.0.1:5000');
})
.on('error', err => {
	console.log('here')
	console.log(err)
})

function serveStyle(res) {
	var style = fs.readFileSync(`./style.css`).toString()
	res.writeHead(200, {"Content-Type": "text/css; charset=utf-8"})
	res.write(style)
	return res.end()
}

function serveIndex(res) {

}

function serveFav(res) {
	return res.end()
}

function servePosts(url, res) {
	try {
		var post = fs.readFileSync(`./posts/${url}.html`).toString()
		res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
		res.write(layout.replace('{{{body}}}', parse(post)))
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