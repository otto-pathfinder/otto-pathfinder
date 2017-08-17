var numCPUs = require('os').cpus().length,
	config = require('./config.json'),
	express = require('express'),
	stylus = require('stylus'),
	nib = require('nib'),
	mongodb = require('mongodb').MongoClient,
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io')(server),
	mongo = {}

server.listen(config.port)
console.log('Listen on Port ' + config.port)

mongodb.connect(
	'mongodb://' +
		config.mongodb.user +
		':' +
		config.mongodb.pass +
		'@' +
		config.mongodb.host +
		'/' +
		config.mongodb.base,
	{
		replSet: {
			readPreference: 'primaryPreferred',
		},
	},
	function(err, db) {
		if (err) {
			console.log(err)
		} else {
			mongo = db
			console.log('MongoDB Connected')
		}
	},
)

function oeach(obj, callback) {
	var c = null,
		index = 0
	for (c in obj) {
		if (obj.hasOwnProperty(c)) {
			callback({
				key: c,
				value: obj[c],
				obj: obj,
				index: index,
			})
			index += 1
		}
	}
}

function compile(str, path) {
	return stylus(str)
		.set('filename', path)
		.set('compress', config.compress_css)
		.use(nib())
		.import('nib')
}

function render(req, res, params) {
	for (var p in params) {
		if (params.hasOwnProperty(p)) {
			if (params[p] === null) {
				return
			}
		}
	}
	res.render('index', {
		config: config,
		params: params,
	})
}

function values(obj) {
	var arr = [],
		c = null
	for (c in obj) {
		if (obj.hasOwnProperty(c)) {
			arr.push(obj[c])
		}
	}
	return arr
}

function keys(obj) {
	var arr = [],
		c = null
	for (c in obj) {
		if (obj.hasOwnProperty(c)) {
			arr.push(c)
		}
	}
	return arr
}

//io.use(cookieParserIo());

app.set('views', __dirname + '/views')
app.set('view engine', 'jade')
app.use(
	stylus.middleware({
		src: __dirname + '/public',
		compile: compile,
	}),
)
app.use(express.static(__dirname + '/public'))

app.get('/', function(req, res) {
	var params = {
		collections: null,
	}
	//console.log(req.cookies);
	try {
		mongo.listCollections().toArray(function(err, item) {
			if (err) {
				console.log(err)
				params.collections = false
			} else {
				item.sort(function(a, b) {
					return a.name.toLowerCase().localeCompare(b.name.toLowerCase())
				})
				params.collections = item
			}
			render(req, res, params)
		})
	} catch (err) {
		console.log(err)
		res.render('error', {
			params: params,
			err: err + '.\n' + 'Die Datenbank ist vermutlich nicht erreichbar.',
		})
	}
})

io.sockets.on('connection', function(socket) {
	var address = socket.handshake.address,
		connected = true,
		base = null,
		basedata = null,
		drill = {},
		important = {},
		hidden = {},
		last_ts = 0,
		cursor = null,
		count = 0,
		xpos = 0,
		status_waiting = false,
		status = function(data) {
			//if (status_waiting === false) {
			//process.nextTick(
			//function () {
			socket.emit('status', data)
			//status_waiting = false;
			//}
			//);
			//status_waiting = true;
			//}
		}

	console.log(new Date(), address, 'connected')

	function error_emit(error) {
		socket.emit('error_code', error)
	}

	function generate(data) {
		var connections = {}
		;(p = null), (c = null), (n = null), (cdrill = 'PC'), (ndrill = 'PC'), (ty = ['PC', 'N1', 'N2', 'N3']), (cname = ''), (nodes = {}), (links = {}), (nodeindex = 0), (list = cursor)

		var concount = 0,
			i = 0

		var map = function(d) {
			//status({ s: 1, i: i, c: count });
			i += 1

			for (var hi in hidden) {
				if (hidden.hasOwnProperty(hi)) {
					var s = hidden[hi].hide.split('.'),
						pos = 'p' + hidden[hi].pos,
						ret = true
					for (var r = 0, rmax = s.length; r < rmax; r += 1) {
						if (d.value[pos] && d.value[pos][ty[r]] !== s[r]) {
							ret = false
						}
					}
					if (ret) {
						return
					}
				}
			}

			for (var im in important) {
				if (important.hasOwnProperty(im)) {
					var s = important[im].split('.'),
						ret = false

					for (var r = 0, rmax = s.length; r < rmax; r += 1) {
						if (!d.value[im] || d.value[im][ty[r]] !== s[r]) {
							ret = true
						}
					}
					if (ret) {
						return
					}
				}
			}

			for (p = data.schritt_min; p < data.schritt_max; p += 1) {
				c = 'p' + p
				n = 'p' + (p + 1)

				cdrill = 'PC'
				cparentdrill = ''
				ndrill = 'PC'
				nparentdrill = ''

				clname = ''
				nlname = ''

				if (d.value[c] && d.value[c][cdrill] && d.value[n] && d.value[n][ndrill]) {
					clname = d.value[c][cdrill]
					nlname = d.value[n][ndrill]
					for (var dr in drill) {
						if (drill.hasOwnProperty(dr)) {
							if (p === drill[dr].pos) {
								for (var dr_i = 0, dr_max = drill[dr].drill.length; dr_i < dr_max; dr_i += 1) {
									if (d.value[c] && d.value[c][ty[dr_i]] === drill[dr].drill[dr_i]) {
										cdrill = ty[dr_i + 1]
										clname = drill[dr].drill.join('.') + '.' + d.value[c][cdrill]
									}
								}
							}
							if (p + 1 === drill[dr].pos) {
								for (var dr_i = 0, dr_max = drill[dr].drill.length; dr_i < dr_max; dr_i += 1) {
									if (d.value[n] && d.value[n][ty[dr_i]] === drill[dr].drill[dr_i]) {
										ndrill = ty[dr_i + 1]
										nlname = drill[dr].drill.join('.') + '.' + d.value[n][ndrill]
									}
								}
							}
						}
					}

					if (!nodes[p + ' - ' + d.value[c][cdrill]]) {
						nodes[p + ' - ' + d.value[c][cdrill]] = {
							count: 0,
							name: p + ' - ' + d.value[c][cdrill],
							drill: cdrill,
							pos: p,
							xPos: p - xpos,
							data: {
								label: clname,
								pos: p,
							},
							nodeindex: nodeindex,
						}
						nodeindex += 1
					}
					if (!nodes[p + 1 + ' - ' + d.value[n][ndrill]]) {
						nodes[p + 1 + ' - ' + d.value[n][ndrill]] = {
							count: 0,
							name: p + 1 + ' - ' + d.value[n][ndrill],
							drill: ndrill,
							pos: p + 1,
							xPos: p + 1 - xpos,
							data: {
								label: nlname,
								pos: p + 1,
							},
							nodeindex: nodeindex,
						}
						nodeindex += 1
					}

					cname = p + '|' + clname + '|' + (p + 1) + '|' + nlname
					if (!links[cname]) {
						links[cname] = {
							source: nodes[p + ' - ' + d.value[c][cdrill]].nodeindex,
							target: nodes[p + 1 + ' - ' + d.value[n][ndrill]].nodeindex,
							value: 0,
						}
					}

					nodes[p + ' - ' + d.value[c][cdrill]].count +=
						(data.sum === '*' ? d.value.count : d.value[data.sum]) || 1
					nodes[p + 1 + ' - ' + d.value[n][ndrill]].count +=
						(data.sum === '*' ? d.value.count : d.value[data.sum]) || 1
					links[cname].value += (data.sum === '*' ? d.value.count : d.value[data.sum]) || 1
				}
			}
		}

		status({ s: 1, i: i, c: count })
		oeach(list, map)

		socket.emit('generate', {
			nodes: values(nodes),
			links: values(links),
			drilldown: drill,
			important: important,
			hidden: hidden,
		})

		socket.emit('configdata', {
			hidden: hidden,
			important: important,
			drill: drill,
		})
	}

	socket.on('generate_sankey', function(data) {
		status({ s: 0, c: base })

		var connections = {}
		;(p = null), (c = null), (n = null), (cdrill = 'PC'), (ndrill = 'PC'), (cname = ''), (cur = null), (nodes = []), (links = []), (stats = null), (find = {}), (project = {})

		xpos = data.schritt_min
		count = 0
		find.metadata = { $exists: false }
		find.date = {
			$gte: new Date(data.zeitraum_min),
			$lte: new Date(data.zeitraum_max),
		}

		oeach(data, function(o) {
			var n = ''
			if (o.key.substring(0, 7) === 'filter_') {
				if (o.value !== 'ignore_filter') {
					// LIST
					n = 'list_'
					if (o.key.substring(7, 7 + n.length) === n) {
						find[o.key.substring(7 + n.length)] = o.value
					}
				}
				if (o.value.length !== 0) {
					// MULTILIST
					n = 'multilist_'
					if (o.key.substring(7, 7 + n.length) === n) {
						find[o.key.substring(7 + n.length)] = {
							$in: o.value,
						}
					}
				}
				if (o.value.length !== 0) {
					// RANGE
					n = 'range_'
					if (o.key.substring(7, 7 + n.length) === n) {
						if (find['$and'] === undefined) {
							find['$and'] = []
						}
						if (o.value[0] !== '') {
							find['$and'].push({})
							var l = find['$and'].length - 1

							find['$and'][l][o.key.substring(7 + n.length)] = {
								$gte: +o.value[0],
							}
						}
						if (o.value[1] !== '') {
							find['$and'].push({})
							var l = find['$and'].length - 1

							find['$and'][l][o.key.substring(7 + n.length)] = {
								$lte: +o.value[1],
							}
						}
					}
				}
			}
		})
		if (find['$and'] !== undefined) {
			while (find['$and'].length < 2) {
				find['$and'].push({})
			}
		}

		project = {
			date: 1,
			count: 1,
		}
		if (data.sum !== '*') {
			project[data.sum] = 1
		}

		for (var sci = data.schritt_min, scimax = data.schritt_max; sci <= scimax; sci += 1) {
			project['p' + sci] = '$p' + sci
		}
		cur = mongo.collection(base).find(find, project)

		cur.count(function(err, ccount) {
			if (err) {
				console.log(err)
				error_emit(err)
			} else {
				count = ccount
			}
		})

		cur.toArray(function(err, list) {
			if (err) {
				console.log(err)
				error_emit(err)
			} else {
				cursor = list

				generate(data)
			}
		})
	})

	socket.on('change', function(data) {
		switch (data.type) {
			case 'drilldown':
				drill['p' + data.target + '.' + data.name] = {
					pos: data.target,
					drill: data.name.split('.'),
				}
				break
			case 'drillup':
				var arr = data.name.split('.')

				arr.pop()

				delete drill['p' + data.target + '.' + arr.join('.')]
				break
			case 'important':
				important['p' + data.target] = data.name
				break
			case 'important_remove':
				delete important[data.target]
				break
			case 'filter_remove':
				delete hidden['p' + data.target + '.' + data.name.hide]
				break
			case 'filter':
				hidden['p' + data.target + '.' + data.name] = {
					pos: data.target,
					hide: data.name,
				}
				break
			case 'drill+important':
				drill['p' + data.drill.target + '.' + data.drill.name] = {
					pos: data.drill.target,
					drill: data.drill.name.split('.'),
				}

				important['p' + data.important.target] = data.important.name
				break
		}

		generate(data)
	})

	socket.on('set_config', function(data) {
		hidden = data.hidden
		drill = data.drill
		important = data.important
	})

	socket.on('help_content', function(data) {
		mongo
			.collection(data.content)
			.find({ metadata: { $exists: true } })
			.toArray(function(err, list) {
				if (list.length > 0) {
					data.base = list
					socket.emit('help_content', data)
				} else {
					data.base = undefined
					socket.emit('help_content', data)
				}
			})
	})

	socket.on('help', function(data) {
		var params = {
			collections: [],
		}

		mongo.listCollections().toArray(function(err, item) {
			if (err) {
				console.log(err)
				params.collections = false
			} else {
				item.sort(function(a, b) {
					return a.name.localeCompare(b.name)
				})
				params.collections = item
			}
			app.render(
				data.content.replace(/[^A-Za-z0-9]/g, '_'),
				{
					config: config,
					params: params,
				},
				function(err, html) {
					socket.emit('help', html)
				},
			)
		})
	})

	socket.on('load_base_param', function(data) {
		base = data.base
		drill = {}
		important = {}
		hidden = {}
		mongo.collection(data.base).find({ metadata: { $exists: true } }).toArray(function(err, list) {
			if (list.length > 0) {
				result = [
					{
						min_date: list[0].metadata.date.min,
						max_date: list[0].metadata.date.max,
						value: 999999999,
					},
				]
				for (var i = -10; i <= 10; i += 1) {
					result[0]['p' + i] = 0
				}
				for (var i = list[0].metadata.steps.min; i <= list[0].metadata.steps.max; i += 1) {
					result[0]['p' + i] = 1
				}
				delete list[0]['_id']
				socket.emit('base_param', list[0])
			} else {
				var meta = {
					metadata: {
						date: {
							min: 0,
							max: 0,
							start: 0,
							end: 0,
						},
						steps: {
							min: -10,
							max: 10,
							start: -10,
							end: 10,
						},
						meta: {
							owner: '???',
							description: '???',
							created: new Date(),
						},
						sum: {
							'*': 'Anzahl',
						},
						filter: [],
					},
				}
				mongo
					.collection(data.base)
					.aggregate([
						{
							$group: {
								_id: '',
								max_date: { $max: '$date' },
								min_date: { $min: '$date' },
							},
						},
					])
					.limit(1)
					.toArray(function(err, result) {
						if (err) {
							console.log(err)
							error_emit(err)
						} else {
							if (result.length > 0) {
								meta.metadata.date.start = meta.metadata.date.min = result[0].min_date
								meta.metadata.date.end = meta.metadata.date.max = result[0].max_date

								var rec = function(index, w) {
									var q = {}
									q.metadata = { $exists: false }
									q['p' + index] = { $exists: true, $ne: null }
									mongo.collection(data.base).find(q).limit(1).toArray(function(err, list) {
										var l = list.length
										if (w < 0 && l > 0) {
											meta.metadata.steps.start = meta.metadata.steps.min = index
										}
										if (w > 0 && l > 0) {
											meta.metadata.steps.end = meta.metadata.steps.max = index
										}
										if ((l === 0 || index === -10) && w < 0) {
											rec(1, 1)
										} else if ((l === 0 || index === 10) && w > 0) {
											socket.emit('base_param', meta)
										} else {
											rec(index + w, w)
										}
									})
								}
								rec(0, -1)
							}
						}
					})
			}
		})
	})
})