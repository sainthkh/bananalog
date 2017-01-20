const fs = require('fs');
const http = require('http');

let config = JSON.parse(fs.readFileSync(`./config.json`).toString())
let layout = fs.readFileSync(`./themes/${config.theme}/layout.html`).toString()

http.createServer((req, res) => {
	switch(req.url) {
		case '/style.css':
			return serveStyle(res)
		case '/':
			return serveIndex(res)
		case '/favicon.ico':
			return serveFav(res)
		case '/sync':
			return sync(res)
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

function serveStyle(res) {
	var style = fs.readFileSync(`./themes/${config.theme}/style.css`).toString()
	res.writeHead(200, {"Content-Type": "text/css; charset=utf-8"})
	res.write(style)
	return res.end()
}

function serveIndex(res) {
	let postPaths = fs.readFileSync('./list').toString().replace(/\r\n/g, '\n').split('\n').slice(0, 10)	
	let postsHtml = postPaths.map(path => {
		let text = fs.readFileSync(`./posts/${path}.md`).toString().slice(0, 100)
		let title = text.substr(0, text.indexOf('\n'))
		title = title.replace(/^\$\s*/, '')
		let content = parse(text.substr(text.indexOf('\n')+1))
		return [`<div class="post">`,
			`<div><h1><a href="/${path}">${title}</a></h1></div>`,
			`<div>${content}</div>`,
			`</div>`].join('')
	}).join('\n')
	res.write(layout.replace('{{{title}}}', config.title).replace('{{{body}}}', postsHtml))
	return res.end()
}

function sync(res) {
	let posts = fs.readFileSync('./list').toString().split('\n')
	let dir = fs.readdirSync('./posts')
	let newPosts = []
	for(let i = 0; i < dir.length; i++) {
		let fileName = dir[i].substr(0, dir[i].indexOf('.'))
		if(posts.indexOf(fileName) == -1) {
			newPosts.push(fileName)
		}
	}
	if(newPosts.length > 0) {
		fs.writeFileSync('./list', newPosts.join('\n') + '\n' + posts.join('\n'))
	}
	res.writeHead(200, {"Content-Type": "text/html; charset=utf-8"})
	res.write('Sync done.')
	return res.end()
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